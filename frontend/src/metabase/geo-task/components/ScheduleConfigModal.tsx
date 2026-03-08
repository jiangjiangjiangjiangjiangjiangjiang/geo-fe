import { useEffect, useMemo, useState } from "react";
import { t } from "ttag";

import type { GeoTask } from "metabase/api/geo-task";
import {
  useGetTaskScheduleQuery,
  useSetTaskScheduleMutation,
} from "metabase/api/geo-task";
import { useLocale, useToast } from "metabase/common/hooks";
import { getNextRunTimes, getScheduleExplanation } from "metabase/lib/cron";
import {
  Alert,
  Button,
  Flex,
  Modal,
  Stack,
  Text,
  TextInput,
} from "metabase/ui";

interface ScheduleConfigModalProps {
  task: GeoTask | null;
  opened: boolean;
  onClose: () => void;
}

/** Extract a single error message string from API response detail (string or array). */
function formatDetailAsMessage(detail: unknown): string | null {
  if (detail == null) {
    return null;
  }
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    const first = detail[0];
    if (typeof first === "string") {
      return first;
    }
    if (
      first &&
      typeof first === "object" &&
      "msg" in first &&
      typeof (first as { msg: unknown }).msg === "string"
    ) {
      return (first as { msg: string }).msg;
    }
    return detail.length > 0 ? String(first) : null;
  }
  return null;
}

export function ScheduleConfigModal({
  task,
  opened,
  onClose,
}: ScheduleConfigModalProps) {
  const taskId = task?.id ?? "";
  const { data: schedule, isLoading } = useGetTaskScheduleQuery(taskId, {
    skip: !taskId || !opened,
  });
  const [setSchedule, { isLoading: isSaving }] = useSetTaskScheduleMutation();
  const [sendToast] = useToast();
  const { locale } = useLocale();
  const configureCrontabTitle =
    (locale && locale.startsWith("zh") ? "定时任务配置" : null) ??
    t`Configure Crontab`;
  const executionPlanLabel =
    (locale && locale.startsWith("zh") ? "执行计划" : null) ??
    t`Execution plan`;
  const [cronInput, setCronInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const editRunTimes = useMemo(
    () => (cronInput.trim() ? getNextRunTimes(cronInput.trim(), 10) : []),
    [cronInput],
  );

  useEffect(() => {
    if (schedule) {
      setCronInput(schedule.schedule_cron ?? "");
    }
  }, [schedule]);

  useEffect(() => {
    if (!opened) {
      setErrorMessage(null);
    }
  }, [opened]);

  const handleSave = async () => {
    setErrorMessage(null);
    if (!taskId || !cronInput.trim()) {
      sendToast({
        message: t`Cron expression is required`,
        icon: "warning_triangle_filled",
        iconColor: "var(--mb-color-warning)",
      });
      return;
    }
    try {
      await setSchedule({
        taskId,
        body: { schedule_cron: cronInput.trim() },
      }).unwrap();
      sendToast({ message: t`Schedule updated`, icon: "check" });
      onClose();
    } catch (err: unknown) {
      let detail: unknown = null;
      if (err && typeof err === "object" && "data" in err) {
        const data = (err as { data: unknown }).data;
        if (typeof data === "string") {
          try {
            const parsed = JSON.parse(data) as { detail?: unknown };
            detail = parsed.detail;
          } catch {
            detail = null;
          }
        } else if (data && typeof data === "object" && "detail" in data) {
          detail = (data as { detail: unknown }).detail;
        }
      }
      const msg =
        formatDetailAsMessage(detail) ??
        (err instanceof Error ? err.message : t`Failed to update schedule`);
      setErrorMessage(msg);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={configureCrontabTitle}
      size="md"
    >
      {task && (
        <Stack gap="md">
          {errorMessage && (
            <Alert
              color="error"
              title={t`Update failed`}
              withCloseButton
              onClose={() => setErrorMessage(null)}
            >
              {errorMessage}
            </Alert>
          )}
          <Text size="sm" c="dimmed">
            {t`Task`}: {task.task_name ?? task.query_text ?? task.id}
          </Text>

          {isLoading ? (
            <Text size="sm">{t`Loading schedule…`}</Text>
          ) : (
            <>
              <Text size="sm" fw={600}>
                {t`Edit schedule`}
              </Text>
              <TextInput
                label={t`Cron expression`}
                description={t`e.g. 0 */6 * * * for every 6 hours`}
                value={cronInput}
                onChange={(e) => setCronInput(e.target.value)}
                placeholder="0 */6 * * *"
              />
              {cronInput.trim() && (
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    {executionPlanLabel}:{" "}
                    {getScheduleExplanation(cronInput.trim()) ??
                      t`Invalid cron expression`}
                  </Text>
                  {editRunTimes.length > 0 && (
                    <Stack gap={4}>
                      <Text size="sm" fw={600}>
                        {executionPlanLabel}:
                      </Text>
                      {editRunTimes.map((time, i) => (
                        <Text
                          key={i}
                          size="sm"
                          component="div"
                          style={{ fontFamily: "monospace" }}
                        >
                          {time}
                        </Text>
                      ))}
                    </Stack>
                  )}
                </Stack>
              )}
            </>
          )}

          <Flex gap="sm" justify="flex-end" wrap="wrap">
            <Button variant="subtle" onClick={onClose}>
              {t`Cancel`}
            </Button>
            {!isLoading && (
              <Button variant="filled" onClick={handleSave} loading={isSaving}>
                {t`Save`}
              </Button>
            )}
          </Flex>
        </Stack>
      )}
    </Modal>
  );
}
