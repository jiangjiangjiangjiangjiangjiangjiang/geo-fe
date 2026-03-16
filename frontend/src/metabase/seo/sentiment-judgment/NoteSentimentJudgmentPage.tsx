import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useRef, useState } from "react";
import { t } from "ttag";
import * as XLSX from "xlsx";

import { useGetSentimentJudgmentMutation } from "metabase/api/seo";
import { useToast } from "metabase/common/hooks";
import CS from "metabase/css/core/index.css";
import { usePageTitle } from "metabase/hooks/use-page-title";
import { Box, Button, Flex, Icon, Text } from "metabase/ui";

import S from "./NoteSentimentJudgmentPage.module.css";

type RowRecord = Record<string, unknown>;

type RowResult =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: string }
  | { status: "error"; message: string };

function parseExcelFile(file: File): Promise<RowRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data || !(data instanceof ArrayBuffer)) {
          reject(new Error("Failed to read file"));
          return;
        }
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<RowRecord>(worksheet);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/** Build API request from one row: first column as note_title, rest joined as note_content */
function rowToSentimentRequest(row: RowRecord): {
  note_title: string;
  note_content: string;
} {
  const keys = Object.keys(row);
  if (keys.length === 0) {
    return { note_title: "", note_content: "" };
  }
  const firstVal = row[keys[0]] != null ? String(row[keys[0]]).trim() : "";
  if (keys.length === 1) {
    return { note_title: "", note_content: firstVal };
  }
  const rest = keys
    .slice(1)
    .map((k) => (row[k] != null ? String(row[k]).trim() : ""))
    .filter(Boolean)
    .join(", ");
  return { note_title: firstVal, note_content: rest || firstVal };
}

/** Format row as comma-separated display string (e.g. "张三, 28, 北京") */
function formatRowAsExcelData(row: RowRecord): string {
  return Object.keys(row)
    .map((k) => (row[k] != null ? String(row[k]).trim() : ""))
    .filter(Boolean)
    .join(", ");
}

function processFile(
  file: File | null,
  onParsed: (rows: RowRecord[]) => void,
  onError: () => void,
) {
  if (!file) {
    return;
  }
  parseExcelFile(file).then(onParsed).catch(onError);
}

export const NoteSentimentJudgmentPage = () => {
  usePageTitle(t`Note sentiment judgment result Agent`);

  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<RowRecord[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [sendToast] = useToast();
  const [getSentiment, { isLoading: isApiLoading }] =
    useGetSentimentJudgmentMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyFile = useCallback((chosenFile: File | null) => {
    setFile(chosenFile);
    setRows([]);
    setResults([]);
    if (!chosenFile) {
      return;
    }
    processFile(
      chosenFile,
      (parsed) => {
        setRows(parsed);
        setResults(parsed.map(() => ({ status: "idle" as const })));
      },
      () => setRows([]),
    );
  }, []);

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const chosenFile = event.target.files?.[0] ?? null;
      applyFile(chosenFile);
      event.target.value = "";
    },
    [applyFile],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const droppedFile = e.dataTransfer?.files?.[0];
      if (!droppedFile) {
        return;
      }
      const accept =
        ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";
      const ok =
        droppedFile.name.endsWith(".xlsx") ||
        droppedFile.name.endsWith(".xls") ||
        accept.split(",").some((t) => droppedFile.type === t.trim());
      if (ok) {
        applyFile(droppedFile);
      }
    },
    [applyFile],
  );

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFetchAllResults = useCallback(async () => {
    if (rows.length === 0) {
      return;
    }
    for (let i = 0; i < rows.length; i++) {
      setResults((prev) => {
        const next = [...prev];
        next[i] = { status: "loading" };
        return next;
      });
      const { note_title, note_content } = rowToSentimentRequest(rows[i]);
      try {
        const res = await getSentiment({
          note_title: note_title || "",
          note_content: note_content || "(empty)",
        }).unwrap();
        setResults((prev) => {
          const next = [...prev];
          next[i] = { status: "success", result: res.result ?? "" };
          return next;
        });
      } catch (err) {
        const message =
          err && typeof err === "object" && "data" in err
            ? String((err as { data?: unknown }).data)
            : err instanceof Error
              ? err.message
              : t`Request failed`;
        setResults((prev) => {
          const next = [...prev];
          next[i] = { status: "error", message };
          return next;
        });
      }
    }
    sendToast({
      message: t`Finished fetching results for all rows`,
      icon: "check",
    });
  }, [rows, getSentiment, sendToast]);

  const hasRows = rows.length > 0;
  const allDone =
    hasRows &&
    results.length === rows.length &&
    results.every((r) => r.status === "success" || r.status === "error");

  const renderResult = (res: RowResult) => {
    if (res.status === "idle") {
      return (
        <span className={S.resultPending}>
          <Icon name="close" size={14} /> {t`Pending`}
        </span>
      );
    }
    if (res.status === "loading") {
      return <span className={CS.textSecondary}>{t`Processing...`}</span>;
    }
    if (res.status === "success") {
      const isPass = /通过|pass|positive|正/i.test(res.result);
      return (
        <span className={isPass ? S.resultPass : S.resultFail}>
          <Icon name="check" size={14} /> {res.result || t`Passed`}
        </span>
      );
    }
    return (
      <span className={S.resultFail}>
        <Icon name="close" size={14} /> {res.message || t`Failed`}
      </span>
    );
  };

  return (
    <Box className={S.pageRoot}>
      <Text size="sm" c="dimmed" mb="xs">
        {t`Excel data result page`}
      </Text>

      <h1 className={S.mainTitle}>{t`Note sentiment judgment result Agent`}</h1>
      <div className={S.titleUnderline} />

      <Box className={S.card}>
        <div
          className={`${S.uploadZone} ${dragActive ? S.uploadZoneActive : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerFileInput();
            }
          }}
          aria-label={t`Click or drag to upload Excel file`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileInputChange}
            className={S.hiddenInput}
            aria-hidden
          />
          <Icon name="table" size={40} className={S.uploadIcon} />
          <Text size="md" fw={500} className={S.uploadText}>
            {t`Click or drag to upload Excel file`}
          </Text>
        </div>

        {hasRows && (
          <>
            <Text size="sm" fw={600} className={S.sectionLabel}>
              {t`Data results`}
            </Text>
            <Flex mb="md" gap="sm" align="center">
              <Button
                leftSection={<Icon name="bolt" />}
                onClick={handleFetchAllResults}
                loading={isApiLoading}
                variant="filled"
              >
                {t`Fetch results for all rows`}
              </Button>
              <Text size="sm" c="dimmed">
                {rows.length} {t`rows`}
                {allDone && ` · ${t`Done`}`}
              </Text>
            </Flex>
            <div className={S.tableWrap}>
              <table className={S.table}>
                <thead>
                  <tr>
                    <th className={S.th}>{t`Row number`}</th>
                    <th className={S.th}>{t`Excel data`}</th>
                    <th className={S.th}>{t`Result`}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const res = results[index] ?? { status: "idle" as const };
                    return (
                      <tr
                        key={index}
                        className={index % 2 === 1 ? S.rowOdd : undefined}
                      >
                        <td className={S.td}>{index + 1}</td>
                        <td className={S.td}>{formatRowAsExcelData(row)}</td>
                        <td className={S.td}>{renderResult(res)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {file && !hasRows && (
          <Text size="sm" c="dimmed" mt="md">
            {t`Could not parse the file or the sheet is empty. Please use a valid Excel file with at least one data row.`}
          </Text>
        )}
      </Box>
    </Box>
  );
};
