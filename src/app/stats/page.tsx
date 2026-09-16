import { unstable_noStore as noStore } from "next/cache";
import { Card, SectionHeader, Badge } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { formatTaipeiDate } from "@/lib/date";
import { attendanceStatusKinds } from "@/lib/status";
import { getStatsDashboardData } from "@/server/stats-service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function valueOf(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function dateValue(value: string | undefined, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function shiftDate(date: string, days: number) {
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
}

export default async function StatsPage({ searchParams }: { searchParams: SearchParams }) {
  noStore();
  const today = formatTaipeiDate();
  const params = await searchParams;
  const from = dateValue(valueOf(params, "from"), today);
  const to = dateValue(valueOf(params, "to"), today);
  const data = await getStatsDashboardData({ from, to });
  const maxDaily = Math.max(1, ...data.dailyTrend.map((row) => Object.values(row.counts).reduce((sum, count) => sum + count, 0)));

  return (
    <SiteShell
      title="統計 Dashboard"
      subtitle="以指定日期區間整理全班與個人出缺勤狀況，未建檔日期依系統規則視為出席。"
    >
      <div className="space-y-5">
        <Card>
          <SectionHeader title="統計日期範圍" description={`目前查詢：${from} 至 ${to}`} />
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <a className="rounded-full border px-4 py-2" href={`/stats?from=${today}&to=${today}`}>今天</a>
            <a className="rounded-full border px-4 py-2" href={`/stats?from=${shiftDate(today, -6)}&to=${today}`}>最近 7 天</a>
            <a className="rounded-full border px-4 py-2" href={`/stats?from=${shiftDate(today, -29)}&to=${today}`}>最近 30 天</a>
            <a className="rounded-full border px-4 py-2" href={`/stats?from=${today.slice(0, 7)}-01&to=${today}`}>本月</a>
          </div>
          <form className="mt-4 flex flex-wrap items-end gap-3"><label className="space-y-1"><span className="block text-sm text-ink-700">開始日期</span><input name="from" type="date" defaultValue={from} className="rounded-xl border border-ink-900/15 px-3 py-2" /></label><label className="space-y-1"><span className="block text-sm text-ink-700">結束日期</span><input name="to" type="date" defaultValue={to} className="rounded-xl border border-ink-900/15 px-3 py-2" /></label><button className="rounded-full bg-ink-950 px-4 py-2.5 text-sm font-medium text-paper-50" type="submit">更新統計</button></form>
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card><SectionHeader title="每日趨勢" description="每日各狀態次數，適合快速看出異常日期。" /><div className="mt-5 space-y-2">{data.dailyTrend.map((row) => <div key={row.date} className="flex items-center gap-3 text-xs"><span className="w-20 shrink-0 text-ink-700">{row.date.slice(5)}</span><div className="flex h-6 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-900/5">{attendanceStatusKinds.map((item) => { const width = row.counts[item.key] / maxDaily * 100; return width > 0 ? <div key={item.key} title={`${item.label} ${row.counts[item.key]}`} className={barColor(item.key)} style={{ width: `${width}%` }} /> : null; })}</div><span className="w-8 text-right text-ink-600">{Object.values(row.counts).reduce((a, b) => a + b, 0)}</span></div>)}</div><div className="mt-4 flex flex-wrap gap-2">{attendanceStatusKinds.map((item) => <Badge key={item.key}>{item.label}</Badge>)}</div></Card>
          <Card><SectionHeader title="學生比較" description="依座號排序，查看指定期間每位學生的狀態次數。" /><div className="mt-5 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-ink-700"><th className="px-2 py-3">座號</th><th className="px-2 py-3">姓名</th>{attendanceStatusKinds.map((item) => <th key={item.key} className="px-2 py-3">{item.label}</th>)}</tr></thead><tbody>{data.studentRows.map((row) => <tr key={row.studentId} className="border-b border-ink-900/5"><td className="px-2 py-3">{row.studentNumber}</td><td className="px-2 py-3 font-medium">{row.name}</td>{attendanceStatusKinds.map((item) => <td key={item.key} className="px-2 py-3">{row.counts[item.key]}</td>)}</tr>)}</tbody></table></div></Card>
        </div>
      </div>
    </SiteShell>
  );
}

function barColor(status: string) {
  return status === "PRESENT" ? "bg-emerald-400" : status === "ABSENT" ? "bg-rose-500" : status.startsWith("LEAVE") ? "bg-amber-400" : "bg-sky-400";
}
