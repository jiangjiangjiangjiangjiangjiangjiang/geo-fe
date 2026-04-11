import cx from "classnames";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { t } from "ttag";

import type {
  GeoTaskDashboardMatrix,
  GeoTaskDashboardMatrixCell,
  GeoTaskDashboardMentionTrend,
  GeoTaskDashboardMentionTrendSeries,
  GeoTaskDashboardSentimentDistribution,
  GeoTaskDashboardSummary,
  GeoTaskDashboardTopSources,
} from "metabase/api/geo-task";
import {
  useGetGeoTaskDashboardMatrixQuery,
  useGetGeoTaskDashboardMentionTrendQuery,
  useGetGeoTaskDashboardSentimentDistributionQuery,
  useGetGeoTaskDashboardSummaryQuery,
  useGetGeoTaskDashboardTopSourcesQuery,
} from "metabase/api/geo-task";
import { LoadingAndErrorWrapper } from "metabase/common/components/LoadingAndErrorWrapper";
import { useToast } from "metabase/common/hooks";
import CS from "metabase/css/core/index.css";
import { usePageTitle } from "metabase/hooks/use-page-title";
import { useRouter } from "metabase/router";
import { Box, Button, Flex, Icon, Title } from "metabase/ui";

type DateRange = {
  start_date: string;
  end_date: string;
};

type MatrixCellStatus =
  | "mentioned_with_rank"
  | "mentioned_without_rank"
  | "not_mentioned";

const MAX_TOP_SOURCES = 10;
const CHART_HEIGHT = 220;
const CHART_WIDTH = 760;
const CHART_PADDING = { top: 20, right: 80, bottom: 32, left: 24 };
const PRODUCT_BRAND_COLOR = "var(--mb-color-brand)";
const COMPETITOR_COLORS = [
  "var(--mb-color-success)",
  "var(--mb-color-warning)",
  "var(--mb-color-error)",
  "var(--mb-color-text-light)",
  "var(--mb-color-brand)",
];

const pageSectionStyle = {
  border: "1px solid var(--mb-color-border)",
  borderRadius: 20,
  background: "white",
  padding: 24,
  minHeight: "100%",
};

const metricCardStyle = {
  borderRadius: 18,
  padding: 24,
  background: "var(--mb-color-bg-light)",
  border: "1px solid var(--mb-color-border)",
  minHeight: 168,
};

const topFilterChipStyle = {
  borderRadius: 16,
  border: "1px solid var(--mb-color-brand)",
  background: "var(--mb-color-brand-alpha-04)",
  color: "var(--mb-color-brand)",
  padding: "10px 16px",
  fontWeight: 600,
};

const formControlStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 6,
};

const inputStyle = {
  minWidth: 160,
  height: 40,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid var(--mb-color-border)",
  background: "white",
};

function getDefaultDateRange(): DateRange {
  const endDate = dayjs().format("YYYY-MM-DD");
  const startDate = dayjs().subtract(29, "day").format("YYYY-MM-DD");

  return {
    start_date: startDate,
    end_date: endDate,
  };
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm") : value;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatRatio(value: number | null | undefined): string {
  if (value == null) {
    return "-";
  }

  return value.toFixed(1);
}

function getSentimentText(label: "positive" | "neutral" | "negative"): string {
  if (label === "positive") {
    return "正面";
  }
  if (label === "negative") {
    return "负面";
  }
  return "中性";
}

function getSentimentColor(label: "positive" | "neutral" | "negative"): string {
  if (label === "positive") {
    return "var(--mb-color-success)";
  }
  if (label === "negative") {
    return "var(--mb-color-error)";
  }
  return "var(--mb-color-text-medium)";
}

function getMatrixCellColor(status: MatrixCellStatus): {
  text: string;
  background: string;
  dot: string;
} {
  if (status === "mentioned_with_rank") {
    return {
      text: "var(--mb-color-success)",
      background: "color-mix(in srgb, var(--mb-color-success), white 84%)",
      dot: "var(--mb-color-success)",
    };
  }

  if (status === "mentioned_without_rank") {
    return {
      text: "var(--mb-color-error)",
      background: "color-mix(in srgb, var(--mb-color-error), white 88%)",
      dot: "var(--mb-color-error)",
    };
  }

  return {
    text: "var(--mb-color-text-medium)",
    background: "transparent",
    dot: "var(--mb-color-text-medium)",
  };
}

function getSeriesColor(
  series: GeoTaskDashboardMentionTrendSeries,
  index: number,
): string {
  if (series.brand_role === "product_brand") {
    return PRODUCT_BRAND_COLOR;
  }

  return COMPETITOR_COLORS[index % COMPETITOR_COLORS.length];
}

function buildMatrixLookup(cells: GeoTaskDashboardMatrixCell[]) {
  return new Map(
    cells.map((cell) => [`${cell.platform_key}::${cell.brand_name}`, cell]),
  );
}

function getFirstError(errors: unknown[]): unknown {
  return errors.find(Boolean);
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div style={metricCardStyle}>
      <div
        style={{
          color: "var(--mb-color-text-medium)",
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 50, fontWeight: 700, lineHeight: 1 }}>
        {value}
      </div>
      {description ? (
        <div
          style={{
            color: "var(--mb-color-text-medium)",
            marginTop: 14,
            fontSize: 16,
            lineHeight: 1.5,
            whiteSpace: "pre-line" as const,
          }}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}

function MatrixStatusCell({ cell }: { cell?: GeoTaskDashboardMatrixCell }) {
  if (!cell) {
    return <span style={{ color: "var(--mb-color-text-medium)" }}>-</span>;
  }

  if (cell.status === "not_mentioned") {
    return (
      <span style={{ color: "var(--mb-color-text-medium)", fontWeight: 600 }}>
        {t`未提及`}
      </span>
    );
  }

  const colors = getMatrixCellColor(cell.status);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 58,
        padding: "4px 10px",
        borderRadius: 8,
        background: colors.background,
        color: colors.text,
        fontWeight: 700,
      }}
      title={`${cell.platform_name} / ${cell.brand_name}`}
    >
      {cell.display_text}
    </span>
  );
}

function MatrixSection({ matrix }: { matrix: GeoTaskDashboardMatrix }) {
  const lookup = useMemo(() => buildMatrixLookup(matrix.cells), [matrix.cells]);

  return (
    <div style={pageSectionStyle}>
      <Title order={3} mb="lg">
        {t`平台 × 品牌提及矩阵`}
      </Title>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 640,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  padding: "0 14px 12px 0",
                  borderBottom: "1px solid var(--mb-color-border)",
                }}
              >
                {t`平台`}
              </th>
              {matrix.brands.map((brand) => (
                <th
                  key={brand.brand_name}
                  style={{
                    textAlign: "center",
                    padding: "0 10px 12px",
                    borderBottom: "1px solid var(--mb-color-border)",
                    minWidth: 120,
                  }}
                >
                  {brand.brand_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.platforms.map((platform) => (
              <tr key={platform.platform_key}>
                <td
                  style={{
                    padding: "14px 14px 14px 0",
                    borderBottom: "1px solid var(--mb-color-border)",
                    fontWeight: 600,
                  }}
                >
                  {platform.platform_name}
                </td>
                {matrix.brands.map((brand) => (
                  <td
                    key={`${platform.platform_key}-${brand.brand_name}`}
                    style={{
                      padding: "14px 10px",
                      borderBottom: "1px solid var(--mb-color-border)",
                      textAlign: "center",
                    }}
                  >
                    <MatrixStatusCell
                      cell={lookup.get(
                        `${platform.platform_key}::${brand.brand_name}`,
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Flex mt="lg" gap="lg" wrap="wrap">
        {matrix.legend.map((item) => {
          const colors = getMatrixCellColor(item.status);

          return (
            <Flex key={item.status} align="center" gap="xs">
              <span style={{ color: colors.dot, fontSize: 18 }}>•</span>
              <span style={{ color: colors.text, fontWeight: 600 }}>
                {item.label}
              </span>
            </Flex>
          );
        })}
      </Flex>
    </div>
  );
}

function TopSourcesSection({
  topSources,
}: {
  topSources: GeoTaskDashboardTopSources;
}) {
  const maxCount = Math.max(
    ...topSources.items.map((item) => item.reference_count),
    1,
  );

  return (
    <div style={pageSectionStyle}>
      <Title order={3} mb="lg">
        {t`Top 引用来源`}
      </Title>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {topSources.items.length === 0 ? (
          <div className={CS.textSecondary}>{t`暂无引用来源数据`}</div>
        ) : (
          topSources.items.map((item) => (
            <div key={`${item.source_domain}-${item.source_name}`}>
              <Flex
                justify="space-between"
                align="center"
                gap="md"
                style={{ marginBottom: 6 }}
              >
                <div
                  style={{ fontWeight: 600, wordBreak: "break-word" as const }}
                >
                  {item.source_name}
                </div>
                <div style={{ color: "var(--mb-color-text-medium)" }}>
                  {item.reference_count}
                </div>
              </Flex>
              <div
                style={{
                  width: "100%",
                  height: 26,
                  borderRadius: 8,
                  background: "var(--mb-color-bg-medium)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(item.reference_count / maxCount) * 100}%`,
                    height: "100%",
                    borderRadius: 8,
                    background: "var(--mb-color-brand)",
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "var(--mb-color-text-medium)",
                  fontSize: 13,
                }}
              >
                {item.source_domain} · {formatPercent(item.percentage)}
              </div>
            </div>
          ))
        )}
      </div>
      <div
        style={{
          marginTop: 20,
          color: "var(--mb-color-text-medium)",
          fontSize: 13,
        }}
      >
        {t`总引用次数：`}
        {topSources.total_reference_count}
      </div>
    </div>
  );
}

function buildTrendPath(
  points: GeoTaskDashboardMentionTrendSeries["points"],
  maxValue: number,
): string {
  if (points.length === 0) {
    return "";
  }

  const usableWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const usableHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  return points
    .map((point, index) => {
      const x =
        CHART_PADDING.left +
        (index / Math.max(points.length - 1, 1)) * usableWidth;
      const y =
        CHART_PADDING.top +
        usableHeight -
        (point.mention_count / Math.max(maxValue, 1)) * usableHeight;

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function getVisibleAxisLabelIndexes(length: number, maxLabels = 6) {
  if (length <= 0) {
    return new Set<number>();
  }

  if (length <= maxLabels) {
    return new Set(Array.from({ length }, (_, index) => index));
  }

  const indexes = new Set<number>([0, length - 1]);
  const segments = maxLabels - 1;

  for (let step = 1; step < segments; step++) {
    indexes.add(Math.round((step * (length - 1)) / segments));
  }

  return indexes;
}

function TrendSection({ trend }: { trend: GeoTaskDashboardMentionTrend }) {
  const hasMentionData = trend.series.some((item) =>
    item.points.some((point) => point.mention_count > 0),
  );
  const maxValue = Math.max(
    ...trend.series.flatMap((item) =>
      item.points.map((point) => point.mention_count),
    ),
    1,
  );
  const axisLabels = trend.x_axis;
  const visibleAxisLabelIndexes = getVisibleAxisLabelIndexes(axisLabels.length);

  return (
    <div style={pageSectionStyle}>
      <Title order={3} mb="lg">
        {t`品牌提及趋势`}
      </Title>
      {trend.series.length === 0 ? (
        <div className={CS.textSecondary}>{t`暂无趋势数据`}</div>
      ) : !hasMentionData ? (
        <div className={CS.textSecondary}>
          {t`当前时间区间内暂无品牌提及数据`}
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            style={{ width: "100%", height: "auto", display: "block" }}
          >
            <line
              x1={CHART_PADDING.left}
              y1={CHART_HEIGHT - CHART_PADDING.bottom}
              x2={CHART_WIDTH - CHART_PADDING.right}
              y2={CHART_HEIGHT - CHART_PADDING.bottom}
              stroke="var(--mb-color-border)"
              strokeWidth="1"
            />
            {axisLabels.map((label, index) => {
              const usableWidth =
                CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
              const x =
                CHART_PADDING.left +
                (index / Math.max(axisLabels.length - 1, 1)) * usableWidth;

              if (!visibleAxisLabelIndexes.has(index)) {
                return null;
              }

              return (
                <text
                  key={label}
                  x={x}
                  y={CHART_HEIGHT - 8}
                  textAnchor="middle"
                  fill="var(--mb-color-text-medium)"
                  fontSize="13"
                >
                  {dayjs(label).format("M/D")}
                </text>
              );
            })}
            {trend.series.map((series, index) => {
              const color = getSeriesColor(series, index);
              const path = buildTrendPath(series.points, maxValue);
              const lastPoint = series.points[series.points.length - 1];
              const usableWidth =
                CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
              const usableHeight =
                CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
              const lastX = CHART_PADDING.left + usableWidth;
              const lastY =
                CHART_PADDING.top +
                usableHeight -
                (lastPoint.mention_count / Math.max(maxValue, 1)) *
                  usableHeight;

              return (
                <g key={series.brand_name}>
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeDasharray={
                      series.brand_role === "product_brand" ? undefined : "7 6"
                    }
                    strokeLinecap="round"
                  />
                  <circle cx={lastX} cy={lastY} r="5" fill={color} />
                </g>
              );
            })}
          </svg>
          <Flex mt="md" gap="md" wrap="wrap">
            {trend.series.map((series, index) => {
              const color = getSeriesColor(series, index);

              return (
                <Flex key={series.brand_name} align="center" gap="xs">
                  <span style={{ color, fontSize: 18 }}>•</span>
                  <span>{series.brand_name}</span>
                </Flex>
              );
            })}
          </Flex>
        </>
      )}
    </div>
  );
}

function SentimentSection({
  sentiment,
}: {
  sentiment: GeoTaskDashboardSentimentDistribution;
}) {
  return (
    <div style={pageSectionStyle}>
      <Title order={3} mb="lg">
        {t`情感倾向分布`}
      </Title>
      <Flex gap="sm" mb="lg">
        <div
          style={{
            flex: sentiment.overall.positive_ratio,
            minWidth: 0,
            borderRadius: 8,
            padding: "10px 12px",
            background:
              "color-mix(in srgb, var(--mb-color-success), white 84%)",
            color: "var(--mb-color-success)",
            fontWeight: 700,
            textAlign: "center" as const,
          }}
        >
          {t`正面`} {formatPercent(sentiment.overall.positive_ratio)}
        </div>
        <div
          style={{
            flex: sentiment.overall.neutral_ratio,
            minWidth: 0,
            borderRadius: 8,
            padding: "10px 12px",
            background: "var(--mb-color-bg-medium)",
            color: "var(--mb-color-text-medium)",
            fontWeight: 700,
            textAlign: "center" as const,
          }}
        >
          {t`中性`} {formatPercent(sentiment.overall.neutral_ratio)}
        </div>
        <div
          style={{
            flex: sentiment.overall.negative_ratio,
            minWidth: 0,
            borderRadius: 8,
            padding: "10px 12px",
            background: "color-mix(in srgb, var(--mb-color-error), white 88%)",
            color: "var(--mb-color-error)",
            fontWeight: 700,
            textAlign: "center" as const,
          }}
        >
          {t`负面`} {formatPercent(sentiment.overall.negative_ratio)}
        </div>
      </Flex>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {sentiment.by_platform.length === 0 ? (
          <div className={CS.textSecondary}>{t`暂无平台情感数据`}</div>
        ) : (
          sentiment.by_platform.map((item) => (
            <Flex
              key={item.platform_key}
              justify="space-between"
              align="center"
              gap="md"
            >
              <div>{item.platform_name}</div>
              <div
                style={{
                  color: getSentimentColor(item.sentiment_label),
                  fontWeight: 700,
                }}
              >
                {getSentimentText(item.sentiment_label)} ·{" "}
                {item.sentiment_score.toFixed(2)}
              </div>
            </Flex>
          ))
        )}
      </div>
    </div>
  );
}

function DashboardSummaryHeader({
  summary,
  draftDateRange,
  onDraftDateRangeChange,
  onApplyDateRange,
}: {
  summary: GeoTaskDashboardSummary;
  draftDateRange: DateRange;
  onDraftDateRangeChange: (next: DateRange) => void;
  onApplyDateRange: () => void;
}) {
  return (
    <Flex
      justify="space-between"
      align="flex-start"
      gap="lg"
      wrap="wrap"
      mb="xl"
    >
      <div>
        <Title order={1}>{t`GEO 监测看板`}</Title>
        <div
          style={{
            marginTop: 8,
            color: "var(--mb-color-text-medium)",
          }}
        >
          {t`任务名称：`}
          {summary.task.task_name || "-"} · {t`最近执行：`}
          {formatDateTime(summary.task.last_run_at)}
        </div>
      </div>
      <Flex gap="sm" wrap="wrap" align="flex-end">
        <div style={topFilterChipStyle}>
          {t`查询词:`} {summary.task.query_text || "-"}
        </div>
        <div style={formControlStyle}>
          <label style={{ fontSize: 13, color: "var(--mb-color-text-medium)" }}>
            {t`开始日期`}
          </label>
          <input
            type="date"
            value={draftDateRange.start_date}
            onChange={(event) =>
              onDraftDateRangeChange({
                ...draftDateRange,
                start_date: event.target.value,
              })
            }
            style={inputStyle}
          />
        </div>
        <div style={formControlStyle}>
          <label style={{ fontSize: 13, color: "var(--mb-color-text-medium)" }}>
            {t`结束日期`}
          </label>
          <input
            type="date"
            value={draftDateRange.end_date}
            onChange={(event) =>
              onDraftDateRangeChange({
                ...draftDateRange,
                end_date: event.target.value,
              })
            }
            style={inputStyle}
          />
        </div>
        <Button
          onClick={onApplyDateRange}
          variant="outline"
          style={{ height: 40 }}
        >
          {t`查询`}
        </Button>
        <div
          style={{
            color: "var(--mb-color-text-medium)",
            fontSize: 13,
            paddingBottom: 2,
          }}
        >
          {t`当前区间：`}
          {summary.date_range.start_date} ~ {summary.date_range.end_date}
        </div>
      </Flex>
    </Flex>
  );
}

function DashboardKpis({ summary }: { summary: GeoTaskDashboardSummary }) {
  const { metrics } = summary;

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        marginBottom: 24,
      }}
    >
      <MetricCard
        label="品牌总提及次数"
        value={String(metrics.brand_mention_count)}
        description={
          metrics.brand_mention_count_change == null
            ? "较上周期无对比数据"
            : `较上周期 ${metrics.brand_mention_count_change >= 0 ? "+" : ""}${metrics.brand_mention_count_change}`
        }
      />
      <MetricCard
        label="覆盖平台数"
        value={`${metrics.covered_platform_count} / ${metrics.total_platform_count}`}
        description={metrics.top3_platforms.join("、") || "暂无平台"}
      />
      <MetricCard
        label="平均排名"
        value={formatRatio(metrics.average_rank)}
        description={
          metrics.best_rank == null
            ? "最佳排名：-"
            : `最佳排名：第 ${metrics.best_rank}\n(${metrics.best_rank_platforms.join("、") || "-"})`
        }
      />
      <MetricCard
        label="首推平台数"
        value={String(metrics.first_recommendation_platform_count)}
        description={
          metrics.first_recommendation_platforms.join("、") || "暂无首推平台"
        }
      />
    </div>
  );
}

export const GeoTaskDashboardPage = () => {
  const { params, router } = useRouter();
  const taskId = params?.taskId ?? "";
  const [sendToast] = useToast();
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [draftDateRange, setDraftDateRange] =
    useState<DateRange>(getDefaultDateRange);

  const queryArgs = useMemo(
    () => ({
      taskId,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
    }),
    [dateRange.end_date, dateRange.start_date, taskId],
  );

  const summaryQuery = useGetGeoTaskDashboardSummaryQuery(queryArgs, {
    skip: !taskId,
  });
  const matrixQuery = useGetGeoTaskDashboardMatrixQuery(queryArgs, {
    skip: !taskId,
  });
  const topSourcesQuery = useGetGeoTaskDashboardTopSourcesQuery(
    {
      ...queryArgs,
      limit: MAX_TOP_SOURCES,
    },
    { skip: !taskId },
  );
  const trendQuery = useGetGeoTaskDashboardMentionTrendQuery(queryArgs, {
    skip: !taskId,
  });
  const sentimentQuery = useGetGeoTaskDashboardSentimentDistributionQuery(
    queryArgs,
    { skip: !taskId },
  );

  const loading =
    summaryQuery.isLoading ||
    matrixQuery.isLoading ||
    topSourcesQuery.isLoading ||
    trendQuery.isLoading ||
    sentimentQuery.isLoading;
  const error = getFirstError([
    summaryQuery.error,
    matrixQuery.error,
    topSourcesQuery.error,
    trendQuery.error,
    sentimentQuery.error,
  ]);

  const summary = summaryQuery.data;
  const matrix = matrixQuery.data;
  const topSources = topSourcesQuery.data;
  const trend = trendQuery.data;
  const sentiment = sentimentQuery.data;

  usePageTitle(
    summary?.task.task_name
      ? `${summary.task.task_name} - GEO监测看板`
      : t`GEO监测看板`,
  );

  const goBack = () => {
    router.replace({ pathname: "/geo-task", query: {} });
  };

  const handleApplyDateRange = () => {
    if (!draftDateRange.start_date || !draftDateRange.end_date) {
      sendToast({
        message: t`请选择完整的日期范围`,
        icon: "warning_triangle_filled",
        iconColor: "var(--mb-color-warning)",
      });
      return;
    }

    if (draftDateRange.start_date > draftDateRange.end_date) {
      sendToast({
        message: t`开始日期不能晚于结束日期`,
        icon: "warning_triangle_filled",
        iconColor: "var(--mb-color-warning)",
      });
      return;
    }

    setDateRange(draftDateRange);
  };

  return (
    <Box p="xl" style={{ maxWidth: "100%", width: "100%", margin: 0 }}>
      <Flex align="center" gap="sm" mb="lg">
        <Button
          leftSection={<Icon name="chevronleft" />}
          variant="subtle"
          onClick={goBack}
        >
          {t`Back to Geo tasks`}
        </Button>
      </Flex>

      <LoadingAndErrorWrapper loading={loading} error={error} noWrapper>
        {summary && matrix && topSources && trend && sentiment ? (
          <>
            <DashboardSummaryHeader
              summary={summary}
              draftDateRange={draftDateRange}
              onDraftDateRangeChange={setDraftDateRange}
              onApplyDateRange={handleApplyDateRange}
            />

            <DashboardKpis summary={summary} />

            <div
              className={cx(CS.mb4)}
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                alignItems: "stretch",
              }}
            >
              <MatrixSection matrix={matrix} />
              <TopSourcesSection topSources={topSources} />
            </div>

            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                alignItems: "stretch",
              }}
            >
              <TrendSection trend={trend} />
              <SentimentSection sentiment={sentiment} />
            </div>
          </>
        ) : null}
      </LoadingAndErrorWrapper>
    </Box>
  );
};
