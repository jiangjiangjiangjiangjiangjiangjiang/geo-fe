import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useRef, useState } from "react";
import { t } from "ttag";
import * as XLSX from "xlsx";

import { useToast } from "metabase/common/hooks";
import CS from "metabase/css/core/index.css";
import { usePageTitle } from "metabase/hooks/use-page-title";
import { Box, Button, Flex, Icon, Text } from "metabase/ui";

import S from "./ExcelBatchAnalysisPage.module.css";

type RowRecord = Record<string, unknown>;

type RowExtractionResult<TRequest> = {
  noteTitle: string;
  noteContent: string;
  request: TRequest;
};

type RowResult =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; resultText: string }
  | { status: "error"; message: string };

interface ExcelBatchAnalysisPageProps<TRequest, TResponse> {
  pageTitle: string;
  pageDescription: string;
  pageHeading: string;
  uploadPrompt: string;
  fetchButtonLabel: string;
  resultColumnLabel: string;
  exportSheetName: string;
  exportFileSuffix: string;
  analyzeRow: (request: TRequest) => Promise<TResponse>;
  buildRequestFromRow: (row: RowRecord) => RowExtractionResult<TRequest>;
  getResultText: (response: TResponse) => string;
  validateParsedRows?: (rows: RowRecord[]) => string | null;
}

const MAX_EXCEL_ROWS = 100;
const EXCEL_ACCEPT =
  ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

function parseExcelFile(file: File): Promise<RowRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data || !(data instanceof ArrayBuffer)) {
          reject(new Error("Failed to read file"));
          return;
        }

        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<RowRecord>(worksheet);
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
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

function isExcelFile(file: File): boolean {
  return (
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls") ||
    EXCEL_ACCEPT.split(",").some((type) => file.type === type.trim())
  );
}

function getStatusText(result: RowResult) {
  if (result.status === "success") {
    return result.resultText || t`Passed`;
  }
  if (result.status === "error") {
    return result.message || t`Failed`;
  }
  if (result.status === "loading") {
    return t`Processing...`;
  }
  return t`Pending`;
}

export function ExcelBatchAnalysisPage<TRequest, TResponse>({
  pageTitle,
  pageDescription,
  pageHeading,
  uploadPrompt,
  fetchButtonLabel,
  resultColumnLabel,
  exportSheetName,
  exportFileSuffix,
  analyzeRow,
  buildRequestFromRow,
  getResultText,
  validateParsedRows,
}: ExcelBatchAnalysisPageProps<TRequest, TResponse>) {
  usePageTitle(pageTitle);

  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<RowRecord[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [showRowLimitWarning, setShowRowLimitWarning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [sendToast] = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyFile = useCallback(
    (chosenFile: File | null) => {
      setFile(chosenFile);
      setRows([]);
      setResults([]);
      setParseError(null);
      setShowRowLimitWarning(false);

      if (!chosenFile) {
        return;
      }

      processFile(
        chosenFile,
        (parsedRows) => {
          const totalRows = parsedRows.length;
          const validationError = validateParsedRows?.(parsedRows) ?? null;
          if (validationError) {
            setParseError(validationError);
            return;
          }

          const rowsToUse =
            totalRows > MAX_EXCEL_ROWS
              ? parsedRows.slice(0, MAX_EXCEL_ROWS)
              : parsedRows;

          setShowRowLimitWarning(totalRows > MAX_EXCEL_ROWS);
          setRows(rowsToUse);
          setResults(rowsToUse.map(() => ({ status: "idle" as const })));
        },
        () => {
          setRows([]);
          setResults([]);
          setParseError(
            t`Could not parse the file. Please use a valid Excel file.`,
          );
        },
      );
    },
    [validateParsedRows],
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const chosenFile = event.target.files?.[0] ?? null;
      applyFile(chosenFile);
      event.target.value = "";
    },
    [applyFile],
  );

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);

      const droppedFile = event.dataTransfer?.files?.[0];
      if (droppedFile && isExcelFile(droppedFile)) {
        applyFile(droppedFile);
      }
    },
    [applyFile],
  );

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFetchAllResults = useCallback(async () => {
    if (rows.length === 0 || isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      for (let index = 0; index < rows.length; index++) {
        setResults((previousResults) => {
          const nextResults = [...previousResults];
          nextResults[index] = { status: "loading" };
          return nextResults;
        });

        try {
          const response = await analyzeRow(
            buildRequestFromRow(rows[index]).request,
          );
          const resultText = getResultText(response);

          setResults((previousResults) => {
            const nextResults = [...previousResults];
            nextResults[index] = { status: "success", resultText };
            return nextResults;
          });
        } catch (error) {
          const message =
            error && typeof error === "object" && "data" in error
              ? String((error as { data?: unknown }).data)
              : error instanceof Error
                ? error.message
                : t`Request failed`;

          setResults((previousResults) => {
            const nextResults = [...previousResults];
            nextResults[index] = { status: "error", message };
            return nextResults;
          });
        }
      }

      sendToast({
        message: t`Finished fetching results for all rows`,
        icon: "check",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    analyzeRow,
    buildRequestFromRow,
    getResultText,
    isProcessing,
    rows,
    sendToast,
  ]);

  const handleExportExcel = useCallback(() => {
    if (rows.length === 0) {
      return;
    }

    const exportRows = rows.map((row, index) => {
      const { noteTitle, noteContent } = buildRequestFromRow(row);
      const result = results[index] ?? { status: "idle" as const };

      return {
        [t`Row number`]: index + 1,
        [t`Note title`]: noteTitle || "",
        [t`Note content`]: noteContent || "",
        [resultColumnLabel]: getStatusText(result),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, exportSheetName);

    const fileName = file?.name?.replace(/\.(xlsx|xls)$/i, "") || "results";
    XLSX.writeFile(workbook, `${fileName}-${exportFileSuffix}.xlsx`);
  }, [
    buildRequestFromRow,
    exportFileSuffix,
    exportSheetName,
    file,
    resultColumnLabel,
    results,
    rows,
  ]);

  const allDone =
    rows.length > 0 &&
    results.length === rows.length &&
    results.every(
      (result) => result.status === "success" || result.status === "error",
    );

  const renderResult = (result: RowResult) => {
    if (result.status === "idle") {
      return (
        <span className={S.resultPending}>
          <Icon name="close" size={14} /> {t`Pending`}
        </span>
      );
    }

    if (result.status === "loading") {
      return <span className={CS.textSecondary}>{t`Processing...`}</span>;
    }

    if (result.status === "success") {
      const isPass = /通过|pass|positive|正/i.test(result.resultText);
      return (
        <span className={isPass ? S.resultPass : S.resultFail}>
          <Icon name="check" size={14} />
          <span className={S.resultText}>{result.resultText || t`Passed`}</span>
        </span>
      );
    }

    return (
      <span className={S.resultFail}>
        <Icon name="close" size={14} />
        <span className={S.resultText}>{result.message || t`Failed`}</span>
      </span>
    );
  };

  return (
    <Box className={S.pageRoot}>
      <Text size="sm" c="dimmed" mb="xs">
        {pageDescription}
      </Text>

      <h1 className={S.mainTitle}>{pageHeading}</h1>
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
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              triggerFileInput();
            }
          }}
          aria-label={uploadPrompt}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={EXCEL_ACCEPT}
            onChange={handleFileInputChange}
            className={S.hiddenInput}
            aria-hidden
          />
          <Icon name="table" size={40} className={S.uploadIcon} />
          <Text size="md" fw={500} className={S.uploadText}>
            {uploadPrompt}
          </Text>
        </div>

        {rows.length > 0 && (
          <>
            {showRowLimitWarning && (
              <div className={S.rowLimitAlert}>
                <Icon
                  name="warning_triangle_filled"
                  size={22}
                  className={S.rowLimitAlertIcon}
                  aria-hidden
                />
                <span className={S.rowLimitAlertText}>
                  {t`Excel exceeds the maximum of 100 rows; only the first 100 rows will be processed.`}
                </span>
                <button
                  type="button"
                  className={S.rowLimitAlertClose}
                  onClick={() => setShowRowLimitWarning(false)}
                  aria-label={t`Close`}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            )}

            <Text size="sm" fw={600} className={S.sectionLabel}>
              {t`Data results`}
            </Text>

            <Flex
              mb="md"
              gap="sm"
              align="center"
              wrap="wrap"
              className={S.toolbar}
            >
              <Button
                leftSection={<Icon name="bolt" />}
                onClick={handleFetchAllResults}
                loading={isProcessing}
                variant="filled"
              >
                {fetchButtonLabel}
              </Button>
              <Button
                leftSection={<Icon name="download" />}
                onClick={handleExportExcel}
                disabled={rows.length === 0}
                variant="filled"
                className={S.exportButton}
                aria-label={t`Export Excel`}
              >
                {t`Export Excel`}
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
                    <th className={S.th}>{t`Note title`}</th>
                    <th className={S.th}>{t`Note content`}</th>
                    <th className={S.th}>{resultColumnLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const result = results[index] ?? {
                      status: "idle" as const,
                    };
                    const { noteTitle, noteContent } = buildRequestFromRow(row);

                    return (
                      <tr
                        key={index}
                        className={index % 2 === 1 ? S.rowOdd : undefined}
                      >
                        <td className={S.td}>{index + 1}</td>
                        <td className={S.td}>{noteTitle || "—"}</td>
                        <td className={S.td}>{noteContent || "—"}</td>
                        <td className={S.td}>{renderResult(result)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {file && rows.length === 0 && (
          <Text size="sm" c="dimmed" mt="md">
            {parseError ||
              t`Could not parse the file or the sheet is empty. Please use a valid Excel file with at least one data row.`}
          </Text>
        )}
      </Box>
    </Box>
  );
}
