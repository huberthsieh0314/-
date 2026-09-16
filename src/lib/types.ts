export type AttendanceStatus =
  | "PRESENT"
  | "LEAVE_PERSONAL"
  | "LEAVE_SICK"
  | "LEAVE_OFFICIAL"
  | "LEAVE_BEREAVEMENT"
  | "ABSENT"
  | "LATE"
  | "EARLY_LEAVE";

export type StudentRecord = {
  id: string;
  studentNumber: string;
  name: string;
  studentId?: string;
  active: boolean;
};

export type StudentListItem = {
  id: string;
  studentNumber: string;
  name: string;
  studentId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AttendancePageRow = {
  studentId: string;
  studentNumber: string;
  name: string;
  active: boolean;
  hasRecord: boolean;
  status: AttendanceStatus;
  note: string | null;
};

export type AttendanceUpdateItem = {
  studentId: string;
  status: AttendanceStatus;
  note: string | null;
};

export type AttendanceRecord = {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
};
