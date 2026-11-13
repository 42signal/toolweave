import { parseDocument, stringify } from "yaml";
import { dataInputFormats, dataOutputFormats } from "./formats";
import { isRecord } from "./protocol";
import type { ToolOutcome } from "./protocol";

export type DataValue =
  null | boolean | number | string | DataValue[] | { [key: string]: DataValue };

export function parseData(input: string, format: string = "auto"): DataValue {
  if (!input.trim()) throw new SyntaxError("Empty structured input");
  if (format === "json") {
    const value: unknown = JSON.parse(input);
    return jsonValue(value);
  }
  if (format === "auto") {
    try {
      const value: unknown = JSON.parse(input);
      return jsonValue(value);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  const document = parseDocument(input, { schema: "core" });
  if (document.errors.length || document.warnings.length)
    throw new SyntaxError("Invalid YAML document");
  const value: unknown = document.toJS({ mapAsMap: true });
  return jsonValue(value);
}

export function convertData(
  input: string,
  config: unknown,
  minify: boolean,
): ToolOutcome {
  const allowed = minify
    ? ["inputFormat"]
    : ["inputFormat", "outputFormat", "indent"];
  if (
    !isRecord(config) ||
    Object.keys(config).some((key) => !allowed.includes(key))
  )
    return {
      ok: false,
      error: {
        code: "INVALID_CONFIG",
        message: "Invalid structured data options",
      },
    };
  const inputFormat = "inputFormat" in config ? config.inputFormat : "auto";
  const outputFormat = "outputFormat" in config ? config.outputFormat : "json";
  const indent = "indent" in config ? config.indent : 2;
  if (
    !dataInputFormats.some((format) => format === inputFormat) ||
    !dataOutputFormats.some((format) => format === outputFormat) ||
    typeof indent !== "number" ||
    !Number.isInteger(indent) ||
    indent < 0 ||
    indent > 8
  )
    return {
      ok: false,
      error: {
        code: "INVALID_CONFIG",
        message: "Unsupported structured data format or indent",
      },
    };
  const value = parseData(input, String(inputFormat));
  return {
    ok: true,
    output:
      outputFormat === "yaml"
        ? stringify(value, { indent: Math.max(1, indent), lineWidth: 0 })
        : JSON.stringify(value, null, minify ? 0 : indent),
  };
}

function jsonValue(value: unknown, ancestors = new Set<object>()): DataValue {
  if (value === null || typeof value === "boolean" || typeof value === "string")
    return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object" || value === null || ancestors.has(value))
    throw new TypeError("Expected acyclic JSON-compatible data");
  ancestors.add(value);
  const converted = Array.isArray(value)
    ? value.map((item: unknown) => jsonValue(item, ancestors))
    : mapValue(value, ancestors);
  ancestors.delete(value);
  return converted;
}

function mapValue(
  value: object,
  ancestors: Set<object>,
): { [key: string]: DataValue } {
  const entries: [unknown, unknown][] =
    value instanceof Map ? Array.from(value.entries()) : Object.entries(value);
  return Object.fromEntries(
    entries.map(([key, entry]) => {
      if (typeof key !== "string")
        throw new TypeError("Expected string mapping keys");
      return [key, jsonValue(entry, ancestors)];
    }),
  );
}
