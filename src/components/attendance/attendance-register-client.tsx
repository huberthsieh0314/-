"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { attendanceDefaultState } from "@/lib/action-states";
import { attendanceStatusKinds, toChineseStatus } from "@/lib/status";
import { saveTodayAttendanceAction } from "@/server/actions";
import type { AttendancePageRow, AttendanceUpdateItem } from "@/lib/types";

type AttendanceRegisterClientProps = {
  date: string;
  displayDate: string;
  rows: AttendancePageRow[];
};

type DraftRow = AttendancePageRow & {
  currentStatus: AttendancePageRow["status"];
  currentNote: string;
};

function isDirty(row: DraftRow) {
  const initialNote = row.note?.trim() ?? "";
  const currentNote = row.currentNote.trim();

  return row.status !== row.currentStatus || initialNote !== currentNote;
}

function buildPayload(rows: DraftRow[]) {
  const updates: AttendanceUpdateItem[] = rows
    .filter(isDirty)
    .map((row) => ({
      studentId: row.studentId,
      status: row.currentStatus,
      note: row.currentNote.trim() ? row.currentNote.trim() : null,
    }));

  return JSON.stringify(updates);
}

function compareStatus(row: DraftRow, nextStatus: AttendancePageRow["status"]) {
  return row.currentStatus === nextStatus;
}

export function AttendanceRegisterClient({
  date,
  displayDate,
  rows,
}: AttendanceRegisterClientProps) {
  const router = useRouter();
  const [draftRows, setDraftRows] = useState<DraftRow[]>(
    rows.map((row) => ({
      ...row,
      currentStatus: row.status,
      currentNote: row.note ?? "",
    }))
  );
  const [query, setQuery] = useState("");
  const lastDateRef = useRef(date);

  const saveAction = saveTodayAttendanceAction.bind(null, date);
  const [saveState, formAction, pendingSave] = useActionState(saveAction, attendanceDefaultState);

  useEffect(() => {
    if (lastDateRef.current === date) {
      return;
    }

    lastDateRef.current = date;
    setDraftRows(
      rows.map((row) => ({
        ...row,
        currentStatus: row.status,
        currentNote: row.note ?? "",
      }))
    );
    setQuery("");
  }, [date, rows]);

  useEffect(() => {
    if (!saveState.ok) {
      return;
    }

    // The server action persisted the current draft. Make it the new
    // comparison baseline so the saved page no longer appears dirty.
    setDraftRows((current) =>
      current.map((row) => ({
        ...row,
        status: row.currentStatus,
        note: row.currentNote.trim() ? row.currentNote.trim() : null,
      }))
    );
  }, [saveState]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return draftRows;
    }

    return draftRows.filter((row) => {
      const searchable = `${row.studentNumber} ${row.name} ${toChineseStatus(row.currentStatus)} ${row.currentNote}`
        .toLowerCase();

      return searchable.includes(normalized);
    });
  }, [draftRows, query]);

  const dirtyRows = useMemo(() => draftRows.filter(isDirty), [draftRows]);

  const currentStats = useMemo(() => {
    return draftRows.reduce(
      (acc, row) => {
        acc.total += 1;
        acc[row.currentStatus] += 1;
        if (row.currentStatus !== "PRESENT") {
          acc.attention += 1;
        }
        return acc;
      },
      {
        total: 0,
        PRESENT: 0,
        LEAVE_PERSONAL: 0,
        LEAVE_SICK: 0,
        LEAVE_OFFICIAL: 0,
        LEAVE_BEREAVEMENT: 0,
        ABSENT: 0,
        LATE: 0,
        EARLY_LEAVE: 0,
        attention: 0,
      }
    );
  }, [draftRows]);

  const handleStatusChange = useCallback(
    (studentId: string, status: AttendancePageRow["status"]) => {
      setDraftRows((current) =>
        current.map((row) =>
          row.studentId === studentId
            ? {
                ...row,
                currentStatus: status,
              }
            : row
        )
      );
    },
    []
  );

  const handleNoteChange = useCallback((studentId: string, note: string) => {
    setDraftRows((current) =>
      current.map((row) =>
        row.studentId === studentId
          ? {
              ...row,
              currentNote: note,
            }
          : row
      )
    );
  }, []);

  const handleSetAllPresent = useCallback(() => {
    setDraftRows((current) =>
      current.map((row) => ({
        ...row,
        currentStatus: "PRESENT",
      }))
    );
  }, []);

  const handleDateChange = useCallback(
    (nextDate: string) => {
      if (!nextDate || nextDate === date) {
        return;
      }

      if (dirtyRows.length > 0) {
        const confirmed = window.confirm("你有尚未儲存的修改，切換日期會離開目前編輯內容，確定要繼續嗎？");
        if (!confirmed) {
          return;
        }
      }

      router.push(`/attendance?date=${nextDate}`);
    },
    [date, dirtyRows.length, router]
  );

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRows.length === 0) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirtyRows.length]);

  const payload = useMemo(() => buildPayload(draftRows), [draftRows]);

  return (
    <div className="space-y-6">
      {saveState.message ? (
        <div
          className={`rounded-3xl border px-4 py-3 text-sm ${
            saveState.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {saveState.message}
        </div>
      ) : null}

      <Card>
        <SectionHeader
          title={`今日出缺勤 · ${displayDate}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={dirtyRows.length > 0 ? "warning" : "success"}>
                {dirtyRows.length > 0 ? `尚有 ${dirtyRows.length} 筆未儲存` : "目前沒有未儲存變更"}
              </Badge>
              <Button variant="secondary" onClick={handleSetAllPresent} disabled={draftRows.length === 0}>
                全部設為出席
              </Button>
            </div>
          }
        />

        <form action={formAction} className="mt-5 space-y-4">
          <input type="hidden" name="payload" value={payload} />

          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
            <label className="space-y-2">
              <span className="text-sm font-medium text-ink-800">日期</span>
              <input
                type="date"
                value={date}
                onChange={(event) => handleDateChange(event.target.value)}
                className="w-full rounded-2xl border border-ink-900/15 bg-white px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              />
            </label>

            <label className="space-y-2 lg:min-w-[280px]">
              <span className="text-sm font-medium text-ink-800">快速搜尋</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜尋座號、姓名或狀態"
                className="w-full rounded-2xl border border-ink-900/15 bg-white px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button variant="primary" type="submit" disabled={pendingSave || dirtyRows.length === 0}>
                {pendingSave ? "儲存中..." : "儲存今日紀錄"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="全班人數" value={currentStats.total} />
            <SummaryCard label="出席" value={currentStats.PRESENT} tone="success" />
            <SummaryCard label="請假" value={currentStats.LEAVE_PERSONAL + currentStats.LEAVE_SICK + currentStats.LEAVE_OFFICIAL + currentStats.LEAVE_BEREAVEMENT} tone="warning" />
            <SummaryCard label="遲到 / 曠課" value={`${currentStats.LATE} / ${currentStats.ABSENT}`} tone="info" />
          </div>

          <div className="rounded-3xl border border-ink-900/10 bg-paper-50 px-4 py-3 text-sm leading-6 text-ink-700">
            {dirtyRows.length > 0
              ? "你已經有尚未儲存的修改，離開前請先儲存。"
              : "目前沒有未儲存修改。"}
          </div>

          <div className="space-y-3">
            {draftRows.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-ink-900/15 bg-white px-4 py-8 text-sm leading-6 text-ink-700">
                目前沒有啟用中的學生可供登記。
              </div>
            ) : filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <AttendanceStudentRow
                  key={row.studentId}
                  row={row}
                  onStatusChange={handleStatusChange}
                  onNoteChange={handleNoteChange}
                />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-ink-900/15 bg-white px-4 py-8 text-sm leading-6 text-ink-700">
                目前沒有符合搜尋條件的學生。
              </div>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  return (
    <div className="rounded-2xl border border-ink-900/10 bg-white p-4">
      <p className="text-sm font-medium text-ink-600">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          tone === "success"
            ? "text-emerald-700"
            : tone === "warning"
              ? "text-amber-800"
              : tone === "info"
                ? "text-sky-700"
                : "text-ink-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function AttendanceStudentRow({
  row,
  onStatusChange,
  onNoteChange,
}: {
  row: DraftRow;
  onStatusChange: (studentId: string, status: AttendancePageRow["status"]) => void;
  onNoteChange: (studentId: string, note: string) => void;
}) {
  return (
      <section
        className={`rounded-3xl border p-4 transition ${
          row.currentStatus === "PRESENT" && !row.currentNote.trim()
            ? "border-ink-900/10 bg-white"
            : "border-amber-200 bg-amber-50/40"
      }`}
    >
      <div className="grid gap-4 xl:grid-cols-[220px_1fr] xl:items-start">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{row.studentNumber}</Badge>
            <Badge tone="success">{row.name}</Badge>
          </div>
          <div className="text-sm leading-6 text-ink-700">
            <span className="font-medium text-ink-800">目前：</span>
            {toChineseStatus(row.currentStatus)}
            {row.currentNote.trim() ? ` · ${row.currentNote.trim()}` : ""}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {attendanceStatusKinds.map((item) => {
              const active = compareStatus(row, item.key);
              return (
                <Button
                  key={item.key}
                  variant={active ? "primary" : "secondary"}
                  type="button"
                  className="min-w-[74px]"
                  onClick={() => onStatusChange(row.studentId, item.key)}
                >
                  {item.label}
                </Button>
              );
            })}
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink-800">備註</span>
            <input
              value={row.currentNote}
              onChange={(event) => onNoteChange(row.studentId, event.target.value)}
              placeholder="可留空"
              className="w-full rounded-2xl border border-ink-900/15 bg-white px-4 py-3 text-sm text-ink-950 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
