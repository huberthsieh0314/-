"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import { attendanceStatusKinds, toChineseStatus } from "@/lib/status";
import type { HistoryRecordItem } from "@/server/history-service";
import { updateHistoryAttendanceAction, type AttendanceEditActionState } from "@/server/actions";

const defaultState: AttendanceEditActionState = { ok: false, message: "" };

export function HistoryRecordsClient({ items }: { items: HistoryRecordItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <HistoryRecordForm key={`${item.studentId}:${item.date}`} item={item} />
      ))}
    </div>
  );
}

function HistoryRecordForm({ item }: { item: HistoryRecordItem }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateHistoryAttendanceAction.bind(null, item.id),
    defaultState
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  return (
    <form action={formAction} className="rounded-3xl border border-ink-900/10 bg-white p-4 shadow-sm">
      <input type="hidden" name="studentId" value={item.studentId} />
      <input type="hidden" name="date" value={item.date} />
      <div className="grid gap-4 lg:grid-cols-[120px_1fr_180px_1fr_auto] lg:items-center">
        <div>
          <p className="text-xs text-ink-600">日期</p>
          <p className="mt-1 font-medium text-ink-950">{item.date}</p>
        </div>
        <div>
          <p className="text-xs text-ink-600">學生</p>
          <p className="mt-1 font-medium text-ink-950">{item.studentNumber} {item.name}</p>
        </div>
        <label className="space-y-1">
          <span className="text-xs text-ink-600">狀態</span>
          <select name="status" defaultValue={item.status} className="w-full rounded-xl border border-ink-900/15 bg-white px-3 py-2 text-sm">
            {attendanceStatusKinds.map((status) => <option key={status.key} value={status.key}>{status.label}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-ink-600">備註</span>
          <input name="note" defaultValue={item.note ?? ""} placeholder="可留空" className="w-full rounded-xl border border-ink-900/15 px-3 py-2 text-sm" />
        </label>
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "儲存中" : "儲存"}</Button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Badge tone={item.status === "PRESENT" ? "success" : "warning"}>{toChineseStatus(item.status)}</Badge>
        {state.message ? <span className={state.ok ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{state.message}</span> : null}
      </div>
    </form>
  );
}
