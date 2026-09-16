import { NextResponse } from "next/server";
import { getStatsDashboardData } from "@/server/stats-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const start = url.searchParams.get("start") ?? "2026-09-01";
  const end = url.searchParams.get("end") ?? "2026-09-16";

  const dashboard = await getStatsDashboardData({ from: start, to: end });

  return NextResponse.json({
    start,
    end,
    summary: dashboard.classSummary,
    dailyTrend: dashboard.dailyTrend,
    studentRows: dashboard.studentRows,
  });
}
