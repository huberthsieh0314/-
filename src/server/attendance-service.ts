import "server-only";

import { prisma } from "@/server/db";
import type { AttendancePageRow, AttendanceStatus, AttendanceUpdateItem } from "@/lib/types";
import { formatTaipeiDate } from "@/lib/date";
import { attendanceStatusOrder, isAbsentStatus, isLeaveStatus } from "@/lib/status";

export async function getStudents(includeInactive = false) {
  return prisma.student.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: [{ studentNumber: "asc" }, { name: "asc" }],
  });
}

export async function listStudents() {
  return prisma.student.findMany({
    orderBy: [
      { active: "desc" },
      { studentNumber: "asc" },
      { name: "asc" },
    ],
  });
}

export async function getStudentById(id: string) {
  return prisma.student.findUnique({
    where: { id },
  });
}

export async function findStudentDuplicate({
  studentNumber,
  studentId,
  excludeId,
}: {
  studentNumber: string;
  studentId?: string | null;
  excludeId?: string;
}) {
  const duplicate = await prisma.student.findFirst({
    where: {
      AND: [
        excludeId ? { id: { not: excludeId } } : {},
        {
          OR: [
            { studentNumber },
            ...(studentId ? [{ studentId }] : []),
          ],
        },
      ],
    },
  });

  return duplicate;
}

export async function getStudentCount() {
  return prisma.student.count({ where: { active: true } });
}

export async function getDailyAttendance(dateInput: string): Promise<AttendancePageRow[]> {
  const date = new Date(`${dateInput}T00:00:00.000Z`);

  const [students, attendance] = await Promise.all([
    getStudents(false),
    prisma.attendance.findMany({
      where: { date },
    }),
  ]);

  const attendanceMap = new Map(attendance.map((row) => [row.studentId, row]));

  return students.map((student) => {
    const row = attendanceMap.get(student.id);

    return {
      studentId: student.id,
      studentNumber: student.studentNumber,
      name: student.name,
      active: student.active,
      hasRecord: Boolean(row),
      status: row?.status ?? "PRESENT",
      note: row?.note ?? null,
    };
  });
}

export async function upsertAttendance({
  studentId,
  dateInput,
  status,
  note,
}: {
  studentId: string;
  dateInput: string;
  status: AttendanceStatus;
  note?: string | null;
}) {
  const date = new Date(`${dateInput}T00:00:00.000Z`);

  return prisma.attendance.upsert({
    where: {
      studentId_date: {
        studentId,
        date,
      },
    },
    create: {
      studentId,
      date,
      status,
      note: note?.trim() ? note.trim() : null,
    },
    update: {
      status,
      note: note?.trim() ? note.trim() : null,
    },
  });
}

export async function createStudent({
  studentNumber,
  name,
  studentId,
}: {
  studentNumber: string;
  name: string;
  studentId?: string | null;
}) {
  const normalizedStudentId = studentId?.trim() ? studentId.trim() : null;
  const duplicate = await findStudentDuplicate({
    studentNumber,
    studentId: normalizedStudentId,
  });

  if (duplicate) {
    throw new Error("已存在相同座號或學生 ID 的學生資料");
  }

  return prisma.student.create({
    data: {
      studentNumber,
      name,
      studentId: normalizedStudentId,
    },
  });
}

export async function updateStudent(
  id: string,
  data: {
    studentNumber?: string;
    name?: string;
    studentId?: string | null;
    active?: boolean;
  }
) {
  const existing = await getStudentById(id);

  if (!existing) {
    throw new Error("找不到要更新的學生");
  }

  const nextStudentNumber = data.studentNumber ?? existing.studentNumber;
  const nextStudentId =
    data.studentId !== undefined
      ? data.studentId?.trim() ? data.studentId.trim() : null
      : existing.studentId;
  const duplicate = await findStudentDuplicate({
    studentNumber: nextStudentNumber,
    studentId: nextStudentId,
    excludeId: id,
  });

  if (duplicate) {
    throw new Error("已存在相同座號或學生 ID 的學生資料");
  }

  return prisma.student.update({
    where: { id },
    data: {
      ...(data.studentNumber ? { studentNumber: data.studentNumber } : {}),
      ...(data.name ? { name: data.name } : {}),
      ...(data.studentId !== undefined
        ? { studentId: data.studentId?.trim() ? data.studentId.trim() : null }
        : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  });
}

export async function deactivateStudent(id: string) {
  return prisma.student.update({
    where: { id },
    data: { active: false },
  });
}

export async function activateStudent(id: string) {
  return prisma.student.update({
    where: { id },
    data: { active: true },
  });
}

export async function deactivateAllActiveStudents() {
  return prisma.student.updateMany({
    where: { active: true },
    data: { active: false },
  });
}

export async function getDashboardData(dateInput = formatTaipeiDate()) {
  const dailyAttendance = await getDailyAttendance(dateInput);

  const totalStudents = dailyAttendance.length;
  const presentStudents = dailyAttendance.filter((row) => row.status === "PRESENT").length;
  const leaveStudents = dailyAttendance.filter((row) => isLeaveStatus(row.status)).length;
  const lateStudents = dailyAttendance.filter((row) => row.status === "LATE").length;
  const absentStudents = dailyAttendance.filter((row) => isAbsentStatus(row.status)).length;

  return {
    date: dateInput,
    totalStudents,
    presentStudents,
    leaveStudents,
    lateStudents,
    absentStudents,
    attentionStudents: dailyAttendance
      .filter((row) => row.status !== "PRESENT")
      .map((row) => ({
        number: row.studentNumber,
        name: row.name,
        status: row.status,
        note: row.note,
      })),
  };
}

export async function getStatsSummary(startDateInput: string, endDateInput: string) {
  const start = new Date(`${startDateInput}T00:00:00.000Z`);
  const end = new Date(`${endDateInput}T23:59:59.999Z`);

  const attendance = await prisma.attendance.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
  });

  const counts = attendance.reduce(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    {
      PRESENT: 0,
      LEAVE_PERSONAL: 0,
      LEAVE_SICK: 0,
      LEAVE_OFFICIAL: 0,
      LEAVE_BEREAVEMENT: 0,
      ABSENT: 0,
      LATE: 0,
      EARLY_LEAVE: 0,
    } satisfies Record<AttendanceStatus, number>
  );

  return counts;
}

export async function getAttendanceByStudentId(studentId: string) {
  return prisma.attendance.findMany({
    where: { studentId },
    orderBy: { date: "desc" },
  });
}

export async function ensureAttendanceForDate(dateInput: string) {
  const date = new Date(`${dateInput}T00:00:00.000Z`);
  const students = await getStudents(false);

  await Promise.all(
    students.map((student) =>
      prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: student.id,
            date,
          },
        },
        create: {
          studentId: student.id,
          date,
          status: "PRESENT",
        },
        update: {},
      })
    )
  );
}

export async function createEmptyAttendanceForStudent(studentId: string, dateInput: string) {
  const date = new Date(`${dateInput}T00:00:00.000Z`);

  return prisma.attendance.upsert({
    where: {
      studentId_date: {
        studentId,
        date,
      },
    },
    create: {
      studentId,
      date,
      status: "PRESENT",
    },
    update: {},
  });
}

export async function saveDailyAttendance(
  dateInput: string,
  updates: AttendanceUpdateItem[]
) {
  const date = new Date(`${dateInput}T00:00:00.000Z`);

  if (updates.length === 0) {
    return { updated: 0 };
  }

  await prisma.$transaction(
    updates.map((item) =>
      prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: item.studentId,
            date,
          },
        },
        create: {
          studentId: item.studentId,
          date,
          status: item.status,
          note: item.note?.trim() ? item.note.trim() : null,
        },
        update: {
          status: item.status,
          note: item.note?.trim() ? item.note.trim() : null,
        },
      })
    )
  );

  return { updated: updates.length };
}

export function normalizeAttendanceStatus(status: string): AttendanceStatus {
  if (attendanceStatusOrder.includes(status as AttendanceStatus)) {
    return status as AttendanceStatus;
  }

  throw new Error(`Unsupported attendance status: ${status}`);
}

export async function upsertAttendanceFromForm(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  const dateInput = String(formData.get("date") ?? formatTaipeiDate());
  const status = normalizeAttendanceStatus(String(formData.get("status") ?? "PRESENT"));
  const note = formData.get("note")?.toString() ?? null;

  if (!studentId) {
    throw new Error("studentId is required");
  }

  return upsertAttendance({ studentId, dateInput, status, note });
}

export async function updateAttendanceStatus(
  studentId: string,
  dateInput: string,
  status: AttendanceStatus,
  note?: string | null
) {
  return upsertAttendance({ studentId, dateInput, status, note });
}

export async function updateAttendanceById(
  attendanceId: string,
  studentId: string,
  status: AttendanceStatus,
  note?: string | null
) {
  const existing = await prisma.attendance.findUnique({ where: { id: attendanceId } });
  if (!existing || existing.studentId !== studentId) {
    throw new Error("找不到要修改的歷史紀錄");
  }

  return prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      status,
      note: note?.trim() ? note.trim() : null,
    },
  });
}

export function deriveDashboardCounts(rows: AttendancePageRow[]) {
  const totalStudents = rows.length;
  const presentStudents = rows.filter((row) => row.status === "PRESENT").length;
  const leaveStudents = rows.filter((row) => isLeaveStatus(row.status)).length;
  const lateStudents = rows.filter((row) => row.status === "LATE").length;
  const absentStudents = rows.filter((row) => isAbsentStatus(row.status)).length;

  return {
    totalStudents,
    presentStudents,
    leaveStudents,
    lateStudents,
    absentStudents,
  };
}

export async function getAttendancePageData(dateInput = formatTaipeiDate()) {
  const rows = await getDailyAttendance(dateInput);
  const dashboard = deriveDashboardCounts(rows);

  return {
    date: dateInput,
    rows,
    ...dashboard,
  };
}

export type { AttendancePageRow };
