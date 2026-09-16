"use client";

import {
  type FormEvent,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import type { StudentActionState } from "@/server/actions";
import {
  createStudentAction,
  deactivateAllStudentsAction,
  setStudentActiveAction,
  updateStudentAction,
} from "@/server/actions";
import type { StudentListItem } from "@/lib/types";
import { StudentImportPanel } from "@/components/students/student-import-panel";

type StudentFilter = "all" | "active" | "inactive";

type StudentDirectoryClientProps = {
  students: StudentListItem[];
};

const defaultActionState: StudentActionState = {
  ok: false,
  message: "",
};

function statusBadge(active: boolean) {
  return active ? <Badge tone="success">啟用</Badge> : <Badge tone="warning">停用</Badge>;
}

function studentDisplayId(studentId: string | null) {
  return studentId && studentId.trim().length > 0 ? studentId : "—";
}

function StudentFormDialog({
  mode,
  open,
  student,
  onClose,
  onFeedback,
}: {
  mode: "create" | "edit";
  open: boolean;
  student?: StudentListItem | null;
  onClose: () => void;
  onFeedback: (message: string, ok: boolean) => void;
}) {
  const router = useRouter();
  const action =
    mode === "create"
      ? createStudentAction
      : updateStudentAction.bind(null, student?.id ?? "");
  const [state, formAction, pending] = useActionState(action, defaultActionState);
  const [studentNumber, setStudentNumber] = useState(student?.studentNumber ?? "");
  const [name, setName] = useState(student?.name ?? "");
  const [studentId, setStudentId] = useState(student?.studentId ?? "");
  const lastHandledMessageRef = useRef<string>("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setStudentNumber(student?.studentNumber ?? "");
    setName(student?.name ?? "");
    setStudentId(student?.studentId ?? "");
  }, [open, student]);

  useEffect(() => {
    if (!state.message) {
      return;
    }

    if (lastHandledMessageRef.current === state.message) {
      return;
    }

    lastHandledMessageRef.current = state.message;

    onFeedback(state.message, state.ok);

    if (state.ok) {
      onClose();
      router.refresh();
    }
  }, [state.message, state.ok, onClose, onFeedback, router]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-ink-900/10 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-ink-600 uppercase">
              {mode === "create" ? "新增學生" : "編輯學生"}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-ink-950">
              {mode === "create" ? "建立學生資料" : "修改學生資料"}
            </h3>
          </div>
          <button
            type="button"
            className="rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-900/5"
            onClick={onClose}
          >
            關閉
          </button>
        </div>

        <form action={formAction} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink-800">座號</span>
              <input
                name="studentNumber"
                value={studentNumber}
                onChange={(event) => setStudentNumber(event.target.value)}
                required
                maxLength={10}
                className="w-full rounded-2xl border border-ink-900/15 bg-white px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                placeholder="01"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink-800">姓名</span>
              <input
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={50}
                className="w-full rounded-2xl border border-ink-900/15 bg-white px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                placeholder="王小明"
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-ink-800">學生 ID</span>
            <input
              name="studentId"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              maxLength={50}
              className="w-full rounded-2xl border border-ink-900/15 bg-white px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              placeholder="S2026001"
            />
          </label>

          {state.message ? (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                state.ok
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {state.message}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" className="min-w-24" onClick={onClose}>
              取消
            </Button>
            <Button variant="primary" className="min-w-24" type="submit">
              {pending ? "儲存中..." : "儲存"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActiveToggleForm({
  student,
  targetActive,
  onFeedback,
}: {
  student: StudentListItem;
  targetActive: boolean;
  onFeedback: (message: string, ok: boolean) => void;
}) {
  const router = useRouter();
  const action = setStudentActiveAction.bind(null, student.id, targetActive);
  const [state, formAction, pending] = useActionState(action, defaultActionState);

  useEffect(() => {
    if (!state.message) {
      return;
    }

    onFeedback(state.message, state.ok);

    if (state.ok) {
      router.refresh();
    }
  }, [state, onFeedback, router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (targetActive) {
      return;
    }

    const confirmed = window.confirm(`確定要移除 ${student.studentNumber} ${student.name} 嗎？`);
    if (!confirmed) {
      event.preventDefault();
    }
  };

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <Button variant={targetActive ? "secondary" : "ghost"} type="submit">
        {pending ? "處理中..." : targetActive ? "恢復" : "移除"}
      </Button>
    </form>
  );
}

function ArchiveAllStudentsForm({
  activeCount,
  onFeedback,
  onArchive,
}: {
  activeCount: number;
  onFeedback: (message: string, ok: boolean) => void;
  onArchive: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    deactivateAllStudentsAction,
    defaultActionState
  );

  useEffect(() => {
    if (!state.message) {
      return;
    }

    onFeedback(state.message, state.ok);

    if (state.ok) {
      onArchive();
      router.refresh();
    }
  }, [onArchive, onFeedback, router, state]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (activeCount === 0) {
      event.preventDefault();
      return;
    }

    const confirmed = window.confirm(
      "這會把目前所有啟用中的學生封存並從預設名單中移除，但不會刪除歷史資料。確定要繼續嗎？"
    );

    if (!confirmed) {
      event.preventDefault();
    }
  };

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <Button
        variant="secondary"
        type="submit"
        className="border-rose-200 text-rose-700 hover:bg-rose-50"
        disabled={activeCount === 0 || pending}
      >
        {pending ? "封存中..." : "封存目前名單"}
      </Button>
    </form>
  );
}

export function StudentDirectoryClient({ students }: StudentDirectoryClientProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [showInactiveStudents, setShowInactiveStudents] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createVersion, setCreateVersion] = useState(0);
  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(null);
  const [editVersion, setEditVersion] = useState(0);
  const [feedback, setFeedback] = useState<StudentActionState | null>(null);

  const handleFeedback = useCallback((message: string, ok: boolean) => {
    setFeedback({ message, ok });
  }, []);

  const handleOpenCreate = useCallback(() => {
    setCreateVersion((version) => version + 1);
    setCreateOpen(true);
  }, []);

  const handleOpenEdit = useCallback((student: StudentListItem) => {
    setEditVersion((version) => version + 1);
    setEditingStudent(student);
  }, []);

  const handleArchiveAll = useCallback(() => {
    setShowInactiveStudents(false);
    setFilter("active");
  }, []);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return students.filter((student) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && student.active) ||
        (filter === "inactive" && !student.active);

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = [
        student.studentNumber,
        student.name,
        student.studentId ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [filter, query, students]);

  const activeCount = students.filter((student) => student.active).length;
  const inactiveCount = students.length - activeCount;

  const activeStudents = filteredStudents.filter((student) => student.active);
  const inactiveStudents = filteredStudents.filter((student) => !student.active);

  return (
    <div className="space-y-6">
      {feedback ? (
        <div
          className={`rounded-3xl border px-4 py-3 text-sm ${
            feedback.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <SectionHeader
            title="學生列表"
            description="可搜尋姓名、座號與學生 ID，並能快速新增、編輯、停用與恢復。"
            action={
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={handleOpenCreate}>
                  新增學生
                </Button>
                <ArchiveAllStudentsForm
                  activeCount={activeCount}
                  onFeedback={handleFeedback}
                  onArchive={handleArchiveAll}
                />
              </div>
            }
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-ink-900/10 bg-paper-50 p-4">
              <p className="text-sm font-medium text-ink-600">目前學生</p>
              <p className="mt-2 text-2xl font-semibold text-ink-950">{activeCount}</p>
            </div>
            <div className="rounded-2xl border border-ink-900/10 bg-paper-50 p-4">
              <p className="text-sm font-medium text-ink-600">已封存學生</p>
              <p className="mt-2 text-2xl font-semibold text-ink-950">{inactiveCount}</p>
            </div>
            <div className="rounded-2xl border border-ink-900/10 bg-paper-50 p-4">
              <p className="text-sm font-medium text-ink-600">總筆數</p>
              <p className="mt-2 text-2xl font-semibold text-ink-950">{students.length}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-2xl border border-ink-900/15 bg-white px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200 lg:max-w-md"
              placeholder="搜尋座號、姓名或學生 ID"
            />
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "全部" },
                { key: "active", label: "啟用" },
                { key: "inactive", label: "已封存" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setFilter(item.key as StudentFilter);
                    if (item.key === "inactive") {
                      setShowInactiveStudents(true);
                    }
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    filter === item.key
                      ? "border-ink-950 bg-ink-950 text-paper-50"
                      : "border-ink-900/10 bg-white text-ink-800 hover:bg-amber-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <StudentSection
              title="目前學生"
              students={activeStudents}
              onEdit={handleOpenEdit}
              onFeedback={handleFeedback}
            />
            {showInactiveStudents ? (
              <StudentSection
                title="已封存學生"
                students={inactiveStudents}
                onEdit={handleOpenEdit}
                onFeedback={handleFeedback}
                onCollapse={() => setShowInactiveStudents(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowInactiveStudents(true)}
                className="w-full rounded-3xl border border-dashed border-ink-900/15 bg-white px-4 py-6 text-left text-sm leading-6 text-ink-700 transition hover:bg-amber-50"
              >
                <span className="block font-medium text-ink-950">
                  顯示已封存學生（{inactiveStudents.length}）
                </span>
                <span className="mt-1 block">
                  換班後通常會先把這些學生收起來，需要恢復時再展開查看。
                </span>
              </button>
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="使用說明"
            description="這個區塊保留給 Excel 匯入與未來批次操作。"
          />
          <div className="mt-5 space-y-4 text-sm leading-6 text-ink-700">
            <p>• 新增與編輯都會真正寫入 PostgreSQL。</p>
            <p>• 停用不會刪除 Student record，也不會影響 Attendance 歷史。</p>
            <p>• 封存後學生會從預設名單消失，但仍可在已封存列表中恢復。</p>
            <p>• 恢復後學生會重新出現在目前學生列表。</p>
            <p>• 重複座號或學生 ID 會被阻擋。</p>
          </div>
          <StudentImportPanel students={students} onFeedback={handleFeedback} />
        </Card>
      </div>

      <StudentFormDialog
        key={`create-${createVersion}`}
        mode="create"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onFeedback={handleFeedback}
      />

      <StudentFormDialog
        key={`edit-${editVersion}-${editingStudent?.id ?? "none"}`}
        mode="edit"
        open={Boolean(editingStudent)}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
        onFeedback={handleFeedback}
      />
    </div>
  );
}

function StudentSection({
  title,
  students,
  onEdit,
  onFeedback,
  onCollapse,
}: {
  title: string;
  students: StudentListItem[];
  onEdit: (student: StudentListItem) => void;
  onFeedback: (message: string, ok: boolean) => void;
  onCollapse?: () => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-ink-950">{title}</h3>
          <Badge>{students.length}</Badge>
        </div>
        {onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            className="rounded-full border border-ink-900/10 px-3 py-1 text-xs font-medium text-ink-700 hover:bg-ink-900/5"
          >
            收起
          </button>
        ) : null}
      </div>

      {students.length > 0 ? (
        <div className="space-y-3">
          {students.map((student) => (
            <div
              key={student.id}
              className={`rounded-3xl border p-4 ${
                student.active
                  ? "border-emerald-200 bg-emerald-50/40"
                  : "border-ink-900/10 bg-paper-50"
              }`}
            >
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="grid gap-2 sm:grid-cols-[80px_1fr_1fr_auto] sm:items-center">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.2em] text-ink-600 uppercase">
                      座號
                    </p>
                    <p className="mt-1 text-base font-semibold text-ink-950">{student.studentNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.2em] text-ink-600 uppercase">
                      姓名
                    </p>
                    <p className="mt-1 text-base font-semibold text-ink-950">{student.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.2em] text-ink-600 uppercase">
                      學生 ID
                    </p>
                    <p className="mt-1 text-sm text-ink-700">{studentDisplayId(student.studentId)}</p>
                  </div>
                  <div>{statusBadge(student.active)}</div>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button variant="secondary" onClick={() => onEdit(student)}>
                    編輯
                  </Button>
                  <ActiveToggleForm
                    student={student}
                    targetActive={!student.active}
                    onFeedback={onFeedback}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-ink-900/15 bg-white px-4 py-8 text-sm leading-6 text-ink-700">
          目前沒有符合條件的學生。
        </div>
      )}
    </section>
  );
}
