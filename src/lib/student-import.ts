import type { StudentListItem } from "@/lib/types";

export type StudentImportInputRow = {
  rowNumber: number;
  studentNumber: string;
  name: string;
  studentId: string | null;
};

export type StudentImportRowStatus =
  | "can_add"
  | "existing"
  | "existing_inactive"
  | "seat_conflict"
  | "student_id_conflict"
  | "duplicate_in_file"
  | "invalid";

export type StudentImportPreviewRow = StudentImportInputRow & {
  status: StudentImportRowStatus;
  messages: string[];
};

export type StudentImportPreview = {
  totalCount: number;
  canAddCount: number;
  existingCount: number;
  existingInactiveCount: number;
  conflictCount: number;
  errorCount: number;
  rows: StudentImportPreviewRow[];
};

export function normalizeImportText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return String(value).trim();
}

export function normalizeImportStudentId(value: unknown) {
  const normalized = normalizeImportText(value);
  return normalized.length > 0 ? normalized : null;
}

export function isBlankImportRow(row: StudentImportInputRow) {
  return row.studentNumber.trim() === "" && row.name.trim() === "" && !row.studentId;
}

export function toStudentImportStatusLabel(status: StudentImportRowStatus) {
  switch (status) {
    case "can_add":
      return "可以新增";
    case "existing":
      return "已存在";
    case "existing_inactive":
      return "已存在／目前停用";
    case "seat_conflict":
      return "座號衝突";
    case "student_id_conflict":
      return "學號衝突";
    case "duplicate_in_file":
      return "Excel 內重複";
    case "invalid":
      return "資料錯誤";
  }
}

function buildStudentMaps(students: StudentListItem[]) {
  const byStudentNumber = new Map<string, StudentListItem>();
  const byStudentId = new Map<string, StudentListItem>();

  for (const student of students) {
    byStudentNumber.set(student.studentNumber.trim(), student);

    if (student.studentId && student.studentId.trim()) {
      byStudentId.set(student.studentId.trim(), student);
    }
  }

  return { byStudentNumber, byStudentId };
}

function getDuplicateRowNumbers(rows: StudentImportInputRow[], key: "studentNumber" | "studentId") {
  const grouped = new Map<string, number[]>();

  for (const row of rows) {
    const value = row[key]?.trim();
    if (!value) {
      continue;
    }

    const current = grouped.get(value) ?? [];
    current.push(row.rowNumber);
    grouped.set(value, current);
  }

  const duplicates = new Set<number>();

  for (const rowNumbers of grouped.values()) {
    if (rowNumbers.length > 1) {
      rowNumbers.forEach((rowNumber) => duplicates.add(rowNumber));
    }
  }

  return duplicates;
}

export function buildStudentImportPreview(
  rows: StudentImportInputRow[],
  students: StudentListItem[]
): StudentImportPreview {
  const { byStudentNumber, byStudentId } = buildStudentMaps(students);
  const duplicateSeatRows = getDuplicateRowNumbers(rows, "studentNumber");
  const duplicateStudentIdRows = getDuplicateRowNumbers(rows, "studentId");

  const previewRows: StudentImportPreviewRow[] = rows.map((row) => {
    const messages: string[] = [];
    const trimmedStudentNumber = row.studentNumber.trim();
    const trimmedName = row.name.trim();
    const trimmedStudentId = row.studentId?.trim() ?? "";

    if (!trimmedStudentNumber) {
      messages.push("座號不可為空");
    } else if (!/^\d{1,3}$/.test(trimmedStudentNumber)) {
      messages.push("座號格式不合理");
    }

    if (!trimmedName) {
      messages.push("姓名不可為空");
    }

    if (duplicateSeatRows.has(row.rowNumber)) {
      messages.push("座號重複");
    }

    if (trimmedStudentId && duplicateStudentIdRows.has(row.rowNumber)) {
      messages.push("學號重複");
    }

    const seatMatch = trimmedStudentNumber ? byStudentNumber.get(trimmedStudentNumber) : undefined;
    const studentIdMatch = trimmedStudentId ? byStudentId.get(trimmedStudentId) : undefined;

    const sameStudent =
      seatMatch &&
      studentIdMatch &&
      seatMatch.id === studentIdMatch.id;

    if (messages.length === 0) {
      if (seatMatch && studentIdMatch && !sameStudent) {
        messages.push("座號衝突");
        messages.push("學號衝突");
      } else if (seatMatch) {
        if (seatMatch.name.trim() !== trimmedName) {
          messages.push("座號衝突");
        } else if (
          trimmedStudentId &&
          studentIdMatch &&
          studentIdMatch.id !== seatMatch.id
        ) {
          messages.push("學號衝突");
        } else if (seatMatch.active) {
          messages.push("已存在");
        } else {
          messages.push("已存在／目前停用");
        }
      } else if (studentIdMatch) {
        messages.push("學號衝突");
      }
    }

    let status: StudentImportRowStatus = "can_add";
    if (messages.includes("姓名不可為空") || messages.includes("座號不可為空") || messages.includes("座號格式不合理")) {
      status = "invalid";
    } else if (messages.includes("座號重複") || messages.includes("學號重複")) {
      status = "duplicate_in_file";
    } else if (messages.includes("座號衝突")) {
      status = "seat_conflict";
    } else if (messages.includes("學號衝突")) {
      status = "student_id_conflict";
    } else if (messages.includes("已存在／目前停用")) {
      status = "existing_inactive";
    } else if (messages.includes("已存在")) {
      status = "existing";
    }

    return {
      rowNumber: row.rowNumber,
      studentNumber: trimmedStudentNumber,
      name: trimmedName,
      studentId: trimmedStudentId.length > 0 ? trimmedStudentId : null,
      status,
      messages,
    };
  });

  return {
    totalCount: previewRows.length,
    canAddCount: previewRows.filter((row) => row.status === "can_add").length,
    existingCount: previewRows.filter((row) => row.status === "existing").length,
    existingInactiveCount: previewRows.filter((row) => row.status === "existing_inactive").length,
    conflictCount: previewRows.filter((row) => row.status === "seat_conflict" || row.status === "student_id_conflict" || row.status === "duplicate_in_file").length,
    errorCount: previewRows.filter((row) => row.status === "invalid").length,
    rows: previewRows,
  };
}

