import { isToolResult } from "./protocol";
import type { ToolRequest, ToolResult, ToolRun } from "./protocol";

export function startTool(request: ToolRequest): ToolRun {
  const startedAt = performance.now();
  let resolveResult: (result: ToolResult) => void;
  const result = new Promise<ToolResult>((resolve) => {
    resolveResult = resolve;
  });
  let worker: Worker | undefined;
  let settled = false;

  function finish(result: ToolResult) {
    if (settled) return;
    settled = true;
    worker?.terminate();
    resolveResult(result);
  }

  function fail() {
    finish({
      ok: false,
      error: {
        code: "EXECUTION_FAILED",
        message: "Local execution failed. Try again",
      },
      durationMs: performance.now() - startedAt,
    });
  }

  try {
    worker = new Worker(new URL("./tool.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (!isToolResult(event.data)) {
        fail();
        return;
      }
      finish(event.data);
    });
    worker.addEventListener("error", (event) => {
      event.preventDefault();
      fail();
    });
    worker.addEventListener("messageerror", fail);
    worker.postMessage(request);
  } catch {
    fail();
  }

  return {
    result,
    cancel: () =>
      finish({
        ok: false,
        error: { code: "CANCELLED", message: "Execution cancelled" },
        durationMs: performance.now() - startedAt,
      }),
  };
}
