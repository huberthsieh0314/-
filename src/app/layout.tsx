import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "學生每日出缺勤登記與管理系統",
  description: "可持久儲存的學生出缺勤登記 MVP，支援學生名單、每日登記、歷史與統計。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
