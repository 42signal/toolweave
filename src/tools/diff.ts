import { createTwoFilesPatch } from "diff";
import { diffModes } from "./formats";
import { isRecord } from "./protocol";
import type { ToolOutcome } from "./protocol";
import { parseData } from "./structured-data";
import type { DataValue } from "./structured-data";

type Patch =
  | { op: "remove"; path: string }
  | { op: "add" | "replace"; path: string; value: DataValue };

export function compareDiff(input: string, config: unknown): ToolOutcome {
  if (!isRecord(config) || Object.keys(config).some((key) => key !== "mode"))
    return {
      ok: false,
      error: { code: "INVALID_CONFIG", message: "Invalid comparison options" },
    };
  const mode = "mode" in config ? config.mode : "auto";
  if (!diffModes.some((supported) => supported === mode))
    return {
      ok: false,
      error: { code: "INVALID_CONFIG", message: "Unknown comparison mode" },
    };
  const data: unknown = JSON.parse(input);
  if (
    !isRecord(data) ||
    Object.keys(data).length !== 2 ||
    typeof data.before !== "string" ||
    typeof data.after !== "string"
  )
    throw new TypeError("Expected before and after strings");
  const before =
    mode === "text"
      ? null
      : structuredInput(data.before, mode === "structured");
  const after =
    mode === "text" ? null : structuredInput(data.after, mode === "structured");
  if (before !== null && after !== null)
    return {
      ok: true,
      output: JSON.stringify(patches(before, after, ""), null, 2),
    };
  return {
    ok: true,
    output:
      data.before === data.after
        ? ""
        : createTwoFilesPatch("before", "after", data.before, data.after),
  };
}

function structuredInput(
  input: string,
  required: boolean,
): DataValue[] | { [key: string]: DataValue } | null {
  try {
    const value = parseData(input);
    if (value !== null && typeof value === "object") return value;
    if (required) throw new TypeError("Expected object or array");
    return null;
  } catch (error) {
    if (
      required ||
      (!(error instanceof SyntaxError) && !(error instanceof TypeError))
    )
      throw error;
    return null;
  }
}

function patches(before: DataValue, after: DataValue, path: string): Patch[] {
  if (before === after) return [];
  if (Array.isArray(before) && Array.isArray(after)) {
    return [
      ...before
        .slice(0, after.length)
        .flatMap((value, index) =>
          patches(value, after[index]!, `${path}/${index}`),
        ),
      ...before.slice(after.length).map((_, index) => ({
        op: "remove" as const,
        path: `${path}/${before.length - 1 - index}`,
      })),
      ...after.slice(before.length).map((value, index) => ({
        op: "add" as const,
        path: `${path}/${before.length + index}`,
        value,
      })),
    ];
  }
  if (isRecord(before) && isRecord(after)) {
    return [
      ...Object.keys(before)
        .filter((key) => !Object.hasOwn(after, key))
        .map((key) => ({ op: "remove" as const, path: pointer(path, key) })),
      ...Object.entries(after).flatMap(([key, value]) =>
        Object.hasOwn(before, key)
          ? patches(before[key]!, value, pointer(path, key))
          : [{ op: "add" as const, path: pointer(path, key), value }],
      ),
    ];
  }
  return [{ op: "replace", path, value: after }];
}

function pointer(path: string, key: string): string {
  return `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
}
