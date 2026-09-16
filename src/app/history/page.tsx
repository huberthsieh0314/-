import { unstable_noStore as noStore } from "next/cache";
import { Card, SectionHeader, Button, Badge } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { HistoryRecordsClient } from "@/components/history/history-records-client";
import { formatTaipeiDate } from "@/lib/date";
import { attendanceStatusKinds } from "@/lib/status";
import { listStudents } from "@/server/attendance-service";
import { queryHistory } from "@/server/history-service";
import type { AttendanceStatus } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function validDate(value: string | undefined, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

export default async function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  noStore();
  const today = formatTaipeiDate();
  const params = await searchParams;
  const from = validDate(valueOf(params, "from"), today);
  const to = validDate(valueOf(params, "to"), today);
  const studentId = valueOf(params, "student") || "";
  const rawStatus = valueOf(params, "status") || "ALL";
  const status = attendanceStatusKinds.some((item) => item.key === rawStatus) ? rawStatus as AttendanceStatus : "ALL";
  const page = Math.max(1, Number(valueOf(params, "page") || "1") || 1);
  const pageSize = Math.min(100, Math.max(10, Number(valueOf(params, "pageSize") || "25") || 25));
  const [students, result] = await Promise.all([
    listStudents(),
    queryHistory({ from, to, studentId: studentId || null, status, page, pageSize }),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <SiteShell
      title="歷史紀錄"
      subtitle="依日期、學生與狀態查詢出缺勤紀錄，並可直接修正既有資料。"
    >
      <div className="space-y-5">
        <Card>
          <SectionHeader title="查詢條件" description="查詢條件會保留在網址，重新整理或分享連結都能保留結果。" />
          <form className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-1"><span className="text-sm text-ink-700">開始日期</span><input name="from" type="date" defaultValue={from} className="w-full rounded-xl border border-ink-900/15 px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-sm text-ink-700">結束日期</span><input name="to" type="date" defaultValue={to} className="w-full rounded-xl border border-ink-900/15 px-3 py-2" /></label>
            <label className="space-y-1"><span className="text-sm text-ink-700">學生</span><select name="student" defaultValue={studentId} className="w-full rounded-xl border border-ink-900/15 px-3 py-2"><option value="">全部學生</option>{students.map((student) => <option key={student.id} value={student.id}>{student.studentNumber} {student.name}</option>)}</select></label>
            <label className="space-y-1"><span className="text-sm text-ink-700">狀態</span><select name="status" defaultValue={status} className="w-full rounded-xl border border-ink-900/15 px-3 py-2"><option value="ALL">全部狀態</option>{attendanceStatusKinds.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
            <div className="flex items-end"><Button type="submit">查詢紀錄</Button></div>
          </form>
        </Card>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3"><SectionHeader title="查詢結果" description={`共 ${result.total} 筆，第 ${result.page} / ${totalPages} 頁`} /><Badge tone="info">不提供刪除，避免誤刪歷史資料</Badge></div>
          <div className="mt-5">{result.items.length ? <HistoryRecordsClient items={result.items} /> : <div className="rounded-2xl border border-dashed border-ink-900/15 bg-paper-50 p-8 text-center text-sm text-ink-700">沒有符合目前查詢條件的出缺勤紀錄。</div>}</div>
          <div className="mt-5 flex flex-wrap gap-2">
            {page > 1 ? <a className="rounded-full border px-4 py-2 text-sm" href={historyHref({ from, to, studentId, status, page: page - 1, pageSize })}>上一頁</a> : null}
            {page < totalPages ? <a className="rounded-full border px-4 py-2 text-sm" href={historyHref({ from, to, studentId, status, page: page + 1, pageSize })}>下一頁</a> : null}
          </div>
        </Card>
      </div>
    </SiteShell>
  );
}

function historyHref(input: { from: string; to: string; studentId: string; status: string; page: number; pageSize: number }) {
  const query = new URLSearchParams({ from: input.from, to: input.to, student: input.studentId, status: input.status, page: String(input.page), pageSize: String(input.pageSize) });
  return `/history?${query.toString()}`;
}
