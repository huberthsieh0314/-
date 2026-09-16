import "server-only";

import { prisma } from "@/server/db";
import type { AttendanceStatus } from "@/lib/types";

export type HistoryQueryInput = {
  from: string;
  to: string;
  studentId?: string | null;
  status?: AttendanceStatus | "ALL" | null;
  page: number;
  pageSize: number;
};

export type HistoryRecordItem = {
  id: string;
  date: string;
  studentId: string;
  studentNumber: string;
  name: string;
  status: AttendanceStatus;
  note: string | null;
  hasRecord: boolean;
};

export type HistoryQueryResult = {
  items: HistoryRecordItem[];
  total: number;
  page: number;
  pageSize: number;
};

function toDateStart(dateInput: string) {
  return new Date(`${dateInput}T00:00:00.000Z`);
}

function enumerateDates(from: string, to: string) {
  const start = toDateStart(from);
  const end = toDateStart(to);
  const dates: string[] = [];

  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + 86400000)) {
    dates.push(cursor.toISOString().slice(0, 10));
  }

  return dates;
}

function toDateEnd(dateInput: string) {
  return new Date(`${dateInput}T23:59:59.999Z`);
}

export async function queryHistory(input: HistoryQueryInput): Promise<HistoryQueryResult> {
  const page = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
  const pageSize =
    Number.isFinite(input.pageSize) && input.pageSize > 0
      ? Math.min(100, Math.floor(input.pageSize))
      : 25;
  const dates = enumerateDates(input.from, input.to).reverse();
  const students = await prisma.student.findMany({
    where: input.studentId ? { id: input.studentId } : undefined,
    orderBy: [{ studentNumber: "asc" }, { name: "asc" }],
  });
  const attendance = await prisma.attendance.findMany({
    where: {
      date: { gte: toDateStart(input.from), lte: toDateEnd(input.to) },
      ...(input.studentId ? { studentId: input.studentId } : {}),
    },
  });
  const attendanceMap = new Map(
    attendance.map((row) => [`${row.studentId}:${row.date.toISOString().slice(0, 10)}`, row])
  );
  const effectiveRows: HistoryRecordItem[] = [];

  for (const date of dates) {
    for (const student of students) {
      const row = attendanceMap.get(`${student.id}:${date}`);
      const status = (row?.status ?? "PRESENT") as AttendanceStatus;
      if (input.status && input.status !== "ALL" && status !== input.status) continue;
      effectiveRows.push({
        id: row?.id ?? "",
        date,
        studentId: student.id,
        studentNumber: student.studentNumber,
        name: student.name,
        status,
        note: row?.note ?? null,
        hasRecord: Boolean(row),
      });
    }
  }

  const total = effectiveRows.length;
  const skip = (page - 1) * pageSize;
  const rows = effectiveRows.slice(skip, skip + pageSize);

  return {
    total,
    page,
    pageSize,
    items: rows.map((row) => ({
      id: row.id,
      date: row.date,
      studentId: row.studentId,
      studentNumber: row.studentNumber,
      name: row.name,
      status: row.status,
      note: row.note,
      hasRecord: row.hasRecord,
    })),
  };
}
