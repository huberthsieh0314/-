import { NextResponse } from "next/server";
import { getDashboardData } from "@/server/attendance-service";
import { formatTaipeiDate } from "@/lib/date";

export async function GET() {
  const dashboard = await getDashboardData(formatTaipeiDate());

  return NextResponse.json(dashboard);
}
