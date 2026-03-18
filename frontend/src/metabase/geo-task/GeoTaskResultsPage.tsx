import cx from "classnames";
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
import { Box, Button, Flex, Icon, Popover, Title } from "metabase/ui";

const EMPTY_RESULTS: GeoResultResponse[] = [];
const PAGE_SIZE_OPTIONS = [20, 50, 100, 200, 500, 1000];

const competitorListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 6,
};

const competitorCardStyle = {
  padding: "8px 10px",
  border: "1px solid var(--mb-color-border)",
  borderRadius: 8,
  background: "var(--mb-color-bg-light)",
};

const competitorNameStyle = {
  fontWeight: 700,
  marginBottom: 6,
  lineHeight: 1.3,
  wordBreak: "break-word" as const,
};

const competitorMetricRowStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 6,
  marginTop: 4,
};

const competitorMetricStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 999,
  background: "white",
  border: "1px solid var(--mb-color-border)",
  fontSize: 12,
  lineHeight: 1.4,
  whiteSpace: "nowrap" as const,
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

function formatSourcesForExport(value: unknown): string {
  if (value == null) {
    return "";
  }

  const items = Array.isArray(value) ? value : [value];
  const sources = items.filter(isSourceLike);

  if (sources.length === 0) {
    return formatCell(value);
  }

  return sources
    .map((source) => {
      const title =
        typeof source.title === "string" && source.title.trim() !== ""
          ? source.title
          : "";
      const url =
        typeof source.url === "string" && source.url.trim() !== ""
          ? source.url
          : "";

      return [title, url].filter(Boolean).join(" - ");
    })
    .filter(Boolean)
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

function ExpandableCell({
  value,
  emptyLabel = "-",
}: {
  value: unknown;
  emptyLabel?: string;
}) {
  if (value == null || value === "") {
    return <span>{emptyLabel}</span>;
  }

  const preview = formatCell(value);
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
          {preview.length > 60 ? preview.slice(0, 60) + "…" : preview}
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

type SourceLike = {
  title?: unknown;
  url?: unknown;
};

function isSourceLike(value: unknown): value is SourceLike {
  return isRecord(value);
}

function SourcesCell({ value }: { value: unknown }) {
  if (value == null) {
    return <span>-</span>;
  }

  const items = Array.isArray(value) ? value : [value];
  const sources = items.filter(isSourceLike);

  if (sources.length === 0) {
    return <span>{formatCell(value)}</span>;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {sources.map((source, index) => {
        const title =
          typeof source.title === "string" && source.title.trim() !== ""
            ? source.title
            : null;
        const url =
          typeof source.url === "string" && source.url.trim() !== ""
            ? source.url
            : null;
        const label = title ?? url ?? "-";

        return url ? (
          <a
            key={`${url}-${index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={CS.link}
            style={{ wordBreak: "break-word" }}
            title={url}
          >
            {index + 1}. {label}
          </a>
        ) : (
          <span key={`${label}-${index}`} style={{ wordBreak: "break-word" }}>
            {index + 1}. {label}
          </span>
        );
      })}
    </div>
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
            </div>
            <div style={competitorMetricRowStyle}>
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

function ResultRow({ result }: { result: GeoResultResponse }) {
  return (
    <tr>
      <td>{result.batch_id}</td>
      <td>{result.query ?? "-"}</td>
      <td>{result.engine ?? "-"}</td>
      <td>{result.visibility_score}</td>
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
      <td
        title={
          result.selling_point_mentions != null
            ? JSON.stringify(result.selling_point_mentions)
            : undefined
        }
      >
        {formatCell(result.selling_point_mentions)}
      </td>
      <td
        title={
          result.product_keyword_mentions != null
            ? JSON.stringify(result.product_keyword_mentions)
            : undefined
        }
      >
        {formatCell(result.product_keyword_mentions)}
      </td>
      <td>
        <CompetitorAnalysesCell metadata={result.metadata} />
      </td>
      <td>
        <SourcesCell value={result.sources} />
      </td>
      <td>{result.collected_at ?? "-"}</td>
      <td>
        <ExpandableCell value={result.processed_content} />
      </td>
      <td>
        <ExpandableCell value={result.query_result} />
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
        [t`Query`]: result.query ?? "",
        [t`Engine`]: result.engine ?? "",
        [t`Visibility`]: result.visibility_score ?? "",
        [t`Sentiment`]: result.sentiment ?? "",
        [t`Brand mentioned`]: formatBoolean(result.brand_mentioned),
        [t`Brand rank`]: result.brand_rank ?? "",
        [t`First recommendation`]: formatBoolean(
          result.is_first_recommendation,
        ),
        [t`In top 3`]: formatBoolean(result.in_top3),
        [t`Selling point mentions`]: formatJsonValue(
          result.selling_point_mentions,
        ),
        [t`Product keyword mentions`]: formatJsonValue(
          result.product_keyword_mentions,
        ),
        [t`Competitor analysis`]: formatCompetitorAnalysesForExport(
          result.metadata,
        ),
        [t`Sources`]: formatSourcesForExport(result.sources),
        [t`Collected at`]: result.collected_at ?? "",
        [t`Processed content`]: formatJsonValue(result.processed_content),
        [t`Query result`]: formatJsonValue(result.query_result),
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
            {t`Back to Geo tasks`}
          </Button>
          <Title order={1}>{t`Task results`}</Title>
        </Flex>
        <Button
          leftSection={<Icon name="download" />}
          variant="default"
          onClick={handleExportExcel}
          disabled={!canExport}
        >
          {t`Export data`}
        </Button>
      </Flex>

      {taskId && (
        <Flex mb="md" gap="md" align="center" wrap="wrap">
          <label className={CS.textSecondary}>{t`Batch ID (optional)`}</label>
          <input
            type="number"
            value={batchId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setBatchId(v === "" ? undefined : parseInt(v, 10));
              setPage(1);
            }}
            placeholder={t`All batches`}
            style={{ width: 120 }}
          />
          <label className={CS.textSecondary}>{t`Page size`}</label>
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
                  <th>{t`Batch`}</th>
                  <th>{t`Query`}</th>
                  <th>{t`Engine`}</th>
                  <th>{t`Visibility`}</th>
                  <th>{t`Sentiment`}</th>
                  <th>{t`Brand mentioned`}</th>
                  <th>{t`Brand rank`}</th>
                  <th>{t`First recommendation`}</th>
                  <th>{t`In top 3`}</th>
                  <th>{t`Selling point mentions`}</th>
                  <th>{t`Product keyword mentions`}</th>
                  <th>{t`Competitor analysis`}</th>
                  <th>{t`Sources`}</th>
                  <th>{t`Collected at`}</th>
                  <th>{t`Processed content`}</th>
                  <th>{t`Query result`}</th>
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
