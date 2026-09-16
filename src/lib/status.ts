import type { AttendanceStatus } from "@/lib/types";

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  PRESENT: "出席",
  LEAVE_PERSONAL: "事假",
  LEAVE_SICK: "病假",
  LEAVE_OFFICIAL: "公假",
  LEAVE_BEREAVEMENT: "喪假",
  ABSENT: "曠課",
  LATE: "遲到",
  EARLY_LEAVE: "早退",
};

export const attendanceStatusOrder: AttendanceStatus[] = [
  "PRESENT",
  "LEAVE_PERSONAL",
  "LEAVE_SICK",
  "LEAVE_OFFICIAL",
  "LEAVE_BEREAVEMENT",
  "ABSENT",
  "LATE",
  "EARLY_LEAVE",
];

export const attendanceStatusKinds = [
  {
    key: "PRESENT",
    label: "出席",
    tone: "success" as const,
    countsAsLeave: false,
    countsAsAbsent: false,
  },
  {
    key: "LEAVE_PERSONAL",
    label: "事假",
    tone: "warning" as const,
    countsAsLeave: true,
    countsAsAbsent: false,
  },
  {
    key: "LEAVE_SICK",
    label: "病假",
    tone: "warning" as const,
    countsAsLeave: true,
    countsAsAbsent: false,
  },
  {
    key: "LEAVE_OFFICIAL",
    label: "公假",
    tone: "info" as const,
    countsAsLeave: true,
    countsAsAbsent: false,
  },
  {
    key: "LEAVE_BEREAVEMENT",
    label: "喪假",
    tone: "warning" as const,
    countsAsLeave: true,
    countsAsAbsent: false,
  },
  {
    key: "ABSENT",
    label: "曠課",
    tone: "danger" as const,
    countsAsLeave: false,
    countsAsAbsent: true,
  },
  {
    key: "LATE",
    label: "遲到",
    tone: "info" as const,
    countsAsLeave: false,
    countsAsAbsent: false,
  },
  {
    key: "EARLY_LEAVE",
    label: "早退",
    tone: "info" as const,
    countsAsLeave: false,
    countsAsAbsent: false,
  },
] as const;

export const leaveStatuses = [
  "LEAVE_PERSONAL",
  "LEAVE_SICK",
  "LEAVE_OFFICIAL",
  "LEAVE_BEREAVEMENT",
] as const;

export function isLeaveStatus(status: AttendanceStatus) {
  return leaveStatuses.includes(status as (typeof leaveStatuses)[number]);
}

export function isAbsentStatus(status: AttendanceStatus) {
  return status === "ABSENT";
}

export function toChineseStatus(status: AttendanceStatus) {
  return attendanceStatusLabels[status];
}
