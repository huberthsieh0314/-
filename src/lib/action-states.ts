export type AttendanceActionState = {
  ok: boolean;
  message: string;
};

export const attendanceDefaultState: AttendanceActionState = {
  ok: false,
  message: "",
};

export type StudentImportActionState = {
  ok: boolean;
  message: string;
  createdCount: number;
  existingCount: number;
  existingInactiveCount: number;
  conflictCount: number;
  errorCount: number;
  details: string[];
};

export const studentImportDefaultState: StudentImportActionState = {
  ok: false,
  message: "",
  createdCount: 0,
  existingCount: 0,
  existingInactiveCount: 0,
  conflictCount: 0,
  errorCount: 0,
  details: [],
};
