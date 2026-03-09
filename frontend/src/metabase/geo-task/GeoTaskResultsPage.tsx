import cx from "classnames";
import { useState } from "react";
import { t } from "ttag";

import type { GeoResultResponse } from "metabase/api/geo-task";
import { useGetGeoTaskResultsQuery } from "metabase/api/geo-task";
import { LoadingAndErrorWrapper } from "metabase/common/components/LoadingAndErrorWrapper";
import { PaginationControls } from "metabase/common/components/PaginationControls";
import AdminS from "metabase/css/admin.module.css";
import CS from "metabase/css/core/index.css";
import { usePageTitle } from "metabase/hooks/use-page-title";
import { useRouter } from "metabase/router";
import { Box, Button, Flex, Icon, Title } from "metabase/ui";

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

function ResultRow({ result }: { result: GeoResultResponse }) {
  return (
    <tr>
      <td>{result.id}</td>
      <td>{result.batch_id}</td>
      <td>{result.query ?? "-"}</td>
      <td>{result.engine ?? "-"}</td>
      <td>{result.geo_task_id ?? "-"}</td>
      <td>{result.visibility_score}</td>
      <td>{result.sentiment}</td>
      <td>{result.accuracy}</td>
      <td>
        {result.processed_content != null
          ? result.processed_content.length > 80
            ? result.processed_content.slice(0, 80) + "…"
            : result.processed_content
          : "-"}
      </td>
      <td
        title={
          result.query_result != null
            ? JSON.stringify(result.query_result)
            : undefined
        }
      >
        {formatCell(result.query_result)}
      </td>
      <td>{result.brand_mentioned ? t`Yes` : t`No`}</td>
      <td>{formatCell(result.brand_hits)}</td>
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
      <td
        title={
          result.sources != null ? JSON.stringify(result.sources) : undefined
        }
      >
        {formatCell(result.sources)}
      </td>
      <td>{result.collected_at ?? "-"}</td>
    </tr>
  );
}

export const GeoTaskResultsPage = () => {
  const { params, router } = useRouter();
  const taskId = params?.taskId ?? "";
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [batchId, setBatchId] = useState<number | undefined>(undefined);

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

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;
  const shouldShowPagination =
    total > 0 && (totalPages > 1 || total > pageSize);

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
      </Flex>

      {taskId && (
        <Flex mb="md" gap="sm" align="center">
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
                  <th>ID</th>
                  <th>{t`Batch`}</th>
                  <th>{t`Query`}</th>
                  <th>{t`Engine`}</th>
                  <th>{t`Task ID`}</th>
                  <th>{t`Visibility`}</th>
                  <th>{t`Sentiment`}</th>
                  <th>{t`Accuracy`}</th>
                  <th>{t`Processed content`}</th>
                  <th>{t`Query result`}</th>
                  <th>{t`Brand mentioned`}</th>
                  <th>{t`Brand hits`}</th>
                  <th>{t`Brand rank`}</th>
                  <th>{t`First recommendation`}</th>
                  <th>{t`In top 3`}</th>
                  <th>{t`Selling point mentions`}</th>
                  <th>{t`Product keyword mentions`}</th>
                  <th>{t`Sources`}</th>
                  <th>{t`Collected at`}</th>
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
