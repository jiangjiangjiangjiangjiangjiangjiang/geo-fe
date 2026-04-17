import {
  dailyFrequencyToCron,
  formatScheduleCronForDisplay,
  parseScheduleCron,
} from "./schedule";

describe("geo task schedule helpers", () => {
  it("converts times per day into evenly distributed cron", () => {
    expect(dailyFrequencyToCron(4)).toBe("0 */6 * * *");
    expect(dailyFrequencyToCron(5)).toBe("0 0,4,9,14,19 * * *");
  });

  it("parses legacy every-n-hours cron into times per day", () => {
    expect(parseScheduleCron("0 */6 * * *")).toEqual({
      timesPerDay: 4,
      legacyIntervalHours: 6,
    });
  });

  it("formats legacy hourly cron for display with compatibility hint", () => {
    expect(formatScheduleCronForDisplay("0 */5 * * *")).toBe(
      "每天4.8次（旧：每5小时1次）",
    );
  });
});
