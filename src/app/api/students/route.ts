import { NextResponse } from "next/server";
import { listStudents } from "@/server/attendance-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeInactive = url.searchParams.get("includeInactive") === "true";
  const students = includeInactive ? await listStudents() : await listStudents().then((items) => items.filter((item) => item.active));

  return NextResponse.json({ students });
}
