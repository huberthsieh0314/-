import "server-only";

import { prisma } from "@/server/db";
import type { AttendanceStatus } from "@/lib/types";
import { attendanceStatusOrder, isLeaveStatus, isAbsentStatus } from "@/lib/status";
import { listStudents } from "@/server/attendance-service";

export type StatsRangeInput = {
  from: string;
  to: string;
};

export type ClassSummary = Record<AttendanceStatus, number> & {
  rangeDays: number;
  activeStudents: number;
  totalSlots: number;
  leaveTotal: number;
  absentTotal: number;
};

export type StudentSummaryRow = {
  studentId: string;
  studentNumber: string;
  name: string;
  counts: Record<AttendanceStatus, number>;
};

export type DailyTrendRow = {
  date: string;
  counts: Record<AttendanceStatus, number>;
};

function toDateStart(dateInput: string) {
  return new Date(`${dateInput}T00:00:00.000Z`);
}

function toDateEnd(dateInput: string) {
  return new Date(`${dateInput}T23:59:59.999Z`);
}

function daysBetweenInclusive(from: string, to: string) {
  const start = toDateStart(from).getTime();
  const end = toDateStart(to).getTime();
  const diffDays = Math.floor((end - start) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 ? diffDays + 1 : 0;
}

function emptyCounts(): Record<AttendanceStatus, number> {
  return {
    PRESENT: 0,
    LEAVE_PERSONAL: 0,
    LEAVE_SICK: 0,
    LEAVE_OFFICIAL: 0,
    LEAVE_BEREAVEMENT: 0,
    ABSENT: 0,
    LATE: 0,
    EARLY_LEAVE: 0,
  };
}

export async function getStatsDashboardData(range: StatsRangeInput) {
  const rangeDays = daysBetweenInclusive(range.from, range.to);
  const activeStudents = await listStudents();
  const activeCount = activeStudents.length;
  const totalSlots = activeCount * rangeDays;

  // Only count non-present overrides from stored Attendance records.
  const nonPresent = await prisma.attendance.findMany({
    where: {
      date: {
        gte: toDateStart(range.from),
        lte: toDateEnd(range.to),
      },
      status: {
        not: "PRESENT",
      },
      studentId: {
        in: activeStudents.map((s) => s.id),
      },
    },
    select: {
      studentId: true,
      date: true,
      status: true,
    },
  });

  const classCounts = emptyCounts();
  for (const row of nonPresent) {
    classCounts[row.status as AttendanceStatus] += 1;
  }
  classCounts.PRESENT = Math.max(0, totalSlots - nonPresent.length);

  const leaveTotal = attendanceStatusOrder
    .filter((s) => isLeaveStatus(s))
    .reduce((sum, s) => sum + classCounts[s], 0);
  const absentTotal = isAbsentStatus("ABSENT") ? classCounts.ABSENT : 0;

  const classSummary: ClassSummary = {
    ...classCounts,
    rangeDays,
    activeStudents: activeCount,
    totalSlots,
    leaveTotal,
    absentTotal,
  };

  const studentMap = new Map<string, StudentSummaryRow>();
  for (const student of activeStudents) {
    studentMap.set(student.id, {
      studentId: student.id,
      studentNumber: student.studentNumber,
      name: student.name,
      counts: emptyCounts(),
    });
  }

  for (const row of nonPresent) {
    const item = studentMap.get(row.studentId);
    if (!item) continue;
    item.counts[row.status as AttendanceStatus] += 1;
  }

  for (const item of studentMap.values()) {
    const nonPresentCount =
      item.counts.LEAVE_PERSONAL +
      item.counts.LEAVE_SICK +
      item.counts.LEAVE_OFFICIAL +
      item.counts.LEAVE_BEREAVEMENT +
      item.counts.ABSENT +
      item.counts.LATE +
      item.counts.EARLY_LEAVE;
    item.counts.PRESENT = Math.max(0, rangeDays - nonPresentCount);
  }

  const studentRows = Array.from(studentMap.values()).sort((a, b) => {
    const aNum = Number(a.studentNumber);
    const bNum = Number(b.studentNumber);
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
    return a.studentNumber.localeCompare(b.studentNumber);
  });

  // Daily trend: group non-present by date/status then derive present.
  const trendMap = new Map<string, Record<AttendanceStatus, number>>();
  for (const row of nonPresent) {
    const key = row.date.toISOString().slice(0, 10);
    const counts = trendMap.get(key) ?? emptyCounts();
    counts[row.status as AttendanceStatus] += 1;
    trendMap.set(key, counts);
  }

  const dailyTrend: DailyTrendRow[] = [];
  for (let i = 0; i < rangeDays; i += 1) {
    const date = new Date(toDateStart(range.from).getTime() + i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const counts = trendMap.get(date) ?? emptyCounts();
    const nonPresentForDay =
      counts.LEAVE_PERSONAL +
      counts.LEAVE_SICK +
      counts.LEAVE_OFFICIAL +
      counts.LEAVE_BEREAVEMENT +
      counts.ABSENT +
      counts.LATE +
      counts.EARLY_LEAVE;
    counts.PRESENT = Math.max(0, activeCount - nonPresentForDay);
    dailyTrend.push({ date, counts });
  }

  return {
    classSummary,
    studentRows,
    dailyTrend,
  };
}
