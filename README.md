# 學生每日出缺勤登記與管理系統

這是一個從零開始的 MVP 專案。

## 技術棧

- Next.js
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma

## 開發

1. 安裝依賴
2. 設定 `.env`
3. 執行 `npm run dev`

## Phase 2 啟動順序

在有可用 PostgreSQL 的環境中：

1. 確認 `.env` 內的 `DATABASE_URL` 指向可連線的 PostgreSQL
2. 執行 `npm run db:generate`
3. 執行 `npm run db:migrate`
4. 執行 `npm run db:seed`
5. 執行 `npm run dev`

如果你使用本機 PostgreSQL，請先把資料庫服務啟動好，再執行 migration 與 seed。

## Phase 規劃

- Phase 1: 專案與基本 UI
- Phase 2: 資料庫 schema
- Phase 3: 學生名單管理
- Phase 4: 每日出缺勤登記
- Phase 5: 歷史紀錄
- Phase 6: 統計 Dashboard
- Phase 7: 手機版測試與修正
