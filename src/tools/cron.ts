import { Cron } from "croner";
import cronstrue from "cronstrue";
import "cronstrue/locales/zh_CN.js";
import { isRecord } from "./protocol";
import type { ToolOutcome } from "./protocol";

const cronFields = [
  "minute",
  "hour",
  "dayOfMonth",
  "month",
  "dayOfWeek",
] as const;

const monthNames: Record<string, string> = {
  JAN: "1",
  FEB: "2",
  MAR: "3",
  APR: "4",
  MAY: "5",
  JUN: "6",
  JUL: "7",
  AUG: "8",
  SEP: "9",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

const weekNames: Record<string, string> = {
  SUN: "0",
  MON: "1",
  TUE: "2",
  WED: "3",
  THU: "4",
  FRI: "5",
  SAT: "6",
};

const numericField = fieldTerm("\\d+");
const monthField = fieldTerm(["\\d+", ...Object.keys(monthNames)].join("|"));
const weekdayField = fieldTerm(["\\d+", ...Object.keys(weekNames)].join("|"));

export type CronFields = Record<(typeof cronFields)[number], string> & {
  second?: string;
};

export type CronResult = {
  expression: string;
  description: string;
  fields: CronFields;
  timezone: string;
  nextRuns: string[];
};

export function parseCron(input: string, config: unknown): ToolOutcome {
  if (
    !isRecord(config) ||
    Object.keys(config).some((key) => key !== "language")
  )
    return {
      ok: false,
      error: { code: "INVALID_CONFIG", message: "Invalid cron options" },
    };
  const language = "language" in config ? config.language : "en";
  if (language !== "en" && language !== "zh-CN")
    return {
      ok: false,
      error: { code: "INVALID_CONFIG", message: "Unknown cron language" },
    };

  const parts = input.trim().toUpperCase().split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) return invalidInput();
  const names =
    parts.length === 6 ? (["second", ...cronFields] as const) : cronFields;
  if (
    !parts.every((part, index) =>
      isStandardField(
        part,
        names[index] === "month"
          ? monthField
          : names[index] === "dayOfWeek"
            ? weekdayField
            : numericField,
      ),
    )
  )
    return invalidInput();

  const fields = Object.fromEntries(
    parts.map((part, index) =>
      names[index] === "month"
        ? [names[index], replaceNames(part, monthNames)]
        : names[index] === "dayOfWeek"
          ? [names[index], replaceNames(part, weekNames)]
          : [names[index], part],
    ),
  ) as CronFields;
  const expression = Object.values(fields).join(" ");

  let schedule: Cron;
  try {
    schedule = new Cron(expression, { paused: true, mode: "5-or-6-parts" });
  } catch (error) {
    if (error instanceof TypeError || error instanceof RangeError)
      return invalidInput();
    throw error;
  }
  const options = {
    locale: language === "zh-CN" ? "zh_CN" : "en",
    use24HourTimeFormat: true,
  };
  const dayRestricted = fields.dayOfMonth !== "*" && fields.dayOfWeek !== "*";
  const seconds = fields.second === undefined ? "" : `${fields.second} `;
  const result: CronResult = {
    expression,
    description: dayRestricted
      ? [
          cronstrue.toString(
            `${seconds}${fields.minute} ${fields.hour} ${fields.dayOfMonth} ${fields.month} *`,
            options,
          ),
          cronstrue.toString(
            `${seconds}${fields.minute} ${fields.hour} * ${fields.month} ${fields.dayOfWeek}`,
            options,
          ),
        ].join(language === "zh-CN" ? " 或 " : " OR ")
      : cronstrue.toString(expression, options),
    fields,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    nextRuns: schedule.nextRuns(5).map((date) => date.toISOString()),
  };
  return { ok: true, output: JSON.stringify(result) };
}

function fieldTerm(value: string): string {
  return `\\*(?:/[1-9]\\d*)?|(?:${value})(?:-(?:${value}))?(?:/[1-9]\\d*)?`;
}

function replaceNames(part: string, names: Record<string, string>): string {
  return part.replace(/[A-Z]+/g, (name) => names[name] ?? name);
}

function isStandardField(part: string, term: string): boolean {
  return new RegExp(`^(?:${term})(?:,(?:${term}))*$`).test(part);
}

function invalidInput(): ToolOutcome {
  return {
    ok: false,
    error: {
      code: "INVALID_INPUT",
      message:
        "Enter a five-field cron expression or six fields with leading seconds",
    },
  };
}
