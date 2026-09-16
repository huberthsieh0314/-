import { unstable_noStore as noStore } from "next/cache";
import { SiteShell } from "@/components/site-shell";
import { StudentDirectoryClient } from "@/components/students/student-directory-client";
import { listStudents } from "@/server/attendance-service";
import type { StudentListItem } from "@/lib/types";

export default async function StudentsPage() {
  noStore();

  const students = await listStudents();
  const serializableStudents: StudentListItem[] = students.map((student) => ({
    id: student.id,
    studentNumber: student.studentNumber,
    name: student.name,
    studentId: student.studentId,
    active: student.active,
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
  }));

  return (
    <SiteShell
      title="學生名單管理"
      subtitle="學生資料現在直接來自 PostgreSQL，可以新增、編輯、停用與恢復。"
    >
      <StudentDirectoryClient students={serializableStudents} />
    </SiteShell>
  );
}
