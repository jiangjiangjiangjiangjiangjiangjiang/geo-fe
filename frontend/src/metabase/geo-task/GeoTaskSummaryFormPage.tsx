import cx from "classnames";
import dayjs from "dayjs";
import { useMemo } from "react";
import { t } from "ttag";

import type {
  GeoTaskSummaryBrandSummary,
  GeoTaskSummaryForm,
  GeoTaskSummaryTerm,
} from "metabase/api/geo-task";
import { useGetGeoTaskSummaryFormQuery } from "metabase/api/geo-task";
import { LoadingAndErrorWrapper } from "metabase/common/components/LoadingAndErrorWrapper";
import AdminS from "metabase/css/admin.module.css";
import CS from "metabase/css/core/index.css";
import { usePageTitle } from "metabase/hooks/use-page-title";
import { useRouter } from "metabase/router";
import { Box, Button, Flex, Icon, Title } from "metabase/ui";

type SummaryColumn = {
  key: string;
  label: string;
  value: string;
  accent?: boolean;
};

type SummaryColumnGroup = {
  key: string;
  label: string;
  columns: SummaryColumn[];
  tone?: "neutral" | "brand" | "competitor" | "keyword";
};

const groupToneStyles: Record<
  NonNullable<SummaryColumnGroup["tone"]>,
  { background: string; color: string }
> = {
  neutral: {
    background: "var(--mb-color-bg-light)",
    color: "var(--mb-color-text-dark)",
  },
  brand: {
    background: "color-mix(in srgb, var(--mb-color-brand), white 88%)",
    color: "var(--mb-color-brand)",
  },
  competitor: {
    background: "color-mix(in srgb, var(--mb-color-error), white 91%)",
    color: "var(--mb-color-error)",
  },
  keyword: {
    background: "color-mix(in srgb, var(--mb-color-warning), white 86%)",
    color: "var(--mb-color-text-dark)",
  },
};

const accentTextStyle = {
  color: "var(--mb-color-error)",
  fontWeight: 600,
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : value;
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) {
    return "-";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(4).replace(/\.?0+$/, "");
}

function normalizeRateForDisplay(
  value: number | null | undefined,
): number | null | undefined {
  if (value == null) {
    return value;
  }

  return Math.abs(value) <= 1 ? value * 100 : value;
}

function formatRate(value: number | null | undefined): string {
  const formattedValue = formatNumber(normalizeRateForDisplay(value));
  return formattedValue === "-" ? formattedValue : `${formattedValue}%`;
}

function formatStringArray(value: string[] | null | undefined): string {
  if (!value || value.length === 0) {
    return "-";
  }

  const items = value.map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items.join("、") : "-";
}

function buildTermColumns(
  prefix: string,
  title: string,
  terms: GeoTaskSummaryTerm[],
  tone: SummaryColumnGroup["tone"],
): SummaryColumnGroup[] {
  if (terms.length === 0) {
    return [
      {
        key: `${prefix}-empty`,
        label: title,
        tone,
        columns: [
          {
            key: `${prefix}-empty-value`,
            label: t`暂无数据`,
            value: "-",
          },
        ],
      },
    ];
  }

  return terms.map((term) => ({
    key: `${prefix}-${term.term_index}`,
    label: term.term_label || `${prefix}${term.term_index}`,
    tone,
    columns: [
      {
        key: `${prefix}-${term.term_index}-keyword`,
        label: t`关键词`,
        value: term.keyword || "-",
        accent: true,
      },
      {
        key: `${prefix}-${term.term_index}-mention-count`,
        label: t`提及次数`,
        value: formatNumber(term.mention_count),
      },
      {
        key: `${prefix}-${term.term_index}-mention-rate`,
        label: t`提及率`,
        value: formatRate(term.mention_rate),
      },
    ],
  }));
}

function buildSingleKeywordGroup(
  prefix: string,
  title: string,
  emptyTitle: string,
  term: GeoTaskSummaryTerm | null,
  fallbackKeyword: string | null | undefined,
  tone: SummaryColumnGroup["tone"],
): SummaryColumnGroup {
  return {
    key: `${prefix}-keyword`,
    label: title,
    tone,
    columns: [
      {
        key: `${prefix}-keyword-name`,
        label: emptyTitle,
        value: term?.keyword || fallbackKeyword || "-",
        accent: true,
      },
      {
        key: `${prefix}-keyword-mention-count`,
        label: t`提及次数`,
        value: formatNumber(term?.mention_count),
      },
      {
        key: `${prefix}-keyword-mention-rate`,
        label: t`提及率`,
        value: formatRate(term?.mention_rate),
      },
    ],
  };
}

function buildBrandOverviewGroup(
  prefix: string,
  title: string,
  summary: GeoTaskSummaryBrandSummary | null,
  tone: SummaryColumnGroup["tone"],
): SummaryColumnGroup {
  if (!summary) {
    return {
      key: `${prefix}-empty`,
      label: title,
      tone,
      columns: [
        {
          key: `${prefix}-empty-value`,
          label: t`汇总结果`,
          value: "-",
        },
      ],
    };
  }

  return {
    key: `${prefix}-overview`,
    label: title,
    tone,
    columns: [
      {
        key: `${prefix}-brand-name`,
        label: t`品牌名`,
        value: summary.brand_name || "-",
        accent: true,
      },
      {
        key: `${prefix}-mention-count`,
        label: t`提及次数`,
        value: formatNumber(summary.mention_count),
      },
      {
        key: `${prefix}-mention-rate`,
        label: t`提及率`,
        value: formatRate(summary.mention_rate),
      },
      {
        key: `${prefix}-first-recommendation-count`,
        label: t`首推次数`,
        value: formatNumber(summary.first_recommendation_count),
      },
      {
        key: `${prefix}-first-recommendation-rate`,
        label: t`首推率`,
        value: formatRate(summary.first_recommendation_rate),
      },
      {
        key: `${prefix}-top3-count`,
        label: t`TOP3 次数`,
        value: formatNumber(summary.top3_count),
      },
      {
        key: `${prefix}-top3-rate`,
        label: t`TOP3 率`,
        value: formatRate(summary.top3_rate),
      },
      {
        key: `${prefix}-positive-count`,
        label: t`正面次数`,
        value: formatNumber(summary.positive_count),
      },
      {
        key: `${prefix}-positive-rate`,
        label: t`正面率`,
        value: formatRate(summary.positive_rate),
      },
      {
        key: `${prefix}-neutral-count`,
        label: t`中性次数`,
        value: formatNumber(summary.neutral_count),
      },
      {
        key: `${prefix}-neutral-rate`,
        label: t`中性率`,
        value: formatRate(summary.neutral_rate),
      },
      {
        key: `${prefix}-negative-count`,
        label: t`负面次数`,
        value: formatNumber(summary.negative_count),
      },
      {
        key: `${prefix}-negative-rate`,
        label: t`负面率`,
        value: formatRate(summary.negative_rate),
      },
      {
        key: `${prefix}-average-rank`,
        label: t`平均排名`,
        value: formatNumber(summary.average_rank),
      },
      {
        key: `${prefix}-best-rank`,
        label: t`最佳排名`,
        value: formatNumber(summary.best_rank),
      },
    ],
  };
}

function buildProductSummaryGroups(
  summary: GeoTaskSummaryBrandSummary | null,
): SummaryColumnGroup[] {
  if (!summary) {
    return [
      buildBrandOverviewGroup("product-summary", t`我方品牌`, null, "brand"),
    ];
  }

  return [
    buildBrandOverviewGroup("product-summary", t`我方品牌`, summary, "brand"),
    buildSingleKeywordGroup(
      "product-summary-brand-keyword",
      t`我方品牌关键词`,
      t`品牌关键词`,
      summary.product_keyword_terms[0] ?? null,
      summary.product_terms[0] ?? null,
      "keyword",
    ),
    ...buildTermColumns(
      "product-summary-selling-point",
      t`我方品牌卖点`,
      summary.selling_point_terms,
      "keyword",
    ),
  ];
}

function buildCompetitorSummaryGroups(
  summary: GeoTaskSummaryBrandSummary,
  index: number,
): SummaryColumnGroup[] {
  const prefix = `comparison-summary-${index + 1}`;

  return [
    buildBrandOverviewGroup(
      prefix,
      `${t`竞品品牌`} ${index + 1}`,
      summary,
      "competitor",
    ),
    buildSingleKeywordGroup(
      `${prefix}-brand-keyword`,
      `${t`竞品品牌关键词`} ${index + 1}`,
      t`品牌关键词`,
      summary.brand_terms[0] ?? null,
      summary.brand_term_1,
      "competitor",
    ),
  ];
}

function buildSummaryGroups(
  summaryForm: GeoTaskSummaryForm,
): SummaryColumnGroup[] {
  const { task, batch, summary } = summaryForm;
  const basicInfo = summary.basic_info;

  return [
    {
      key: "basic-info",
      label: t`基础信息`,
      tone: "neutral",
      columns: [
        {
          key: "task-name",
          label: t`任务名称`,
          value: basicInfo.task_name || task.task_name || "-",
        },
        {
          key: "query-text",
          label: t`查询词`,
          value: basicInfo.query_text || task.query_text || "-",
          accent: true,
        },
        {
          key: "ai-mode",
          label: t`AI 模式`,
          value: basicInfo.ai_mode || task.ai_mode || "-",
        },
        {
          key: "ai-model",
          label: t`AI 模型`,
          value: basicInfo.ai_model || task.ai_model || "-",
        },
        {
          key: "ai-platforms",
          label: t`AI 平台`,
          value: formatStringArray(basicInfo.ai_platforms || task.ai_platforms),
        },
        {
          key: "product-brand",
          label: t`产品品牌`,
          value: task.product_brand || "-",
          accent: true,
        },
        {
          key: "comparison-brands",
          label: t`竞品品牌`,
          value: formatStringArray(task.comparison_brands),
          accent: true,
        },
        {
          key: "product-keywords",
          label: t`产品关键词`,
          value: formatStringArray(task.product_keywords),
          accent: true,
        },
        {
          key: "selling-point-keywords",
          label: t`卖点关键词`,
          value: formatStringArray(task.selling_point_keywords),
          accent: true,
        },
        {
          key: "result-count",
          label: t`结果数`,
          value: formatNumber(batch.result_count || basicInfo.result_count),
        },
        {
          key: "platform-count",
          label: t`平台数`,
          value: formatNumber(batch.platform_count || basicInfo.platform_count),
        },
        {
          key: "started-at",
          label: t`开始时间`,
          value: formatDateTime(batch.started_at),
        },
        {
          key: "ended-at",
          label: t`结束时间`,
          value: formatDateTime(batch.ended_at),
        },
      ],
    },
    ...buildProductSummaryGroups(summary.product_summary),
    ...summary.comparison_summaries.flatMap((item, index) =>
      buildCompetitorSummaryGroups(item, index),
    ),
  ];
}

export const GeoTaskSummaryFormPage = () => {
  const { params, router } = useRouter();
  const taskId = params?.taskId ?? "";

  const { data, isLoading, error } = useGetGeoTaskSummaryFormQuery(taskId, {
    skip: !taskId,
  });

  usePageTitle(t`汇总结果`);

  const groups = useMemo(() => (data ? buildSummaryGroups(data) : []), [data]);
  const hasSummaryData = groups.some((group) => group.columns.length > 0);

  const goBack = () => {
    router.push(`/geo-task/${taskId}/results`);
  };

  return (
    <Box p="xl" style={{ maxWidth: "100%", width: "100%", margin: 0 }}>
      <Flex justify="space-between" align="center" mb="lg" wrap="wrap" gap="md">
        <Flex align="center" gap="sm">
          <Button
            leftSection={<Icon name="chevronleft" />}
            variant="subtle"
            onClick={goBack}
          >
            {t`返回任务结果`}
          </Button>
          <Title order={1}>{t`汇总结果`}</Title>
        </Flex>
      </Flex>

      <LoadingAndErrorWrapper loading={isLoading} error={error} noWrapper>
        <div className={cx(CS.bordered, CS.rounded, CS.full)}>
          {!hasSummaryData ? (
            <div className={cx(CS.flex, CS.layoutCentered, CS.p4)}>
              <p className={CS.textSecondary}>{t`No summary found`}</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                className={AdminS.ContentTable}
                style={{ minWidth: Math.max(groups.length * 180, 1800) }}
              >
                <thead>
                  <tr>
                    {groups.map((group) => {
                      const tone = group.tone ?? "neutral";
                      const toneStyle = groupToneStyles[tone];

                      return (
                        <th
                          key={group.key}
                          colSpan={group.columns.length}
                          style={{
                            ...toneStyle,
                            textAlign: "center",
                            borderBottom: "1px solid var(--mb-color-border)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {group.label}
                        </th>
                      );
                    })}
                  </tr>
                  <tr>
                    {groups.flatMap((group) =>
                      group.columns.map((column) => (
                        <th
                          key={column.key}
                          style={{
                            minWidth: 160,
                            whiteSpace: "normal",
                            verticalAlign: "top",
                          }}
                        >
                          {column.label}
                        </th>
                      )),
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {groups.flatMap((group) =>
                      group.columns.map((column) => (
                        <td
                          key={column.key}
                          style={{
                            minWidth: 160,
                            verticalAlign: "top",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            ...(column.accent ? accentTextStyle : null),
                          }}
                        >
                          {column.value}
                        </td>
                      )),
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </LoadingAndErrorWrapper>
    </Box>
  );
};
