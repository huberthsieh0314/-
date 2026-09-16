import "server-only";

import { prisma } from "@/server/db";
import { listStudents } from "@/server/attendance-service";
import {
  buildStudentImportPreview,
  type StudentImportInputRow,
} from "@/lib/student-import";
import type { StudentListItem } from "@/lib/types";

function serializeStudents(students: Awaited<ReturnType<typeof listStudents>>): StudentListItem[] {
  return students.map((student) => ({
    id: student.id,
    studentNumber: student.studentNumber,
    name: student.name,
    studentId: student.studentId,
    active: student.active,
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
  }));
}

export async function getStudentImportPreview(rows: StudentImportInputRow[]) {
  const students = serializeStudents(await listStudents());
  return buildStudentImportPreview(rows, students);
}

export async function importStudentsFromRows(rows: StudentImportInputRow[]) {
  const students = serializeStudents(await listStudents());
  const preview = buildStudentImportPreview(rows, students);
  const creatableRows = preview.rows.filter((row) => row.status === "can_add");

  if (creatableRows.length === 0) {
    return {
      preview,
      createdCount: 0,
    };
  }

  await prisma.$transaction(
    creatableRows.map((row) =>
      prisma.student.create({
        data: {
          studentNumber: row.studentNumber,
          name: row.name,
          studentId: row.studentId,
        },
      })
    )
  );

  return {
    preview,
    createdCount: creatableRows.length,
  };
}
