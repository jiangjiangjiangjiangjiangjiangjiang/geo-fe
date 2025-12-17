import cx from "classnames";
import { useState } from "react";
import { t } from "ttag";

import type { GeoTask } from "metabase/api/geo-task";
import {
  useExecuteGeoTaskMutation,
  useListGeoTasksQuery,
} from "metabase/api/geo-task";
import { LoadingAndErrorWrapper } from "metabase/common/components/LoadingAndErrorWrapper";
import AdminS from "metabase/css/admin.module.css";
import CS from "metabase/css/core/index.css";
import { Button } from "metabase/ui";

interface GeoTaskListProps {
  onTaskCreated?: () => void;
}

export const GeoTaskList = ({
  onTaskCreated: _onTaskCreated,
}: GeoTaskListProps) => {
  const { data, isLoading, error } = useListGeoTasksQuery({
    page: 1,
    page_size: 20,
  });
  const [executeGeoTask, { isLoading: isExecuting }] =
    useExecuteGeoTaskMutation();
  const [executingId, setExecutingId] = useState<string | null>(null);

  const tasks = data?.items || [];

  const handleExecute = async (task: GeoTask) => {
    try {
      setExecutingId(task.id);
      await executeGeoTask({ id: task.id }).unwrap();
      // TODO: Add success notification
    } catch (error) {
      console.error("Failed to execute geo task:", error);
      // TODO: Add error notification
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
                <th>{t`Query Text`}</th>
                <th>{t`Platform ID`}</th>
                <th>{t`Company ID`}</th>
                <th>{t`Brand Keywords`}</th>
                <th>{t`Enabled`}</th>
                <th>{t`Schedule Cron`}</th>
                <th>{t`Last Run`}</th>
                <th>{t`Actions`}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.query_text}</td>
                  <td>{task.platform_id || "-"}</td>
                  <td>{task.usr_company_id || "-"}</td>
                  <td>{task.brand_keywords || "-"}</td>
                  <td>{task.enabled ? t`Yes` : t`No`}</td>
                  <td>{task.schedule_cron || "-"}</td>
                  <td>
                    {task.last_run_at
                      ? new Date(task.last_run_at).toLocaleString()
                      : "-"}
                  </td>
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
      </div>
    </LoadingAndErrorWrapper>
  );
};
