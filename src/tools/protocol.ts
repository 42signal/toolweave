export type ToolRequest = {
  toolId: string;
  input: string;
  config: unknown;
};

export type ToolErrorCode =
  | "UNKNOWN_TOOL"
  | "INVALID_CONFIG"
  | "INVALID_INPUT"
  | "EXECUTION_FAILED"
  | "CANCELLED";

export type ToolOutcome =
  | { ok: true; output: string }
  | {
      ok: false;
      error: { code: ToolErrorCode; message: string };
    };

export type ToolResult = ToolOutcome & { durationMs: number };

export type ToolRun = {
  result: Promise<ToolResult>;
  cancel: () => void;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isToolResult(value: unknown): value is ToolResult {
  if (
    !isRecord(value) ||
    typeof value.durationMs !== "number" ||
    !Number.isFinite(value.durationMs) ||
    value.durationMs < 0
  ) {
    return false;
  }

  if (value.ok === true) return typeof value.output === "string";

  return (
    value.ok === false &&
    isRecord(value.error) &&
    typeof value.error.message === "string" &&
    typeof value.error.code === "string" &&
    [
      "UNKNOWN_TOOL",
      "INVALID_CONFIG",
      "INVALID_INPUT",
      "EXECUTION_FAILED",
      "CANCELLED",
    ].includes(value.error.code)
  );
}
