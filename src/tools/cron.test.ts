import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { executeTool } from "./execute-tool";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-03-01T08:30:00Z"));
});

afterEach(() => vi.useRealTimers());

function parse(input: string, config: unknown = {}) {
  const result = executeTool({ toolId: "cron.parse", input, config });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected a valid cron result");
  const output: unknown = JSON.parse(result.output);
  return output;
}

test("[CRON-PARSE] normalizes whitespace and composes five future instants from now", () => {
  expect(parse("  */5   * * * *  ")).toMatchObject({
    expression: "*/5 * * * *",
    description: "Every 5 minutes",
    fields: {
      minute: "*/5",
      hour: "*",
      dayOfMonth: "*",
      month: "*",
      dayOfWeek: "*",
    },
    nextRuns: [
      "2024-03-01T08:35:00.000Z",
      "2024-03-01T08:40:00.000Z",
      "2024-03-01T08:45:00.000Z",
      "2024-03-01T08:50:00.000Z",
      "2024-03-01T08:55:00.000Z",
    ],
  });
});

test("[CRON-PARSE] maps valid month/weekday tokens, preserving ranges, lists, and steps", () => {
  expect(
    parse("0,30 9-17/2 * jan,mar mon-fri", { language: "zh-CN" }),
  ).toMatchObject({
    expression: "0,30 9-17/2 * 1,3 1-5",
    fields: { minute: "0,30", hour: "9-17/2", month: "1,3", dayOfWeek: "1-5" },
  });
  expect(parse("0 0 * * 7")).toMatchObject({ expression: "0 0 * * 7" });
});

test("[CRON-PARSE] describes restricted day fields as alternatives in both languages", () => {
  expect(parse("0 0 1 * MON")).toMatchObject({
    description: "At 00:00, on day 1 of the month OR At 00:00, only on Monday",
  });
  expect(parse("0 0 1 * MON", { language: "zh-CN" })).toMatchObject({
    description: "在00:00, 限每月 1 号 或 在00:00, 仅星期一",
  });
});

test("[CRON-SECONDS] detects six fields and preserves second precision in future instants", () => {
  expect(parse("  */10 * * * * *  ")).toMatchObject({
    expression: "*/10 * * * * *",
    description: "Every 10 seconds",
    fields: {
      second: "*/10",
      minute: "*",
      hour: "*",
      dayOfMonth: "*",
      month: "*",
      dayOfWeek: "*",
    },
    nextRuns: [
      "2024-03-01T08:30:10.000Z",
      "2024-03-01T08:30:20.000Z",
      "2024-03-01T08:30:30.000Z",
      "2024-03-01T08:30:40.000Z",
      "2024-03-01T08:30:50.000Z",
    ],
  });
  expect(parse("*/10 * * * * *", { language: "zh-CN" })).toMatchObject({
    description: "每隔 10 秒",
  });
  expect(parse("0,30 0 9 1 jan mon")).toMatchObject({
    expression: "0,30 0 9 1 1 1",
    fields: { second: "0,30", month: "1", dayOfWeek: "1" },
    description:
      "At 0 and 30 seconds past the minute, on the hour, at 09:00, on day 1 of the month, only in January OR At 0 and 30 seconds past the minute, on the hour, at 09:00, only on Monday, only in January",
  });
});

test.each([
  "",
  "* * * *",
  "60 * * * * *",
  "*/0 * * * * *",
  "MON * * * * *",
  "0 60 * * * *",
  "0 0 24 * * *",
  "0 0 0 ? * MON",
  "0 0 0 1 1 * 2027",
  "@daily",
  "@reboot",
  "0 0 ? * MON",
  "0 0 L * *",
  "0 0 1W * *",
  "0 0 * * MON#2",
  "0 0 * * +MON",
  "0 0 * * SUN7",
  "0 0 * 1JAN *",
  "MON * * * *",
  "60 * * * *",
  "0 24 * * *",
  "*/0 * * * *",
  "0 0 * 13 *",
  "0 0 * * 8",
  "0 0 * * 5-1",
])("[CRON-PARSE] rejects invalid or unsupported syntax: %s", (input) => {
  expect(
    executeTool({ toolId: "cron.parse", input, config: {} }),
  ).toMatchObject({
    ok: false,
    error: { code: "INVALID_INPUT" },
  });
});

test.each(
  [null, [], { language: "fr" }, { language: null }, { extra: true }].map(
    (config) => [config],
  ),
)("[CRON-PARSE] rejects invalid config: %j", (config) => {
  expect(
    executeTool({ toolId: "cron.parse", input: "* * * * *", config }),
  ).toMatchObject({ ok: false, error: { code: "INVALID_CONFIG" } });
});

test("[CRON-PARSE] an impossible schedule never invents execution dates", () => {
  expect(parse("0 0 31 2 *")).toMatchObject({ nextRuns: [] });
});
