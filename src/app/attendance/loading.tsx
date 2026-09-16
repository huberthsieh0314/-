import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui";

export default function Loading() {
  return (
    <SiteShell
      title="今日出缺勤"
      subtitle="正在載入今日名單與出缺勤資料。"
    >
      <Card>
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-2xl bg-ink-900/10" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded-2xl bg-ink-900/10" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="h-24 animate-pulse rounded-2xl bg-ink-900/10" />
            <div className="h-24 animate-pulse rounded-2xl bg-ink-900/10" />
            <div className="h-24 animate-pulse rounded-2xl bg-ink-900/10" />
            <div className="h-24 animate-pulse rounded-2xl bg-ink-900/10" />
          </div>
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-3xl bg-ink-900/10" />
            <div className="h-24 animate-pulse rounded-3xl bg-ink-900/10" />
            <div className="h-24 animate-pulse rounded-3xl bg-ink-900/10" />
          </div>
        </div>
      </Card>
    </SiteShell>
  );
}
