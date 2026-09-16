import { unstable_noStore as noStore } from "next/cache";
import { SiteShell } from "@/components/site-shell";
import { AttendanceRegisterClient } from "@/components/attendance/attendance-register-client";
import { formatTaipeiDate, formatTaipeiDisplayDate } from "@/lib/date";
import { getAttendancePageData } from "@/server/attendance-service";

type AttendancePageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

function normalizeDateInput(value: string | undefined) {
  if (!value) {
    return formatTaipeiDate();
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatTaipeiDate();
  }

  return value;
}

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  noStore();

  const params = await searchParams;
  const selectedDate = normalizeDateInput(params?.date);
  const pageData = await getAttendancePageData(selectedDate);
  const displayDate = formatTaipeiDisplayDate(new Date(`${selectedDate}T00:00:00.000Z`));

  return (
    <SiteShell
      title="今日出缺勤"
      subtitle="快速登記今日學生出缺勤，修改會直接寫入 PostgreSQL，並同步回 Dashboard 與歷史紀錄。"
    >
      <AttendanceRegisterClient
        date={selectedDate}
        displayDate={displayDate}
        rows={pageData.rows}
      />
    </SiteShell>
  );
}
