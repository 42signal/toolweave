import { format } from "./format";
import { minify } from "./minify";
import { isRecord } from "./protocol";
import type { ToolResult } from "./protocol";
import { decodeBase64, decodeJWT, encodeBase64 } from "./text-tools";
import { parseURL } from "./url-tools";
import { convertTime } from "./unix-time";

const textTools: Record<string, (input: string) => string> = {
  "base64.encode": encodeBase64,
  "base64.decode": decodeBase64,
  "url.encode": encodeURIComponent,
  "url.decode": decodeURIComponent,
  "jwt.decode": decodeJWT,
  "uuid.generate": () => crypto.randomUUID(),
  "url.parse": parseURL,
};

export function executeTool(request: unknown): ToolResult {
  if (
    !isRecord(request) ||
    typeof request.toolId !== "string" ||
    typeof request.input !== "string"
  ) {
    return {
      ok: false,
      error: { code: "EXECUTION_FAILED", message: "Invalid tool request" },
      durationMs: 0,
    };
  }

  const tool =
    request.toolId === "format"
      ? format
      : request.toolId === "minify"
        ? minify
        : null;
  if (
    !tool &&
    request.toolId !== "unix-time.convert" &&
    !Object.hasOwn(textTools, request.toolId)
  ) {
    return {
      ok: false,
      error: { code: "UNKNOWN_TOOL", message: "Tool not found" },
      durationMs: 0,
    };
  }

  const startedAt = performance.now();
  try {
    if (tool)
      return {
        ...tool.run(request.input, request.config),
        durationMs: performance.now() - startedAt,
      };
    if (request.toolId === "unix-time.convert")
      return {
        ...convertTime(request.input, request.config),
        durationMs: performance.now() - startedAt,
      };
    if (!isRecord(request.config) || Object.keys(request.config).length !== 0)
      return {
        ok: false,
        error: {
          code: "INVALID_CONFIG",
          message: "This tool accepts no options",
        },
        durationMs: performance.now() - startedAt,
      };
    const run = textTools[request.toolId];
    if (!run) throw new Error("Missing builtin implementation");
    return {
      ok: true,
      output: run(request.input),
      durationMs: performance.now() - startedAt,
    };
  } catch (error) {
    const invalid =
      error instanceof TypeError ||
      error instanceof SyntaxError ||
      error instanceof URIError;
    return {
      ok: false,
      error: {
        code: invalid ? "INVALID_INPUT" : "EXECUTION_FAILED",
        message: invalid
          ? "Invalid input for selected tool"
          : "Local tool execution failed",
      },
      durationMs: performance.now() - startedAt,
    };
  }
}
