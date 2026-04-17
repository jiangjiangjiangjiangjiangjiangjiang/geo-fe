const HOURS_PER_DAY = 24;
const SCHEDULE_MINUTE = 0;
const EPSILON = 0.01;

export interface ParsedScheduleFrequency {
  timesPerDay: number;
  legacyIntervalHours?: number;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function isValidHourList(hours: number[]): boolean {
  if (hours.length === 0 || hours.length > HOURS_PER_DAY) {
    return false;
  }

  return hours.every(
    (hour, index) =>
      Number.isInteger(hour) &&
      hour >= 0 &&
      hour < HOURS_PER_DAY &&
      (index === 0 || hour > hours[index - 1]),
  );
}

function buildHourListCron(hours: number[]): string {
  return `${SCHEDULE_MINUTE} ${hours.join(",")} * * *`;
}

function buildDistributedHours(timesPerDay: number): number[] {
  const distributedHours = Array.from({ length: timesPerDay }, (_, index) =>
    Math.floor((index * HOURS_PER_DAY) / timesPerDay),
  );

  return Array.from(new Set(distributedHours));
}

function getApproximateIntervalHours(timesPerDay: number): number | null {
  if (timesPerDay <= 0) {
    return null;
  }

  const intervalHours = HOURS_PER_DAY / timesPerDay;
  const roundedIntervalHours = Math.round(intervalHours);

  return Math.abs(intervalHours - roundedIntervalHours) <= EPSILON
    ? roundedIntervalHours
    : null;
}

export function dailyFrequencyToCron(timesPerDay: number): string | null {
  if (timesPerDay <= 0 || timesPerDay > HOURS_PER_DAY) {
    return null;
  }

  const intervalHours = getApproximateIntervalHours(timesPerDay);
  if (intervalHours != null) {
    return `0 */${intervalHours} * * *`;
  }

  if (!Number.isInteger(timesPerDay)) {
    return null;
  }

  const hours = buildDistributedHours(timesPerDay);
  return isValidHourList(hours) ? buildHourListCron(hours) : null;
}

export function parseScheduleCron(
  cron?: string | null,
): ParsedScheduleFrequency | null {
  if (!cron || !cron.trim()) {
    return null;
  }

  const trimmedCron = cron.trim();
  const hourlyMatch = trimmedCron.match(/^0 \*\/(\d{1,2}) \* \* \*$/);
  if (hourlyMatch) {
    const intervalHours = Number(hourlyMatch[1]);
    if (intervalHours < 1 || intervalHours > HOURS_PER_DAY) {
      return null;
    }

    return {
      timesPerDay: roundToTwoDecimals(HOURS_PER_DAY / intervalHours),
      legacyIntervalHours: intervalHours,
    };
  }

  const hourListMatch = trimmedCron.match(
    /^0 ((?:\d{1,2})(?:,\d{1,2})*) \* \* \*$/,
  );
  if (!hourListMatch) {
    return null;
  }

  const hours = hourListMatch[1].split(",").map(Number);
  if (!isValidHourList(hours)) {
    return null;
  }

  return { timesPerDay: hours.length };
}

export function formatScheduleCronForDisplay(cron?: string | null): string {
  if (!cron || !cron.trim()) {
    return "-";
  }

  const parsedSchedule = parseScheduleCron(cron);
  if (!parsedSchedule) {
    return cron.trim();
  }

  if (parsedSchedule.legacyIntervalHours != null) {
    return `每天${parsedSchedule.timesPerDay}次（旧：每${parsedSchedule.legacyIntervalHours}小时1次）`;
  }

  return `每天${parsedSchedule.timesPerDay}次`;
}
