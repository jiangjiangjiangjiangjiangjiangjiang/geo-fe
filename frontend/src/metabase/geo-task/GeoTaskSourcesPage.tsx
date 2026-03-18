import cx from "classnames";
import { useState } from "react";
import { t } from "ttag";

import type { SourceItem } from "metabase/api/geo-task";
import { useGetGeoTaskSourcesQuery } from "metabase/api/geo-task";
import { LoadingAndErrorWrapper } from "metabase/common/components/LoadingAndErrorWrapper";
import { PaginationControls } from "metabase/common/components/PaginationControls";
import AdminS from "metabase/css/admin.module.css";
import CS from "metabase/css/core/index.css";
import { usePageTitle } from "metabase/hooks/use-page-title";
import { useRouter } from "metabase/router";
import { Box, Button, Flex, Icon, Title } from "metabase/ui";

interface GroupedSourceItem {
  result_id: number;
  sources: SourceItem[];
}

function groupSourcesByResultId(items: SourceItem[]): GroupedSourceItem[] {
  const groupedItems = new Map<number, GroupedSourceItem>();

  items.forEach((item) => {
    const existingGroup = groupedItems.get(item.result_id);

    if (existingGroup) {
      existingGroup.sources.push(item);
      return;
    }

    groupedItems.set(item.result_id, {
      result_id: item.result_id,
      sources: [item],
    });
  });

  return Array.from(groupedItems.values());
}

function SourceRow({ item }: { item: GroupedSourceItem }) {
  return (
    <tr>
      <td>{item.result_id}</td>
      <td>
        <div className={cx(CS.flex, CS.flexColumn)} style={{ gap: 12 }}>
          {item.sources.map((source, index) => (
            <div key={`${source.title ?? "title"}-${index}`}>
              {source.title ?? "-"}
            </div>
          ))}
        </div>
      </td>
      <td>
        <div className={cx(CS.flex, CS.flexColumn)} style={{ gap: 12 }}>
          {item.sources.map((source, index) =>
            source.url ? (
              <a
                key={`${source.url}-${index}`}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={CS.link}
              >
                {source.url.length > 60
                  ? source.url.slice(0, 60) + "…"
                  : source.url}
              </a>
            ) : (
              <div key={`empty-url-${index}`}>-</div>
            ),
          )}
        </div>
      </td>
    </tr>
  );
}

export const GeoTaskSourcesPage = () => {
  const { params, router } = useRouter();
  const taskId = params?.taskId ?? "";
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [batchId, setBatchId] = useState<number | undefined>(undefined);

  const { data, isLoading, error } = useGetGeoTaskSourcesQuery(
    {
      taskId,
      page,
      page_size: pageSize,
      ...(batchId != null && { batch_id: batchId }),
    },
    { skip: !taskId },
  );

  usePageTitle(t`Task sources`);

  const goBack = () => {
    router.replace({ pathname: "/geo-task", query: {} });
  };

  const items = data?.items ?? [];
  const groupedItems = groupSourcesByResultId(items);
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
          <Title order={1}>{t`Task sources`}</Title>
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
          {groupedItems.length === 0 ? (
            <div className={cx(CS.flex, CS.layoutCentered, CS.p4)}>
              <p className={CS.textSecondary}>{t`No sources found`}</p>
            </div>
          ) : (
            <table className={AdminS.ContentTable}>
              <thead>
                <tr>
                  <th>{t`Result ID`}</th>
                  <th>{t`Title`}</th>
                  <th>{t`URL`}</th>
                </tr>
              </thead>
              <tbody>
                {groupedItems.map((item) => (
                  <SourceRow key={String(item.result_id)} item={item} />
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
