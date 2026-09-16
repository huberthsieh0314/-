import { unstable_noStore as noStore } from "next/cache";
import { Badge, Card, SectionHeader, StatCard } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { formatTaipeiDisplayDate, formatTaipeiDate } from "@/lib/date";
import { getDashboardData } from "@/server/attendance-service";
import { toChineseStatus } from "@/lib/status";

export default async function HomePage() {
  noStore();

  const today = formatTaipeiDate();
  const dashboard = await getDashboardData(today);
  const displayDate = formatTaipeiDisplayDate();

  return (
    <SiteShell
      title="五年十六班今日出缺勤狀況"
    >
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-5 p-1 sm:p-0">
              <div className="rounded-3xl border border-ink-900/10 bg-white p-5">
                <p className="text-sm font-medium text-ink-600">今日</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl">
                  {displayDate} 出缺勤登記
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="全班人數"
                  value={String(dashboard.totalStudents)}
                />
                <StatCard
                  label="出席"
                  value={String(dashboard.presentStudents)}
                  tone="success"
                />
                <StatCard
                  label="請假"
                  value={String(dashboard.leaveStudents)}
                  tone="warning"
                />
                <StatCard
                  label="遲到 / 曠課"
                  value={`${dashboard.lateStudents} / ${dashboard.absentStudents}`}
                  tone="info"
                />
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeader
              title="速報表"
            />
            <div className="mt-5 space-y-3">
              {dashboard.attentionStudents.length > 0 ? (
                dashboard.attentionStudents.map((item) => (
                  <div
                    key={`${item.number}-${item.name}`}
                    className="rounded-2xl border border-ink-900/10 bg-paper-50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>
                        {item.number} {item.name}
                      </Badge>
                      <Badge tone={item.status === "ABSENT" ? "danger" : item.status === "LATE" ? "info" : "warning"}>
                        {toChineseStatus(item.status)}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink-700">
                      {item.note ?? "未填備註"}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-ink-900/15 bg-paper-50 p-6 text-sm leading-6 text-ink-700">
                  今天目前沒有需要特別注意的學生。
                </div>
              )}
            </div>
          </Card>
        </div>

      </div>
    </SiteShell>
  );
}
