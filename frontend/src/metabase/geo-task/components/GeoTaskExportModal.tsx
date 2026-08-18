import { useEffect, useMemo, useState } from "react";
import { t } from "ttag";
import * as XLSX from "xlsx";

import type {
  GeoTaskExportPreviewResponse,
  GeoTaskExportSource,
} from "metabase/api/geo-task";
import {
  useGetGeoTaskExportDataMutation,
  usePreviewGeoTaskExportMutation,
} from "metabase/api/geo-task";
import { PaginationControls } from "metabase/common/components/PaginationControls";
import { useLocale, useToast } from "metabase/common/hooks";
import AdminS from "metabase/css/admin.module.css";
import CS from "metabase/css/core/index.css";
import {
  buildBulkResultExportFileName,
  buildBulkResultExportRows,
} from "metabase/geo-task/lib/bulkResultExport";
import { Alert, Button, Checkbox, Flex, Modal, Stack, Text } from "metabase/ui";

const PAGE_SIZE = 20;
const EMPTY_PREVIEW_ITEMS: GeoTaskExportPreviewResponse["items"] = [];

interface GeoTaskExportModalProps {
  opened: boolean;
  taskIds: string[];
  executedFrom?: string;
  executedTo?: string;
  startDate: string;
  endDate: string;
  onClose: () => void;
}

function formatBoolean(value: boolean | null): string {
  if (value == null) {
    return "-";
  }
  return value ? t`Yes` : t`No`;
}

function formatDetailValue(value: unknown): string {
  if (value == null || value === "") {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function DetailCell({
  value,
  label = t`View details`,
}: {
  value: unknown;
  label?: string;
}) {
  const content = formatDetailValue(value);
  if (!content) {
    return <>-</>;
  }
  return (
    <details style={{ minWidth: 120, maxWidth: 420 }}>
      <summary className={CS.link} style={{ cursor: "pointer" }}>
        {label}
      </summary>
      <div
        style={{
          marginTop: 8,
          maxHeight: 260,
          overflow: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {content}
      </div>
    </details>
  );
}

function SourcesCell({ sources }: { sources: GeoTaskExportSource[] }) {
  if (sources.length === 0) {
    return <>-</>;
  }
  return (
    <details style={{ minWidth: 180, maxWidth: 480 }}>
      <summary className={CS.link} style={{ cursor: "pointer" }}>
        {t`${sources.length} sources`}
      </summary>
      <ol style={{ margin: "8px 0 0", paddingLeft: 20 }}>
        {sources.map((source, index) => (
          <li key={`${source.url ?? source.title ?? "source"}-${index}`}>
            <div>{source.title || t`Untitled source`}</div>
            {source.url && (
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.url}
              </a>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data: unknown }).data;
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data) as {
          detail?: string | { message?: string };
        };
        if (typeof parsed.detail === "string") {
          return parsed.detail;
        }
        if (parsed.detail?.message) {
          return parsed.detail.message;
        }
      } catch {
        return data;
      }
    }
  }
  return error instanceof Error ? error.message : t`Request failed`;
}

export function GeoTaskExportModal({
  opened,
  taskIds,
  executedFrom,
  executedTo,
  startDate,
  endDate,
  onClose,
}: GeoTaskExportModalProps) {
  const [previewExport, { isLoading: isLoadingPreview }] =
    usePreviewGeoTaskExportMutation();
  const [getExportData, { isLoading: isDownloading }] =
    useGetGeoTaskExportDataMutation();
  const [preview, setPreview] = useState<GeoTaskExportPreviewResponse | null>(
    null,
  );
  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [page, setPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sendToast] = useToast();
  const { locale } = useLocale();
  const isZh = locale?.startsWith("zh");
  const modalTitle = (isZh ? "导出结果预览" : null) ?? t`Export result preview`;
  const exportFailedTitle = (isZh ? "导出失败" : null) ?? t`Export failed`;
  const tooManyTitle =
    (isZh ? "选择结果数量超出上限" : null) ?? t`Too many selected results`;
  const tooManyMessage =
    (isZh ? "请取消部分结果或缩小执行时间范围后再下载。" : null) ??
    t`Cancel some results or narrow the execution time range before downloading.`;
  const selectedLabel = (isZh ? "已选择" : null) ?? t`Selected`;
  const maximumLabel = (isZh ? "最多" : null) ?? t`maximum`;
  const executionTimeLabel = (isZh ? "执行时间" : null) ?? t`Execution time`;
  const taskNameLabel = (isZh ? "任务名称" : null) ?? t`Task Name`;
  const aiPlatformLabel = (isZh ? "AI平台" : null) ?? t`AI Platform`;
  const batchIdLabel = (isZh ? "执行批次" : null) ?? t`Batch ID`;
  const selectPageLabel =
    (isZh ? "选择当前页" : null) ?? t`Select current page`;
  const cancelPageLabel =
    (isZh ? "取消当前页" : null) ?? t`Cancel current page`;
  const cancelLabel = (isZh ? "取消" : null) ?? t`Cancel`;
  const downloadLabel = (isZh ? "下载 Excel" : null) ?? t`Download Excel`;
  const executionRangeText =
    startDate || endDate
      ? `${startDate || t`Earliest`} — ${endDate || t`Latest`}`
      : ((isZh ? "全部执行时间" : null) ?? t`All execution times`);
  const taskIdsKey = taskIds.join(",");

  useEffect(() => {
    if (!opened || taskIds.length === 0) {
      return;
    }

    let cancelled = false;
    setPreview(null);
    setSelectedResultIds(new Set());
    setPage(1);
    setErrorMessage(null);

    void previewExport({
      task_ids: taskIds,
      ...(executedFrom && { executed_from: executedFrom }),
      ...(executedTo && { executed_to: executedTo }),
    })
      .unwrap()
      .then((response) => {
        if (!cancelled) {
          setPreview(response);
          setSelectedResultIds(new Set(response.items.map((item) => item.id)));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [executedFrom, executedTo, opened, previewExport, taskIds, taskIdsKey]);

  const items = preview?.items ?? EMPTY_PREVIEW_ITEMS;
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const visibleItems = useMemo(
    () => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [items, page],
  );
  const selectedCount = selectedResultIds.size;
  const maxLimit = preview?.max_limit ?? 0;
  const isOverLimit = maxLimit > 0 && selectedCount > maxLimit;
  const visibleSelectedCount = visibleItems.filter((item) =>
    selectedResultIds.has(item.id),
  ).length;
  const allVisibleSelected =
    visibleItems.length > 0 && visibleSelectedCount === visibleItems.length;

  const toggleResult = (resultId: string) => {
    setSelectedResultIds((current) => {
      const next = new Set(current);
      if (next.has(resultId)) {
        next.delete(resultId);
      } else {
        next.add(resultId);
      }
      return next;
    });
  };

  const toggleVisibleResults = () => {
    setSelectedResultIds((current) => {
      const next = new Set(current);
      visibleItems.forEach((item) => {
        if (allVisibleSelected) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
      });
      return next;
    });
  };

  const handleDownload = async () => {
    if (selectedCount === 0 || isOverLimit) {
      return;
    }

    setErrorMessage(null);
    try {
      const response = await getExportData({
        result_ids: Array.from(selectedResultIds),
      }).unwrap();
      const rows = buildBulkResultExportRows(response.items);
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 38 },
        { wch: 38 },
        { wch: 24 },
        { wch: 18 },
        { wch: 40 },
        { wch: 16 },
        { wch: 12 },
        { wch: 16 },
        { wch: 24 },
        { wch: 80 },
        { wch: 16 },
        { wch: 12 },
        { wch: 18 },
        { wch: 12 },
        { wch: 16 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 80 },
      ];
      if (worksheet["!ref"]) {
        worksheet["!autofilter"] = { ref: worksheet["!ref"] };
      }
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, t`Task results`);
      XLSX.writeFile(
        workbook,
        buildBulkResultExportFileName(startDate, endDate),
      );
      sendToast({
        message:
          (isZh ? "所选结果导出成功" : null) ??
          t`Selected results exported successfully`,
        icon: "check",
      });
      onClose();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={modalTitle} size="90vw">
      <Stack gap="md">
        {errorMessage && (
          <Alert color="error" title={exportFailedTitle}>
            {errorMessage}
          </Alert>
        )}
        {isOverLimit && (
          <Alert color="error" title={tooManyTitle}>
            {tooManyMessage}
          </Alert>
        )}
        <Flex justify="space-between" align="center" wrap="wrap" gap="sm">
          <Text fw={600} c={isOverLimit ? "error" : undefined}>
            {selectedLabel} {selectedCount} / {maximumLabel} {maxLimit || "-"}
          </Text>
          <Text size="sm" c="dimmed">
            {executionTimeLabel}: {executionRangeText}
          </Text>
        </Flex>

        <div
          className={CS.bordered}
          style={{ maxHeight: "55vh", overflow: "auto" }}
        >
          <table className={AdminS.ContentTable}>
            <thead>
              <tr>
                <th>
                  <Checkbox
                    checked={allVisibleSelected}
                    indeterminate={
                      visibleSelectedCount > 0 && !allVisibleSelected
                    }
                    onChange={toggleVisibleResults}
                    aria-label={selectPageLabel}
                  />
                </th>
                <th>{t`Result ID`}</th>
                <th>{taskNameLabel}</th>
                <th>{t`Product Brand`}</th>
                <th>{batchIdLabel}</th>
                <th>{executionTimeLabel}</th>
                <th>{t`Query`}</th>
                <th>{aiPlatformLabel}</th>
                <th>{t`Sentiment`}</th>
                <th>{t`Brand Mentioned`}</th>
                <th>{t`Brand Rank`}</th>
                <th>{t`First Recommendation`}</th>
                <th>{t`Top 3`}</th>
                <th>{t`Selling Point Mentions`}</th>
                <th>{t`Product Keyword Mentions`}</th>
                <th>{t`Competitor Analysis`}</th>
                <th>{t`Query Result`}</th>
                <th>{t`Processed Content`}</th>
                <th>{t`Sources`}</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingPreview ? (
                <tr>
                  <td colSpan={19}>{t`Loading export results…`}</td>
                </tr>
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={19}>{t`No execution results found`}</td>
                </tr>
              ) : (
                visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Checkbox
                        checked={selectedResultIds.has(item.id)}
                        onChange={() => toggleResult(item.id)}
                        aria-label={t`Select result`}
                      />
                    </td>
                    <td style={{ minWidth: 260 }}>{item.id}</td>
                    <td>{item.task_name || "-"}</td>
                    <td>{item.product_brand || "-"}</td>
                    <td>{item.batch_id ?? "-"}</td>
                    <td>{new Date(item.collected_at).toLocaleString()}</td>
                    <td style={{ minWidth: 220 }}>{item.query || "-"}</td>
                    <td>{item.engine || "-"}</td>
                    <td>{item.sentiment}</td>
                    <td>{formatBoolean(item.brand_mentioned)}</td>
                    <td>{item.brand_rank ?? "-"}</td>
                    <td>{formatBoolean(item.is_first_recommendation)}</td>
                    <td>{formatBoolean(item.in_top3)}</td>
                    <td>
                      <DetailCell value={item.selling_point_mentions} />
                    </td>
                    <td>
                      <DetailCell value={item.product_keyword_mentions} />
                    </td>
                    <td>
                      <DetailCell value={item.competitor_analyses} />
                    </td>
                    <td>
                      <DetailCell value={item.query_result} />
                    </td>
                    <td>
                      <DetailCell
                        value={item.processed_content}
                        label={t`View full text`}
                      />
                    </td>
                    <td>
                      <SourcesCell sources={item.sources} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <Flex justify="end">
            <PaginationControls
              page={page - 1}
              pageSize={PAGE_SIZE}
              itemsLength={visibleItems.length}
              total={items.length}
              showTotal
              onPreviousPage={page > 1 ? () => setPage(page - 1) : null}
              onNextPage={page < totalPages ? () => setPage(page + 1) : null}
            />
          </Flex>
        )}

        <Flex justify="space-between" align="center" gap="sm">
          <Button
            variant="subtle"
            onClick={toggleVisibleResults}
            disabled={visibleItems.length === 0}
          >
            {allVisibleSelected ? cancelPageLabel : selectPageLabel}
          </Button>
          <Flex gap="sm">
            <Button variant="default" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button
              onClick={handleDownload}
              loading={isDownloading}
              disabled={
                isLoadingPreview ||
                isDownloading ||
                selectedCount === 0 ||
                isOverLimit
              }
            >
              {downloadLabel}
            </Button>
          </Flex>
        </Flex>
      </Stack>
    </Modal>
  );
}
