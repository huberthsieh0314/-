"use client";

import {
  type ChangeEvent,
  useCallback,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import { studentImportDefaultState } from "@/lib/action-states";
import type { StudentListItem } from "@/lib/types";
import {
  buildStudentImportPreview,
  isBlankImportRow,
  normalizeImportStudentId,
  normalizeImportText,
  toStudentImportStatusLabel,
  type StudentImportInputRow,
  type StudentImportPreview,
} from "@/lib/student-import";
import { importStudentsAction } from "@/server/actions";

type StudentImportPanelProps = {
  students: StudentListItem[];
  onFeedback: (message: string, ok: boolean) => void;
};

type ParseResult =
  | {
      ok: true;
      preview: StudentImportPreview;
      fileName: string;
    }
  | {
      ok: false;
      message: string;
      fileName?: string;
    };

const headerAliases = {
  studentNumber: ["座號", "序號"],
  name: ["姓名"],
  studentId: ["學號", "學生ID", "學生 ID"],
} as const;

function findHeaderIndex(headers: string[], aliases: readonly string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

async function parseExcelFile(file: File, students: StudentListItem[]): Promise<ParseResult> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return {
      ok: false,
      message: "請選擇 .xlsx 格式的 Excel 檔案。",
    };
  }

  const { read, utils } = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return {
      ok: false,
      message: "Excel 檔案中找不到工作表。",
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: true,
  }) as unknown[][];

  if (rows.length < 2) {
    return {
      ok: false,
      message: "Excel 檔案內容不足，至少需要欄位列與一筆學生資料。",
    };
  }

  const headers = rows[0].map((value) => normalizeImportText(value));
  const studentNumberIndex = findHeaderIndex(headers, headerAliases.studentNumber);
  const nameIndex = findHeaderIndex(headers, headerAliases.name);
  const studentIdIndex = findHeaderIndex(headers, headerAliases.studentId);

  if (studentNumberIndex < 0 || nameIndex < 0) {
    return {
      ok: false,
      message: "Excel 欄位名稱不正確，至少需要「座號」與「姓名」。",
    };
  }

  const importedRows: StudentImportInputRow[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const cells = rows[rowIndex] ?? [];
    const rowNumber = rowIndex + 1;

    const row: StudentImportInputRow = {
      rowNumber,
      studentNumber: normalizeImportText(cells[studentNumberIndex]),
      name: normalizeImportText(cells[nameIndex]),
      studentId:
        studentIdIndex >= 0 ? normalizeImportStudentId(cells[studentIdIndex]) : null,
    };

    if (isBlankImportRow(row)) {
      continue;
    }

    importedRows.push(row);
  }

  if (importedRows.length === 0) {
    return {
      ok: false,
      message: "Excel 裡沒有可匯入的學生資料。",
    };
  }

  return {
    ok: true,
    fileName: file.name,
    preview: buildStudentImportPreview(importedRows, students),
  };
}

async function downloadSampleExcel() {
  const { utils, writeFile } = await import("xlsx");
  const worksheet = utils.json_to_sheet(
    [
      { 座號: "1", 姓名: "王小明", 學號: "112001" },
      { 座號: "2", 姓名: "李小華", 學號: "112002" },
      { 座號: "3", 姓名: "陳小美", 學號: "112003" },
    ],
    {
      header: ["座號", "姓名", "學號"],
    }
  );
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "學生名單");
  writeFile(workbook, "學生名單匯入範例.xlsx");
}

export function StudentImportPanel({ students, onFeedback }: StudentImportPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saveState, formAction, pending] = useActionState(
    importStudentsAction,
    studentImportDefaultState
  );

  useEffect(() => {
    if (!saveState.message) {
      return;
    }

    onFeedback(saveState.message, saveState.ok);

    if (saveState.ok && saveState.createdCount > 0) {
      setParseResult(null);
      setSelectedFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    }
  }, [onFeedback, router, saveState]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setParsing(true);
    setParseResult(null);

    try {
      const result = await parseExcelFile(file, students);
      setParseResult(result);
      setSelectedFileName(file.name);

      if (!result.ok) {
        onFeedback(result.message, false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Excel 解析失敗";
      setParseResult({ ok: false, message });
      setSelectedFileName(file.name);
      onFeedback(message, false);
    } finally {
      setParsing(false);
    }
  };

  const handleDownloadSample = useCallback(() => {
    void downloadSampleExcel().catch((error) => {
      const message = error instanceof Error ? error.message : "範例下載失敗";
      onFeedback(message, false);
    });
  }, [onFeedback]);

  const preview = parseResult && parseResult.ok ? parseResult.preview : null;
  const canImport = Boolean(preview && preview.canAddCount > 0);

  return (
    <div className="mt-6 space-y-5 border-t border-ink-900/10 pt-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.2em] text-ink-600 uppercase">
          Excel 匯入
        </p>
        <h3 className="text-lg font-semibold text-ink-950">學生名單批次匯入</h3>
        <p className="text-sm leading-6 text-ink-700">
          上傳 .xlsx 後會先在畫面上完成解析與預覽，確認無誤再正式寫入 PostgreSQL。
        </p>
      </div>

      <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4 text-sm leading-6 text-ink-800">
        <p className="font-medium text-ink-950">Excel 格式說明</p>
        <p className="mt-2">第一列請使用欄位名稱，至少要有：座號、姓名、學號。</p>
        <p className="mt-1">範例：1｜王小明｜112001</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          {parsing ? "解析中..." : "Excel 匯入"}
        </Button>
        <Button variant="secondary" onClick={handleDownloadSample}>
          下載 Excel 範例
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleFileChange}
      />

      {selectedFileName ? (
        <p className="text-sm text-ink-600">
          已選擇檔案：<span className="font-medium text-ink-950">{selectedFileName}</span>
        </p>
      ) : null}

      {parseResult && !parseResult.ok ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {parseResult.message}
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-4 rounded-3xl border border-ink-900/10 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ImportStat label="總筆數" value={preview.totalCount} />
            <ImportStat label="可以新增" value={preview.canAddCount} tone="success" />
            <ImportStat label="已存在" value={preview.existingCount} tone="info" />
            <ImportStat
              label="停用中"
              value={preview.existingInactiveCount}
              tone="warning"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ImportStat label="衝突 / 重複" value={preview.conflictCount} tone="danger" />
            <ImportStat label="資料錯誤" value={preview.errorCount} tone="danger" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-ink-900/10">
            <div className="max-h-[360px] overflow-auto">
              <table className="min-w-full divide-y divide-ink-900/10 text-sm">
                <thead className="sticky top-0 bg-paper-50">
                  <tr className="text-left text-ink-700">
                    <th className="px-4 py-3">列</th>
                    <th className="px-4 py-3">座號</th>
                    <th className="px-4 py-3">姓名</th>
                    <th className="px-4 py-3">學號</th>
                    <th className="px-4 py-3">狀態</th>
                    <th className="px-4 py-3">說明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-900/5 bg-white">
                  {preview.rows.map((row) => (
                    <tr key={row.rowNumber} className="align-top">
                      <td className="px-4 py-3 text-ink-600">{row.rowNumber}</td>
                      <td className="px-4 py-3 font-medium text-ink-950">{row.studentNumber || "—"}</td>
                      <td className="px-4 py-3 text-ink-800">{row.name || "—"}</td>
                      <td className="px-4 py-3 text-ink-800">{row.studentId || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            row.status === "can_add"
                              ? "success"
                              : row.status === "existing" || row.status === "existing_inactive"
                                ? "info"
                                : row.status === "invalid"
                                  ? "danger"
                                  : "warning"
                          }
                        >
                          {toStudentImportStatusLabel(row.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-ink-700">
                        {row.messages.length > 0 ? row.messages.join("、") : "可匯入"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <form action={formAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="payload" value={JSON.stringify(preview.rows)} />
            <Button
              variant="primary"
              type="submit"
              disabled={pending || !canImport}
            >
              {pending ? "匯入中..." : "確認匯入"}
            </Button>
            {!canImport ? (
              <p className="text-sm text-ink-600">沒有可新增的學生，因此目前無法匯入。</p>
            ) : (
              <p className="text-sm text-ink-600">確認後只會新增「可以新增」的學生。</p>
            )}
          </form>
        </div>
      ) : null}

      {saveState.message ? (
        <div
          className={`rounded-3xl border px-4 py-3 text-sm ${
            saveState.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <p>{saveState.message}</p>
          {saveState.details.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm leading-6">
              {saveState.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ImportStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <div className="rounded-2xl border border-ink-900/10 bg-paper-50 p-4">
      <p className="text-sm font-medium text-ink-600">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold ${
          tone === "success"
            ? "text-emerald-700"
            : tone === "warning"
              ? "text-amber-800"
              : tone === "danger"
                ? "text-rose-700"
                : tone === "info"
                  ? "text-sky-700"
                  : "text-ink-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
