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
  NumberInput,
  Stack,
  Text,
} from "metabase/ui";

import { dailyFrequencyToCron, parseScheduleCron } from "../lib/schedule";

interface ScheduleConfigModalProps {
  task: GeoTask | null;
  opened: boolean;
  onClose: () => void;
  onSaved?: () => void;
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
  onSaved,
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
  const scheduleTitle =
    (locale && locale.startsWith("zh") ? "日程" : null) ?? t`Schedule`;
  const frequencyLabel =
    (locale && locale.startsWith("zh") ? "搜索频次（次/天）" : null) ??
    t`Search Frequency (times/day)`;
  const [timesPerDayInput, setTimesPerDayInput] = useState<number | string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasUnsupportedCron, setHasUnsupportedCron] = useState(false);

  const cronValue =
    typeof timesPerDayInput === "number" &&
    timesPerDayInput >= 1 &&
    timesPerDayInput <= 24
      ? (dailyFrequencyToCron(timesPerDayInput) ?? "")
      : "";

  const editRunTimes = useMemo(
    () => (cronValue ? getNextRunTimes(cronValue, 10) : []),
    [cronValue],
  );

  useEffect(() => {
    if (schedule) {
      const parsedSchedule = parseScheduleCron(schedule.schedule_cron);
      setTimesPerDayInput(parsedSchedule?.timesPerDay ?? "");
      setHasUnsupportedCron(
        schedule.schedule_cron != null &&
          schedule.schedule_cron.trim() !== "" &&
          parsedSchedule == null,
      );
    }
  }, [schedule]);

  useEffect(() => {
    if (!opened) {
      setErrorMessage(null);
      setHasUnsupportedCron(false);
    }
  }, [opened]);

  const handleSave = async () => {
    setErrorMessage(null);
    if (
      !taskId ||
      typeof timesPerDayInput !== "number" ||
      timesPerDayInput < 1 ||
      timesPerDayInput > 24
    ) {
      sendToast({
        message: t`Please enter a number from 1 to 24`,
        icon: "warning_triangle_filled",
        iconColor: "var(--mb-color-warning)",
      });
      return;
    }

    const scheduleCron = dailyFrequencyToCron(timesPerDayInput);
    if (!scheduleCron) {
      sendToast({
        message: t`Unable to convert the frequency into a schedule`,
        icon: "warning_triangle_filled",
        iconColor: "var(--mb-color-warning)",
      });
      return;
    }

    try {
      await setSchedule({
        taskId,
        body: { schedule_cron: scheduleCron },
      }).unwrap();
      sendToast({ message: t`Schedule updated`, icon: "check" });
      onSaved?.();
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
          {hasUnsupportedCron && (
            <Alert color="warning" title={t`Unsupported existing schedule`}>
              {t`The current cron expression cannot be converted to times per day. Enter a value from 1 to 24 to replace it.`}
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
                {scheduleTitle}
              </Text>
              <NumberInput
                label={frequencyLabel}
                placeholder={t`e.g. 4 for 4 runs per day (1-24)`}
                min={1}
                max={24}
                decimalScale={2}
                clampBehavior="strict"
                value={timesPerDayInput}
                onChange={setTimesPerDayInput}
              />
              {cronValue && (
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    {executionPlanLabel}:{" "}
                    {getScheduleExplanation(cronValue) ??
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
