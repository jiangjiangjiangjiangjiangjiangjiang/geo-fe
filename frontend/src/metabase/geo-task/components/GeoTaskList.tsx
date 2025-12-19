import cx from "classnames";
import { useState } from "react";
import { t } from "ttag";

import type { GeoTask } from "metabase/api/geo-task";
import {
  useExecuteGeoTaskMutation,
  useListGeoTasksQuery,
} from "metabase/api/geo-task";
import { LoadingAndErrorWrapper } from "metabase/common/components/LoadingAndErrorWrapper";
import { PaginationControls } from "metabase/common/components/PaginationControls";
import { useToast } from "metabase/common/hooks";
import AdminS from "metabase/css/admin.module.css";
import CS from "metabase/css/core/index.css";
import { Button, Flex } from "metabase/ui";

interface GeoTaskListProps {
  onTaskCreated?: () => void;
}

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
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [sendToast] = useToast();

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
      // Show success notification with the message from response
      sendToast({
        message: result.message || t`Task executed successfully`,
        icon: "check",
      });
    } catch (error) {
      // Show error notification
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

  return (
    <LoadingAndErrorWrapper loading={isLoading} error={error} noWrapper>
      <div className={cx(CS.bordered, CS.rounded, CS.full)}>
        {tasks.length === 0 ? (
          <div className={cx(CS.flex, CS.layoutCentered, CS.p4)}>
            <p className={CS.textSecondary}>{t`No geo tasks found`}</p>
          </div>
        ) : (
          <table className={AdminS.ContentTable}>
            <thead>
              <tr>
                <th>{t`Task ID`}</th>
                <th>{t`Query Text`}</th>
                <th>{t`Brand Keywords`}</th>
                <th>{t`Enabled`}</th>
                <th>{t`Actions`}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.id}</td>
                  <td>{task.query_text}</td>
                  <td>{task.brand_keywords || "-"}</td>
                  <td>{task.enabled ? t`Yes` : t`No`}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="filled"
                      onClick={() => handleExecute(task)}
                      disabled={isExecuting && executingId === task.id}
                      loading={isExecuting && executingId === task.id}
                    >
                      {t`Execute`}
                    </Button>
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
    </LoadingAndErrorWrapper>
  );
};
