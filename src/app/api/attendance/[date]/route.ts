import { NextResponse } from "next/server";
import { getDailyAttendance } from "@/server/attendance-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const attendance = await getDailyAttendance(date);

  return NextResponse.json({
    date,
    attendance,
  });
}
