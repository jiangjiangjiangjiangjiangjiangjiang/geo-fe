import cx from "classnames";
import { useState } from "react";
import { t } from "ttag";

import type { GeoTask } from "metabase/api/geo-task";
import {
  useExecuteGeoTaskMutation,
  useListGeoTasksQuery,
  useUpdateGeoTaskMutation,
} from "metabase/api/geo-task";
import { LoadingAndErrorWrapper } from "metabase/common/components/LoadingAndErrorWrapper";
import { PaginationControls } from "metabase/common/components/PaginationControls";
import { useLocale, useToast } from "metabase/common/hooks";
import AdminS from "metabase/css/admin.module.css";
import CS from "metabase/css/core/index.css";
import { Button, Flex } from "metabase/ui";

const listStyle = {
  margin: 0,
  paddingLeft: "1em",
  listStyle: "none" as const,
};

function SellingPointsCell({ task }: { task: GeoTask }) {
  const items = task.selling_point_keywords?.filter(Boolean) ?? [];
  if (items.length === 0) {
    return <>-</>;
  }
  return (
    <ul style={listStyle}>
      {items.map((point, i) => (
        <li key={i}>{point}</li>
      ))}
    </ul>
  );
}

function ComparisonBrandsCell({
  task,
  labelCompetitorBrand,
  labelCompetitorKeywords,
}: {
  task: GeoTask;
  labelCompetitorBrand: string;
  labelCompetitorKeywords: string;
}) {
  const cb = task.comparison_brands;
  if (cb == null || (Array.isArray(cb) && cb.length === 0)) {
    return <>-</>;
  }
  const list: Array<{ brand: string; keywords: string }> = Array.isArray(cb)
    ? cb
        .filter(Boolean)
        .map((entry) => ({ brand: String(entry), keywords: "" }))
    : Object.entries(cb).map(([brand, kw]) => ({
        brand,
        keywords: Array.isArray(kw) ? kw.filter(Boolean).join(", ") : "",
      }));
  return (
    <ul style={listStyle}>
      {list.map((item, i) => (
        <li key={i}>
          {labelCompetitorBrand}: {item.brand}
          {item.keywords
            ? `；${labelCompetitorKeywords}: ${item.keywords}`
            : ""}
        </li>
      ))}
    </ul>
  );
}

interface GeoTaskListProps {
  onTaskCreated?: () => void;
}

/* eslint-disable-next-line complexity -- table columns, handlers, and locale labels */
export const GeoTaskList = ({
  onTaskCreated: _onTaskCreated,
}: GeoTaskListProps) => {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error } = useListGeoTasksQuery({
    page,
    page_size: pageSize,
  });
  const [executeGeoTask, { isLoading: isExecuting }] =
    useExecuteGeoTaskMutation();
  const [updateGeoTask, { isLoading: isUpdating }] = useUpdateGeoTaskMutation();
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sendToast] = useToast();
  const { locale } = useLocale();
  const isZh = locale?.startsWith("zh");
  const viewResultsLabel = (isZh ? "查看结果" : null) ?? t`View results`;
  const viewSourcesLabel = (isZh ? "查看信源" : null) ?? t`View sources`;

  // 表头与按钮中文兜底
  const headerTaskId = (isZh ? "任务ID" : null) ?? t`Task ID`;
  const headerTaskName = (isZh ? "任务名" : null) ?? t`Task Name`;
  const headerTaskBrand = (isZh ? "任务品牌" : null) ?? t`Task Brand`;
  const headerTaskKeywords = (isZh ? "任务关键词" : null) ?? t`Task Keywords`;
  const headerSellingPoints =
    (isZh ? "任务品牌卖点" : null) ?? t`Selling points`;
  const headerCompetitorBrands =
    (isZh ? "竞品品牌及关键词" : null) ?? t`Competitor brands & keywords`;
  const labelCompetitorBrand =
    (isZh ? "竞品品牌" : null) ?? t`Competitor brand`;
  const labelCompetitorKeywords =
    (isZh ? "竞品品牌关键词" : null) ?? t`Competitor keywords`;
  const headerAiQuestion = (isZh ? "AI问题" : null) ?? t`AI Question`;
  const headerAiPlatform = (isZh ? "AI平台" : null) ?? t`AI Platform`;
  const headerAiMode = (isZh ? "AI模式" : null) ?? t`AI Mode`;
  const headerEnabled = (isZh ? "启用" : null) ?? t`Enabled`;
  const headerActions = (isZh ? "动作" : null) ?? t`Actions`;
  const headerTaskResult = (isZh ? "任务结果" : null) ?? t`Task Result`;
  const labelEnable = (isZh ? "启用" : null) ?? t`Enable`;
  const labelDisable = (isZh ? "禁用" : null) ?? t`Disable`;
  const labelExecute = (isZh ? "执行" : null) ?? t`Execute`;
  const labelYes = (isZh ? "是" : null) ?? t`Yes`;
  const labelNo = (isZh ? "否" : null) ?? t`No`;

  const tasks = data?.items || [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;
  // Show pagination if we have total info and either multiple pages or more items than page size
  const shouldShowPagination =
    total > 0 && (totalPages > 1 || total > pageSize);
  // const shouldShowPagination = total > 0; // 或 tasks.length > 0

  const handleExecute = async (task: GeoTask) => {
    try {
      setExecutingId(task.id);
      const result = await executeGeoTask({ geo_task_id: task.id }).unwrap();
      sendToast({
        message: result.message || t`Task executed successfully`,
        icon: "check",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t`Failed to execute task. Please try again.`;
      sendToast({
        message: errorMessage,
        icon: "warning_triangle_filled",
        iconColor: "var(--mb-color-warning)",
      });
    } finally {
      setExecutingId(null);
    }
  };

  const handleSetEnabled = async (task: GeoTask, enabled: boolean) => {
    try {
      setUpdatingId(task.id);
      const result = await updateGeoTask({ taskId: task.id, enabled }).unwrap();
      sendToast({
        message:
          result.message || (enabled ? t`Task enabled` : t`Task disabled`),
        icon: "check",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t`Failed to update task status. Please try again.`;
      sendToast({
        message: errorMessage,
        icon: "warning_triangle_filled",
        iconColor: "var(--mb-color-warning)",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewResults = (_task: GeoTask) => {
    sendToast({
      message: t`View results – coming soon`,
      icon: "info",
    });
  };

  const handleViewSources = (_task: GeoTask) => {
    sendToast({
      message: t`View sources – coming soon`,
      icon: "info",
    });
  };

  return (
    <LoadingAndErrorWrapper loading={isLoading} error={error} noWrapper>
      <>
        <div className={cx(CS.bordered, CS.rounded, CS.full)}>
          {tasks.length === 0 ? (
            <div className={cx(CS.flex, CS.layoutCentered, CS.p4)}>
              <p className={CS.textSecondary}>{t`No geo tasks found`}</p>
            </div>
          ) : (
            <table className={AdminS.ContentTable}>
              <thead>
                <tr>
                  <th>{headerTaskId}</th>
                  <th>{headerTaskName}</th>
                  <th>{headerTaskBrand}</th>
                  <th>{headerTaskKeywords}</th>
                  <th>{headerSellingPoints}</th>
                  <th>{headerCompetitorBrands}</th>
                  <th>{headerAiQuestion}</th>
                  <th>{headerAiPlatform}</th>
                  <th>{headerAiMode}</th>
                  <th>{headerEnabled}</th>
                  <th>{headerActions}</th>
                  <th>{headerTaskResult}</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.id}</td>
                    <td>{task.task_name ?? "-"}</td>
                    <td>{task.product_brand ?? "-"}</td>
                    <td>{task.product_keywords ?? "-"}</td>
                    <td>
                      <SellingPointsCell task={task} />
                    </td>
                    <td>
                      <ComparisonBrandsCell
                        task={task}
                        labelCompetitorBrand={labelCompetitorBrand}
                        labelCompetitorKeywords={labelCompetitorKeywords}
                      />
                    </td>
                    <td>{task.query_text || "-"}</td>
                    <td>{task.ai_model ?? "-"}</td>
                    <td>{task.ai_mode ?? "-"}</td>
                    <td>{task.enabled ? labelYes : labelNo}</td>
                    <td>
                      <Flex gap="xs" wrap="wrap" align="center">
                        {task.enabled ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetEnabled(task, false)}
                            disabled={
                              (isUpdating && updatingId === task.id) ||
                              (isExecuting && executingId === task.id)
                            }
                            loading={isUpdating && updatingId === task.id}
                          >
                            {labelDisable}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetEnabled(task, true)}
                            disabled={
                              (isUpdating && updatingId === task.id) ||
                              (isExecuting && executingId === task.id)
                            }
                            loading={isUpdating && updatingId === task.id}
                          >
                            {labelEnable}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="filled"
                          onClick={() => handleExecute(task)}
                          disabled={
                            (isExecuting && executingId === task.id) ||
                            (isUpdating && updatingId === task.id)
                          }
                          loading={isExecuting && executingId === task.id}
                        >
                          {labelExecute}
                        </Button>
                      </Flex>
                    </td>
                    <td>
                      <Flex gap="xs" wrap="wrap" align="center">
                        <Button
                          size="sm"
                          variant="subtle"
                          onClick={() => handleViewResults(task)}
                        >
                          {viewResultsLabel}
                        </Button>
                        <Button
                          size="sm"
                          variant="subtle"
                          onClick={() => handleViewSources(task)}
                        >
                          {viewSourcesLabel}
                        </Button>
                        {task.last_run_at != null && (
                          <span className={CS.textSecondary}>
                            ({new Date(task.last_run_at).toLocaleString()})
                          </span>
                        )}
                      </Flex>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tasks.length > 0 && shouldShowPagination && (
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
                  itemsLength={tasks.length}
                  total={total}
                  showTotal
                  onPreviousPage={page > 1 ? () => setPage(page - 1) : null}
                  onNextPage={
                    (totalPages > 0 && page < totalPages) ||
                    (totalPages === 0 && tasks.length === pageSize)
                      ? () => setPage(page + 1)
                      : null
                  }
                />
              </Flex>
            </div>
          )}
        </div>
      </>
    </LoadingAndErrorWrapper>
  );
};
