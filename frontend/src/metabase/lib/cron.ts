import { isValidCronExpression } from "cron-expression-validator";
// eslint-disable-next-line no-restricted-imports -- used for computing next run times
import * as cronParser from "cron-parser";
import { t } from "ttag";
import { memoize } from "underscore";

import MetabaseSettings from "metabase/lib/settings";
import { has24HourModeSetting } from "metabase/lib/time-dayjs";

function translateErrorMessage(message: string) {
  const errorMessageMap: Record<string, string> = {
    "Day-of-Week values must be between 1 and 7": t`Day-of-week values must be between 1 and 7`,
    "Day-of-Week values must be SUN, MON, TUE, WED, THU, FRI, SAT OR between 1 and 7, - * ? / L #": t`Day-of-week values must be SUN, MON, TUE, WED, THU, FRI, SAT OR between 1 and 7, - * ? / L #`,
    "(Day of week) - Unsupported value for field. Possible values are 1-7 or SUN-SAT , - * ? / L #": t`Unsupported day of week value. Possible values are 1-7 or SUN-SAT , - * ? / L #`,
    "A numeric value between 1 and 5 must follow the # option": t`A numeric value between 1 and 5 must follow the # option`,
    "Day of month values must be between 1 and 31": t`Day of month values must be between 1 and 31`,
    "Offset from last day must be <= 30": t`Offset from last day must be less or equal 30`,
    "Month values must be between 1 and 12": t`Month values must be between 1 and 12`,
    "Month values must be JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC OR between 1 and 12": t`Month values must be JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC or between 1 and 12`,
    "Start year must be less than stop year": t`Start year must be less than stop year`,
    "(Year) - Unsupported value for field. Possible values are 1970-2099 , - * /": t`Unsupported year value. Possible values are 1970-2099 , - * /`,
    "Minute and Second values must be between 0 and 59 and Hour Values must be between 0 and 23": t`Minute and second values must be between 0 and 59 and hour values must be between 0 and 23`,
    "? can only be specified for Day-of-Month -OR- Day-of-Week": t`You must use ? in the day-of-week or day-of-month field`,
    "Unexpected end of expression": t`Invalid cron expression`,
  };
  // Some messages are dynamic and do not have translation mapping,
  // so we've decided to return them as is.
  return errorMessageMap[message] || message;
}

export function validateCronExpression(
  cronExpression: string,
): string | undefined {
  const result = isValidCronExpression<boolean>(cronExpression, {
    error: true,
  });

  if (result === true) {
    return;
  }

  if (result === false) {
    return t`Invalid cron expression`;
  }

  const { errorMessage } = result;
  if (typeof errorMessage === "string") {
    return translateErrorMessage(errorMessage) || t`Invalid cron expression`;
  }

  // Picking up the last error message
  // as a workaround for https://github.com/anushaihalapathirana/cron-expression-validator/issues/17
  // For some reason, cron-expression-validator uses a global `errorMessages` variable,
  // and it's value is preserved between validation calls
  // So the most relevant message is always pushed to the end of the list
  const [lastErrorMessage] = errorMessage
    .map(translateErrorMessage)
    .filter(Boolean)
    .reverse();

  return lastErrorMessage || t`Invalid cron expression`;
}

export function explainCronExpression(cronExpression: string) {
  return cronstrue.toString(cronExpression, {
    verbose: false,
    locale: MetabaseSettings.get("site-locale"),
    use24HourTimeFormat: has24HourModeSetting(),
  });
}

function lowerCaseFirstLetter(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export const getScheduleExplanation = memoize(
  (cronExpression: string): string | null => {
    try {
      const readableSchedule = lowerCaseFirstLetter(
        explainCronExpression(cronExpression),
      );
      return readableSchedule;
    } catch {
      return null;
    }
  },
);

// Remove seconds and years
export function formatCronExpressionForUI(cronExpression: string): string {
  const [, ...partsWithoutSeconds] = cronExpression.split(" ");
  const partsWithoutSecondsAndYear = partsWithoutSeconds.slice(0, -1);
  return partsWithoutSecondsAndYear.join(" ");
}

/** Format date as YYYY-MM-DD HH:mm:ss for display as "next run time" */
function formatRunTime(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${min}:${s}`;
}

/**
 * Get the next N run times for a cron expression (5-field: min hour dom month dow).
 * Returns strings in YYYY-MM-DD HH:mm:ss format, or [] if expression is invalid.
 */
export function getNextRunTimes(
  cronExpression: string,
  count: number = 5,
): string[] {
  const expr = cronExpression.trim();
  if (!expr) {
    return [];
  }
  try {
    // cron-parser: 5-field = minute hour day-of-month month day-of-week
    const interval = cronParser.parseExpression(expr, {
      currentDate: new Date(),
    });
    const times: string[] = [];
    for (let i = 0; i < count; i++) {
      const next = interval.next();
      const date =
        typeof next.toDate === "function"
          ? next.toDate()
          : new Date(next.toString());
      times.push(formatRunTime(date));
    }
    return times;
  } catch {
    return [];
  }
}
