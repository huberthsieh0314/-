"use client";

import { SiteShell } from "@/components/site-shell";
import { Button, Card } from "@/components/ui";

export default function AttendanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SiteShell
      title="今日出缺勤"
      subtitle="載入今日出缺勤資料時發生錯誤。"
    >
      <Card>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-rose-700">資料載入失敗</p>
            <p className="mt-2 text-sm leading-6 text-ink-700">
              請稍後再試一次。如果錯誤持續出現，代表資料庫或連線設定需要再檢查。
            </p>
          </div>
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error.message}
          </p>
          <Button variant="primary" onClick={reset}>
            重試
          </Button>
        </div>
      </Card>
    </SiteShell>
  );
}
