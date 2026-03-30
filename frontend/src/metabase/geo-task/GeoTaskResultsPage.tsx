import cx from "classnames";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";
import { t } from "ttag";
import * as XLSX from "xlsx";

import type {
  GeoCompetitorAnalysis,
  GeoResultMetadata,
  GeoResultResponse,
} from "metabase/api/geo-task";
import { useGetGeoTaskResultsQuery } from "metabase/api/geo-task";
import { LoadingAndErrorWrapper } from "metabase/common/components/LoadingAndErrorWrapper";
import { PaginationControls } from "metabase/common/components/PaginationControls";
import { useToast } from "metabase/common/hooks";
import AdminS from "metabase/css/admin.module.css";
import CS from "metabase/css/core/index.css";
import { usePageTitle } from "metabase/hooks/use-page-title";
import { useRouter } from "metabase/router";
import { Box, Button, Flex, Icon, Modal, Popover, Title } from "metabase/ui";

const EMPTY_RESULTS: GeoResultResponse[] = [];
const PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 500, 1000];

const competitorListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 6,
};

const competitorCardStyle = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 6,
  padding: "6px 8px",
  border: "1px solid var(--mb-color-border)",
  borderRadius: 999,
  background: "var(--mb-color-bg-light)",
  maxWidth: "100%",
  width: "100%",
};

const competitorMetricRowStyle = {
  display: "inline-flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: 4,
};

const competitorMetricStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "1px 6px",
  borderRadius: 999,
  background: "white",
  border: "1px solid var(--mb-color-border)",
  fontSize: 11,
  lineHeight: 1.4,
  whiteSpace: "nowrap" as const,
};

const competitorNameStyle = {
  fontWeight: 700,
  lineHeight: 1.3,
  wordBreak: "break-word" as const,
};

const mentionListStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 6,
};

const mentionTagStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 999,
  background: "var(--mb-color-bg-light)",
  border: "1px solid var(--mb-color-border)",
  fontSize: 12,
  lineHeight: 1.4,
  wordBreak: "break-word" as const,
};

const queryResultListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 4,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function formatCell(value: unknown): string {
  if (value == null) {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    try {
      const s = JSON.stringify(value);
      return s.length > 80 ? s.slice(0, 80) + "…" : s;
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function formatBoolean(value: boolean | null | undefined): string {
  if (value == null) {
    return "-";
  }

  return value ? t`Yes` : t`No`;
}

function formatJsonValue(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function formatCollectedAt(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const formatted = dayjs(value);
  return formatted.isValid() ? formatted.format("YYYY/MM/DD HH:mm") : value;
}

function getMentionEntries(
  value: unknown,
): Array<{ keyword: string; mentioned: boolean | null }> {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).map(([keyword, mentioned]) => ({
    keyword,
    mentioned: typeof mentioned === "boolean" ? mentioned : null,
  }));
}

function formatMentionValueForExport(value: unknown): string {
  const entries = getMentionEntries(value);

  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(({ keyword, mentioned }) => {
      const label = mentioned == null ? "-" : mentioned ? t`Yes` : t`No`;
      return `${keyword}: ${label}`;
    })
    .join("; ");
}

function getCompetitorAnalyses(
  metadata: GeoResultMetadata | null,
): GeoCompetitorAnalysis[] {
  if (!isRecord(metadata)) {
    return [];
  }

  const value = metadata.competitor_analyses;
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function getProductMentionSummary(
  mentions: Record<string, boolean> | undefined,
): string {
  if (!mentions || Object.keys(mentions).length === 0) {
    return "-";
  }

  return Object.values(mentions).some(Boolean) ? t`Yes` : t`No`;
}

function getProductMentionTitle(
  mentions: Record<string, boolean> | undefined,
): string | undefined {
  if (!mentions || Object.keys(mentions).length === 0) {
    return undefined;
  }

  return Object.entries(mentions)
    .map(([keyword, mentioned]) => `${keyword}: ${mentioned ? t`Yes` : t`No`}`)
    .join(", ");
}

function MentionSummaryCell({ value }: { value: unknown }) {
  const entries = getMentionEntries(value);

  if (entries.length === 0) {
    return <span>-</span>;
  }

  const mentionedKeywords = entries.filter((entry) => entry.mentioned);
  const title = entries
    .map(({ keyword, mentioned }) => {
      const label = mentioned == null ? "-" : mentioned ? t`Yes` : t`No`;
      return `${keyword}: ${label}`;
    })
    .join("\n");

  if (mentionedKeywords.length === 0) {
    return (
      <span title={title} className={CS.textSecondary}>
        {t`None mentioned`}
      </span>
    );
  }

  return (
    <div style={mentionListStyle} title={title}>
      {mentionedKeywords.map(({ keyword }) => (
        <span key={keyword} style={mentionTagStyle}>
          {keyword}
        </span>
      ))}
    </div>
  );
}

function formatCompetitorAnalysesForExport(
  metadata: GeoResultMetadata | null,
): string {
  const analyses = getCompetitorAnalyses(metadata);

  if (analyses.length === 0) {
    return "";
  }

  return analyses
    .map((analysis, index) => {
      const name = analysis.name?.trim() || `${t`Competitor`} ${index + 1}`;

      return [
        `name=${name}`,
        `brand_mentioned=${formatBoolean(
          analysis.brand_mentions?.mentioned ?? analysis.mentioned ?? null,
        )}`,
        `rank=${analysis.rank ?? "-"}`,
        `in_top3=${formatBoolean(analysis.in_top3)}`,
        `product_mentioned=${getProductMentionSummary(
          analysis.product_keyword_mentions,
        )}`,
      ].join(", ");
    })
    .join(" | ");
}

function MetricTag({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <span style={competitorMetricStyle}>
      {label}: {value}
    </span>
  );
}

function formatExpandedValue(value: unknown): string {
  if (value == null) {
    return "-";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function formatQueryResultPreview(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      if (!isRecord(item)) {
        return formatCell(item);
      }

      const name =
        typeof item.item === "string" && item.item.trim() !== ""
          ? item.item.trim()
          : typeof item.name === "string" && item.name.trim() !== ""
            ? item.name.trim()
            : null;
      const rank = typeof item.rank === "number" ? item.rank : null;

      if (name && rank != null) {
        return `${rank}. ${name}`;
      }

      if (name) {
        return `${index + 1}. ${name}`;
      }

      return formatCell(item);
    });
  }

  if (isRecord(value)) {
    return Object.entries(value).map(([key, itemValue]) => {
      const formattedValue =
        typeof itemValue === "object"
          ? formatCell(itemValue)
          : String(itemValue);
      return `${key}: ${formattedValue}`;
    });
  }

  if (value == null || value === "") {
    return [];
  }

  return [String(value)];
}

function ExpandableCell({
  value,
  emptyLabel = "-",
  buttonLabel = t`View details`,
}: {
  value: unknown;
  emptyLabel?: string;
  buttonLabel?: string;
}) {
  if (value == null || value === "") {
    return <span>{emptyLabel}</span>;
  }

  const content = formatExpandedValue(value);

  return (
    <Popover position="bottom-start" withArrow shadow="md" width={520}>
      <Popover.Target>
        <button
          type="button"
          className={CS.link}
          style={{
            padding: 0,
            border: 0,
            background: "transparent",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          {buttonLabel}
        </button>
      </Popover.Target>
      <Popover.Dropdown>
        <div
          style={{
            maxWidth: 520,
            maxHeight: 360,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {content}
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}

function CompetitorAnalysesCell({
  metadata,
}: {
  metadata: GeoResultMetadata | null;
}) {
  const analyses = getCompetitorAnalyses(metadata);

  if (analyses.length === 0) {
    return <span>-</span>;
  }

  return (
    <div style={competitorListStyle}>
      {analyses.map((analysis, index) => {
        const name = analysis.name?.trim() || `${t`Competitor`} ${index + 1}`;
        const brandMentioned =
          analysis.brand_mentions?.mentioned ?? analysis.mentioned ?? null;
        const productMentionTitle = getProductMentionTitle(
          analysis.product_keyword_mentions,
        );

        return (
          <div
            key={`${name}-${index}`}
            title={productMentionTitle}
            style={competitorCardStyle}
          >
            <div style={competitorNameStyle}>{name}</div>
            <div style={competitorMetricRowStyle}>
              <MetricTag
                label="品牌提及"
                value={formatBoolean(brandMentioned)}
              />
              <MetricTag label="排名" value={analysis.rank ?? "-"} />
              <MetricTag label="前3" value={formatBoolean(analysis.in_top3)} />
              <MetricTag
                label="产品提及"
                value={getProductMentionSummary(
                  analysis.product_keyword_mentions,
                )}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QueryResultCell({ value }: { value: unknown }) {
  const lines = formatQueryResultPreview(value);

  if (lines.length === 0) {
    return <span>-</span>;
  }

  return (
    <div style={queryResultListStyle}>
      {lines.slice(0, 5).map((line, index) => (
        <div key={`${line}-${index}`} style={{ wordBreak: "break-word" }}>
          {line}
        </div>
      ))}
      {lines.length > 5 && (
        <ExpandableCell value={value} buttonLabel={t`View more`} />
      )}
    </div>
  );
}

function ProcessedContentCell({ value }: { value: unknown }) {
  const [isOpen, setIsOpen] = useState(false);

  if (value == null || value === "") {
    return <span>-</span>;
  }

  return (
    <>
      <Button
        variant="subtle"
        size="compact-sm"
        onClick={() => setIsOpen(true)}
      >
        {t`查看全文`}
      </Button>
      <Modal
        opened={isOpen}
        onClose={() => setIsOpen(false)}
        title={t`Processed content`}
        size="xl"
      >
        <div
          style={{
            maxHeight: "70vh",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {formatExpandedValue(value)}
        </div>
      </Modal>
    </>
  );
}

function ResultRow({ result }: { result: GeoResultResponse }) {
  return (
    <tr>
      <td>{result.batch_id}</td>
      <td>{formatCollectedAt(result.collected_at)}</td>
      <td>{result.query ?? "-"}</td>
      <td>{result.engine ?? "-"}</td>
      <td>{result.sentiment}</td>
      <td>{result.brand_mentioned ? t`Yes` : t`No`}</td>
      <td>{result.brand_rank ?? "-"}</td>
      <td>
        {result.is_first_recommendation == null
          ? "-"
          : result.is_first_recommendation
            ? t`Yes`
            : t`No`}
      </td>
      <td>{result.in_top3 == null ? "-" : result.in_top3 ? t`Yes` : t`No`}</td>
      <td>
        <MentionSummaryCell value={result.selling_point_mentions} />
      </td>
      <td>
        <MentionSummaryCell value={result.product_keyword_mentions} />
      </td>
      <td>
        <CompetitorAnalysesCell metadata={result.metadata} />
      </td>
      <td>
        <QueryResultCell value={result.query_result} />
      </td>
      <td>
        <ProcessedContentCell value={result.processed_content} />
      </td>
    </tr>
  );
}

export const GeoTaskResultsPage = () => {
  const { params, router } = useRouter();
  const taskId = params?.taskId ?? "";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [batchId, setBatchId] = useState<number | undefined>(undefined);
  const [sendToast] = useToast();

  const { data, isLoading, error } = useGetGeoTaskResultsQuery(
    {
      taskId,
      page,
      page_size: pageSize,
      ...(batchId != null && { batch_id: batchId }),
    },
    { skip: !taskId },
  );

  usePageTitle(t`Task results`);

  const goBack = () => {
    router.replace({ pathname: "/geo-task", query: {} });
  };

  const items = data?.items ?? EMPTY_RESULTS;
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;
  const shouldShowPagination =
    total > 0 && (totalPages > 1 || total > pageSize);
  const exportRows = useMemo(
    () =>
      items.map((result) => ({
        [t`Batch`]: result.batch_id,
        [t`Collected at`]: formatCollectedAt(result.collected_at),
        [t`Query`]: result.query ?? "",
        [t`Engine`]: result.engine ?? "",
        [t`Sentiment`]: result.sentiment ?? "",
        [t`Brand mentioned`]: formatBoolean(result.brand_mentioned),
        [t`Brand rank`]: result.brand_rank ?? "",
        [t`First recommendation`]: formatBoolean(
          result.is_first_recommendation,
        ),
        [t`In top 3`]: formatBoolean(result.in_top3),
        [t`Selling point mentions`]: formatMentionValueForExport(
          result.selling_point_mentions,
        ),
        [t`Product keyword mentions`]: formatMentionValueForExport(
          result.product_keyword_mentions,
        ),
        [t`Competitor analysis`]: formatCompetitorAnalysesForExport(
          result.metadata,
        ),
        [t`Query result`]: formatJsonValue(result.query_result),
        [t`Processed content`]: formatJsonValue(result.processed_content),
      })),
    [items],
  );
  const canExport = exportRows.length > 0 && !isLoading;

  const handleExportExcel = useCallback(() => {
    if (!canExport) {
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t`Task results`);

    const fileNameParts = ["task-results", taskId];
    if (batchId != null) {
      fileNameParts.push(`batch-${batchId}`);
    }
    fileNameParts.push(`page-${page}`);

    XLSX.writeFile(workbook, `${fileNameParts.join("-")}.xlsx`);
    sendToast({
      message: t`Current page data exported successfully`,
      icon: "check",
    });
  }, [batchId, canExport, exportRows, page, sendToast, taskId]);

  return (
    <Box p="xl" style={{ maxWidth: "100%", width: "100%", margin: 0 }}>
      <Flex justify="space-between" align="center" mb="lg" wrap="wrap" gap="md">
        <Flex align="center" gap="sm">
          <Button
            leftSection={<Icon name="chevronleft" />}
            variant="subtle"
            onClick={goBack}
          >
            {t`返回 GEO 任务`}
          </Button>
          <Title order={1}>{t`任务结果`}</Title>
        </Flex>
        <Button
          leftSection={<Icon name="download" />}
          variant="default"
          onClick={handleExportExcel}
          disabled={!canExport}
        >
          {t`导出数据`}
        </Button>
      </Flex>

      {taskId && (
        <Flex mb="md" gap="md" align="center" wrap="wrap">
          <label className={CS.textSecondary}>{t`批次 ID（可选）`}</label>
          <input
            type="number"
            value={batchId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setBatchId(v === "" ? undefined : parseInt(v, 10));
              setPage(1);
            }}
            placeholder={t`全部批次`}
            style={{ width: 120 }}
          />
          <label className={CS.textSecondary}>{t`每页条数`}</label>
          <select
            value={String(pageSize)}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(1);
            }}
            style={{ width: 100 }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </Flex>
      )}

      <LoadingAndErrorWrapper loading={isLoading} error={error} noWrapper>
        <div className={cx(CS.bordered, CS.rounded, CS.full)}>
          {items.length === 0 ? (
            <div className={cx(CS.flex, CS.layoutCentered, CS.p4)}>
              <p className={CS.textSecondary}>{t`No results found`}</p>
            </div>
          ) : (
            <table className={AdminS.ContentTable}>
              <thead>
                <tr>
                  <th>{t`批次`}</th>
                  <th>{t`采集时间`}</th>
                  <th>{t`查询词`}</th>
                  <th>{t`引擎`}</th>
                  <th>{t`情感值`}</th>
                  <th>{t`品牌提及`}</th>
                  <th>{t`品牌排名`}</th>
                  <th>{t`首推`}</th>
                  <th>{t`是否前 3`}</th>
                  <th>{t`卖点提及`}</th>
                  <th>{t`产品关键词提及`}</th>
                  <th>{t`竞品分析`}</th>
                  <th>{t`查询结果`}</th>
                  <th>{t`处理内容`}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((result) => (
                  <ResultRow key={result.id} result={result} />
                ))}
              </tbody>
            </table>
          )}
          {shouldShowPagination && (
            <div
              style={{
                borderTop: "1px solid var(--mb-color-border)",
                padding: "1rem",
              }}
            >
              <Flex justify="end">
                <PaginationControls
                  page={page - 1}
                  pageSize={pageSize}
                  itemsLength={items.length}
                  total={total}
                  showTotal
                  onPreviousPage={page > 1 ? () => setPage(page - 1) : null}
                  onNextPage={
                    (totalPages > 0 && page < totalPages) ||
                    (totalPages === 0 && items.length === pageSize)
                      ? () => setPage(page + 1)
                      : null
                  }
                />
              </Flex>
            </div>
          )}
        </div>
      </LoadingAndErrorWrapper>
    </Box>
  );
};
