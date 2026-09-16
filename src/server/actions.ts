"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AttendanceActionState } from "@/lib/action-states";
import type { StudentImportActionState } from "@/lib/action-states";
import type { AttendanceStatus } from "@/lib/types";
import type { AttendanceUpdateItem } from "@/lib/types";
import {
  activateStudent,
  createStudent,
  deactivateAllActiveStudents,
  deactivateStudent,
  findStudentDuplicate,
  getStudentById,
  saveDailyAttendance,
  updateAttendanceById,
  updateAttendanceStatus,
  updateStudent,
} from "@/server/attendance-service";
import { importStudentsFromRows } from "@/server/student-import-service";

export type StudentActionState = {
  ok: boolean;
  message: string;
};

export type AttendanceEditActionState = {
  ok: boolean;
  message: string;
};

const studentSchema = z.object({
  studentNumber: z.string().trim().min(1, "請輸入座號").max(10, "座號太長"),
  name: z.string().trim().min(1, "請輸入姓名").max(50, "姓名太長"),
  studentId: z.string().trim().max(50).optional().or(z.literal("")),
});

const attendanceSchema = z.object({
  studentId: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum([
    "PRESENT",
    "LEAVE_PERSONAL",
    "LEAVE_SICK",
    "LEAVE_OFFICIAL",
    "LEAVE_BEREAVEMENT",
    "ABSENT",
    "LATE",
    "EARLY_LEAVE",
  ]),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

const attendanceUpdateSchema = z.object({
  studentId: z.string().trim().min(1),
  status: z.enum([
    "PRESENT",
    "LEAVE_PERSONAL",
    "LEAVE_SICK",
    "LEAVE_OFFICIAL",
    "LEAVE_BEREAVEMENT",
    "ABSENT",
    "LATE",
    "EARLY_LEAVE",
  ]),
  note: z.string().nullable(),
});

const attendanceBatchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updates: z.array(attendanceUpdateSchema),
});

const studentImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  studentNumber: z.string(),
  name: z.string(),
  studentId: z.string().nullable(),
});

const studentImportBatchSchema = z.object({
  rows: z.array(studentImportRowSchema).min(1, "沒有可匯入的資料"),
});

function normalizeStudentId(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "資料驗證失敗";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "操作失敗，請稍後再試";
}

export async function createStudentAction(
  _prevState: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  try {
    const parsed = studentSchema.parse({
      studentNumber: formData.get("studentNumber"),
      name: formData.get("name"),
      studentId: formData.get("studentId"),
    });

    const normalizedStudentId = normalizeStudentId(parsed.studentId);
    const duplicate = await findStudentDuplicate({
      studentNumber: parsed.studentNumber,
      studentId: normalizedStudentId,
    });

    if (duplicate) {
      return { ok: false, message: "已存在相同座號或學生 ID 的學生" };
    }

    await createStudent({
      studentNumber: parsed.studentNumber,
      name: parsed.name,
      studentId: normalizedStudentId,
    });

    revalidatePath("/");
    revalidatePath("/students");

    return { ok: true, message: "已成功新增學生" };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function updateStudentAction(
  studentId: string,
  _prevState: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  try {
    const parsed = studentSchema.parse({
      studentNumber: formData.get("studentNumber"),
      name: formData.get("name"),
      studentId: formData.get("studentId"),
    });

    const existing = await getStudentById(studentId);
    if (!existing) {
      return { ok: false, message: "找不到要編輯的學生" };
    }

    const normalizedStudentId = normalizeStudentId(parsed.studentId);
    const duplicate = await findStudentDuplicate({
      studentNumber: parsed.studentNumber,
      studentId: normalizedStudentId,
      excludeId: studentId,
    });

    if (duplicate) {
      return { ok: false, message: "已存在相同座號或學生 ID 的學生" };
    }

    await updateStudent(studentId, {
      studentNumber: parsed.studentNumber,
      name: parsed.name,
      studentId: normalizedStudentId,
    });

    revalidatePath("/");
    revalidatePath("/students");

    return { ok: true, message: "已成功更新學生資料" };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function setStudentActiveAction(
  studentId: string,
  active: boolean,
  _prevState: StudentActionState
): Promise<StudentActionState> {
  void _prevState;

  try {
    if (active) {
      await activateStudent(studentId);
    } else {
      await deactivateStudent(studentId);
    }

    revalidatePath("/");
    revalidatePath("/students");

    return {
      ok: true,
      message: active ? "已成功恢復學生" : "已成功移除學生",
    };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function deactivateAllStudentsAction(
  _prevState: StudentActionState
): Promise<StudentActionState> {
  void _prevState;

  try {
    const result = await deactivateAllActiveStudents();

    revalidatePath("/");
    revalidatePath("/students");
    revalidatePath("/attendance");
    revalidatePath("/history");

    return {
      ok: true,
      message:
        result.count > 0
          ? `已封存 ${result.count} 位學生`
          : "目前沒有可封存的學生",
    };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function upsertAttendanceAction(formData: FormData) {
  const parsed = attendanceSchema.parse({
    studentId: formData.get("studentId"),
    date: formData.get("date"),
    status: formData.get("status"),
    note: formData.get("note"),
  });

  await updateAttendanceStatus(
    parsed.studentId,
    parsed.date,
    parsed.status as AttendanceStatus,
    parsed.note || null
  );

  revalidatePath("/");
  revalidatePath("/attendance");
  revalidatePath("/history");
}

export async function saveTodayAttendanceAction(
  date: string,
  _prevState: AttendanceActionState,
  formData: FormData
): Promise<AttendanceActionState> {
  void _prevState;

  try {
    const parsed = attendanceBatchSchema.parse({
      date,
      updates: JSON.parse(String(formData.get("payload") ?? "[]")),
    });

    const updates: AttendanceUpdateItem[] = parsed.updates.map((item) => ({
      studentId: item.studentId,
      status: item.status,
      note: item.note?.trim() ? item.note.trim() : null,
    }));

    await saveDailyAttendance(parsed.date, updates);

    revalidatePath("/");
    revalidatePath("/attendance");
    revalidatePath("/history");

    return { ok: true, message: "已儲存今日出缺勤" };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function updateHistoryAttendanceAction(
  attendanceId: string,
  _prevState: AttendanceEditActionState,
  formData: FormData
): Promise<AttendanceEditActionState> {
  try {
    const parsed = attendanceSchema.parse({
      studentId: formData.get("studentId"),
      date: formData.get("date"),
      status: formData.get("status"),
      note: formData.get("note"),
    });

    if (attendanceId) {
      await updateAttendanceById(
        attendanceId,
        parsed.studentId,
        parsed.status as AttendanceStatus,
        parsed.note || null
      );
    } else {
      await updateAttendanceStatus(
        parsed.studentId,
        parsed.date,
        parsed.status as AttendanceStatus,
        parsed.note || null
      );
    }

    revalidatePath("/");
    revalidatePath("/history");
    revalidatePath("/stats");

    return { ok: true, message: "已更新歷史紀錄" };
  } catch (error) {
    return { ok: false, message: getErrorMessage(error) };
  }
}

export async function importStudentsAction(
  _prevState: StudentImportActionState,
  formData: FormData
): Promise<StudentImportActionState> {
  try {
    const parsed = studentImportBatchSchema.parse({
      rows: JSON.parse(String(formData.get("payload") ?? "[]")),
    });

    const result = await importStudentsFromRows(parsed.rows);
    const { preview, createdCount } = result;

    const skippedCount = preview.existingCount + preview.existingInactiveCount + preview.conflictCount + preview.errorCount;
    const summaryMessage =
      createdCount > 0
        ? `成功匯入 ${createdCount} 位學生`
        : "沒有可匯入的新學生";

    revalidatePath("/");
    revalidatePath("/students");
    revalidatePath("/attendance");

    return {
      ok: true,
      message:
        skippedCount > 0
          ? `${summaryMessage}，另有 ${skippedCount} 筆資料未匯入`
          : summaryMessage,
      createdCount,
      existingCount: preview.existingCount,
      existingInactiveCount: preview.existingInactiveCount,
      conflictCount: preview.conflictCount,
      errorCount: preview.errorCount,
      details: preview.rows
        .filter((row) => row.status !== "can_add")
        .map((row) => `第 ${row.rowNumber} 列：${row.messages.join("、")}`),
    };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
      createdCount: 0,
      existingCount: 0,
      existingInactiveCount: 0,
      conflictCount: 0,
      errorCount: 0,
      details: [],
    };
  }
}
