import { NextResponse } from "next/server";
import { listStudents } from "@/server/attendance-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeInactive = url.searchParams.get("includeInactive") === "true";
  const allStudents = await listStudents();
  const students = includeInactive ? allStudents : allStudents.filter((item) => item.active);

  return NextResponse.json({ students });
}
