import { parse } from "date-fns/parse";
import { timeInputFormats, timeOutputFormats } from "./formats";
import { isRecord } from "./protocol";
import type { ToolOutcome } from "./protocol";

const maximumNanoseconds = 8640000000000000000000n;

export function convertTime(input: string, config: unknown): ToolOutcome {
  if (
    !isRecord(config) ||
    Object.keys(config).some(
      (key) => key !== "inputFormat" && key !== "outputFormat",
    )
  )
    return {
      ok: false,
      error: { code: "INVALID_CONFIG", message: "Invalid time options" },
    };
  const inputFormat = "inputFormat" in config ? config.inputFormat : "auto";
  const outputFormat =
    "outputFormat" in config ? config.outputFormat : "seconds";
  if (
    !timeInputFormats.some((format) => format === inputFormat) ||
    !timeOutputFormats.some((format) => format === outputFormat)
  )
    return {
      ok: false,
      error: { code: "INVALID_CONFIG", message: "Unknown time format" },
    };

  const text = input.trim();
  const format = inputFormat === "auto" ? detectFormat(text) : inputFormat;
  const nanoseconds = !text
    ? BigInt(Date.now()) * 1000000n
    : format === "date"
      ? parseDate(text)
      : parseTimestamp(
          text,
          format === "seconds" ? 9 : format === "milliseconds" ? 6 : 0,
        );
  if (nanoseconds < -maximumNanoseconds || nanoseconds > maximumNanoseconds)
    throw new TypeError("Timestamp out of range");
  if (outputFormat !== "iso")
    return {
      ok: true,
      output: decimal(
        nanoseconds,
        outputFormat === "seconds"
          ? 9
          : outputFormat === "milliseconds"
            ? 6
            : 0,
      ),
    };

  const milliseconds =
    nanoseconds / 1000000n - (nanoseconds % 1000000n < 0n ? 1n : 0n);
  const fraction = (((nanoseconds % 1000000000n) + 1000000000n) % 1000000000n)
    .toString()
    .padStart(9, "0")
    .replace(/0{1,6}$/, "");
  return {
    ok: true,
    output: new Date(Number(milliseconds))
      .toISOString()
      .replace(/\.\d{3}Z$/, `.${fraction}Z`),
  };
}

function detectFormat(input: string): string {
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(input)) return "date";
  const whole = BigInt(input.split(".")[0] ?? "0");
  const absolute = whole < 0n ? -whole : whole;
  return absolute >= 100000000000000000n
    ? "nanoseconds"
    : absolute >= 100000000000n
      ? "milliseconds"
      : "seconds";
}

function parseTimestamp(input: string, places: number): bigint {
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(input))
    throw new TypeError("Expected decimal timestamp");
  const [whole = "0", fraction = ""] = input.split(".");
  if (fraction.length > places)
    throw new TypeError("Timestamp precision exceeded");
  return (
    BigInt(whole) * 10n ** BigInt(places) +
    (input.startsWith("-") ? -1n : 1n) *
      BigInt(fraction.padEnd(places, "0") || "0")
  );
}

function decimal(value: bigint, places: number): string {
  if (places === 0) return String(value);
  const absolute = value < 0n ? -value : value;
  const divisor = 10n ** BigInt(places);
  const fraction = String(absolute % divisor)
    .padStart(places, "0")
    .replace(/0+$/, "");
  return `${value < 0n ? "-" : ""}${absolute / divisor}${fraction ? `.${fraction}` : ""}`;
}

function parseDate(input: string): bigint {
  const match =
    /^(\d{4}|[+-]\d{6})([-/])(\d{2})\2(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?)?$/.exec(
      input,
    );
  if (!match) {
    const normalized = input.replace(/\b(?:GMT|UTC)$/, "+0000");
    const patterns = [
      "EEE, dd MMM yyyy HH:mm:ss xx",
      "dd MMM yyyy HH:mm:ss xx",
    ];
    const date = patterns
      .map((pattern) => parse(normalized, pattern, new Date(0)))
      .find((date) => Number.isFinite(date.getTime()));
    if (!date) throw new TypeError("Unsupported date format");
    return BigInt(date.getTime()) * 1000000n;
  }
  const year = Number(match[1]);
  const month = Number(match[3]);
  const day = Number(match[4]);
  const hour = Number(match[5] ?? 0);
  const minute = Number(match[6] ?? 0);
  const second = Number(match[7] ?? 0);
  const fraction = (match[8] ?? "").padEnd(9, "0");
  const zone = match[9];
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days =
    [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
      month - 1
    ] ?? 0;
  const offsetHour = zone && zone !== "Z" ? Number(zone.slice(1, 3)) : 0;
  const offsetMinute = zone && zone !== "Z" ? Number(zone.slice(-2)) : 0;
  if (
    day < 1 ||
    day > days ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  )
    throw new TypeError("Invalid calendar date");
  const date = new Date(0);
  if (zone) {
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(hour, minute, second, 0);
  } else {
    date.setFullYear(year, month - 1, day);
    date.setHours(hour, minute, second, 0);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() !== hour ||
      date.getMinutes() !== minute
    )
      throw new TypeError("Nonexistent local date");
  }
  if (!Number.isFinite(date.getTime()))
    throw new TypeError("Date out of range");
  const offset =
    (offsetHour * 60 + offsetMinute) * (zone?.startsWith("-") ? -1 : 1);
  return BigInt(date.getTime() - offset * 60000) * 1000000n + BigInt(fraction);
}
