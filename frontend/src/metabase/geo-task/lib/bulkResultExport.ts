import { t } from "ttag";

import type {
  GeoTaskExportItem,
  GeoTaskExportSource,
} from "metabase/api/geo-task";

const EXCEL_CELL_MAX_LENGTH = 32767;
const FORMULA_PREFIX_PATTERN = /^[=+\-@]/;

function safeExcelText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const truncated = value.slice(0, EXCEL_CELL_MAX_LENGTH);
  return FORMULA_PREFIX_PATTERN.test(truncated) ? `'${truncated}` : truncated;
}

function formatBoolean(value: boolean | null): string {
  if (value == null) {
    return "";
  }
  return value ? t`Yes` : t`No`;
}

function formatStructuredValue(value: unknown): string {
  if (value == null || value === "") {
    return "";
  }
  if (typeof value === "string") {
    return safeExcelText(value);
  }
  try {
    return safeExcelText(JSON.stringify(value));
  } catch {
    return safeExcelText(String(value));
  }
}

export function formatSourcesForExport(sources: GeoTaskExportSource[]): string {
  const formatted = sources
    .map((source, index) => {
      const title = safeExcelText(source.title) || t`Untitled source`;
      const url = safeExcelText(source.url);
      return `${index + 1}. ${title}${url ? `\n${url}` : ""}`;
    })
    .join("\n\n");

  return formatted.slice(0, EXCEL_CELL_MAX_LENGTH);
}

export function buildBulkResultExportRows(items: GeoTaskExportItem[]) {
  return items.map((item) => ({
    [t`Result ID`]: safeExcelText(item.id),
    [t`Task ID`]: safeExcelText(item.geo_task_id),
    [t`Task Name`]: safeExcelText(item.task_name),
    [t`Product Brand`]: safeExcelText(item.product_brand),
    [t`Query`]: safeExcelText(item.query),
    [t`AI Platform`]: safeExcelText(item.engine),
    [t`AI Mode`]: safeExcelText(item.ai_mode),
    [t`Batch ID`]: item.batch_id ?? "",
    [t`Execution Time`]: safeExcelText(item.collected_at),
    [t`Sentiment`]: item.sentiment,
    [t`Brand Mentioned`]: formatBoolean(item.brand_mentioned),
    [t`Brand Rank`]: item.brand_rank ?? "",
    [t`First Recommendation`]: formatBoolean(item.is_first_recommendation),
    [t`Top 3`]: formatBoolean(item.in_top3),
    [t`Selling Point Mentions`]: formatStructuredValue(
      item.selling_point_mentions,
    ),
    [t`Product Keyword Mentions`]: formatStructuredValue(
      item.product_keyword_mentions,
    ),
    [t`Competitor Analysis`]: formatStructuredValue(item.competitor_analyses),
    [t`Query Result`]: formatStructuredValue(item.query_result),
    [t`Processed Content`]: safeExcelText(item.processed_content),
    [t`Visibility Score`]: item.visibility_score,
    [t`Accuracy`]: item.accuracy,
    [t`Source Count`]: item.sources.length,
    [t`Sources`]: formatSourcesForExport(item.sources),
  }));
}

export function buildBulkResultExportFileName(
  startDate: string,
  endDate: string,
): string {
  if (!startDate && !endDate) {
    return "geo-task-results-all.xlsx";
  }
  const compactStart = startDate.replaceAll("-", "");
  const compactEnd = endDate.replaceAll("-", "");
  return `geo-task-results-${compactStart || "earliest"}-${
    compactEnd || "latest"
  }.xlsx`;
}
