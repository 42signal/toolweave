import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { latestWorker, TestWorker } from "../test/test-worker";
import { startTool } from "./start-tool";

const request = { toolId: "format", input: "{}", config: {} };

beforeEach(() => {
  TestWorker.instances = [];
  TestWorker.failConstruction = false;
  vi.stubGlobal("Worker", TestWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("[CT-04] 执行服务返回 Worker 结果并释放 Worker", async () => {
  const task = startTool(request);
  const worker = latestWorker();
  worker.respond({ ok: true, output: "{}", durationMs: 1 });
  await expect(task.result).resolves.toEqual({
    ok: true,
    output: "{}",
    durationMs: 1,
  });
  expect(worker.terminated).toBe(true);
});

test("[CT-04] 不同运行的结果不会串线", async () => {
  const first = startTool(request);
  const firstWorker = latestWorker();
  const second = startTool(request);
  latestWorker().respond({ ok: true, output: "second", durationMs: 1 });
  firstWorker.respond({ ok: true, output: "first", durationMs: 2 });
  await expect(first.result).resolves.toMatchObject({ output: "first" });
  await expect(second.result).resolves.toMatchObject({ output: "second" });
});

test("[UI-02] 取消硬终止 Worker，迟到响应不能覆盖取消结果", async () => {
  const task = startTool(request);
  const worker = latestWorker();
  task.cancel();
  worker.respond({ ok: true, output: "late", durationMs: 1 });
  await expect(task.result).resolves.toMatchObject({
    ok: false,
    error: { code: "CANCELLED" },
  });
  expect(worker.terminated).toBe(true);
  task.cancel();
});

test.each(["error", "messageerror"])(
  "[CT-05] Worker %s 明确失败并释放",
  async (event) => {
    const task = startTool(request);
    const worker = latestWorker();
    worker.dispatchEvent(new Event(event));
    await expect(task.result).resolves.toMatchObject({
      ok: false,
      error: { code: "EXECUTION_FAILED" },
    });
    expect(worker.terminated).toBe(true);
  },
);

test.each([
  null,
  { ok: true, output: 42, durationMs: 1 },
  { ok: true, output: "{}", durationMs: -1 },
  { ok: true, output: "{}", durationMs: Infinity },
  { ok: false, error: { code: "UNKNOWN", message: "bad" }, durationMs: 1 },
  { ok: false, error: { code: "INVALID_INPUT", message: 42 }, durationMs: 1 },
])("[CT-04] 非法 Worker 响应不作为成功结果：%j", async (response) => {
  const task = startTool(request);
  latestWorker().respond(response);
  await expect(task.result).resolves.toMatchObject({
    ok: false,
    error: { code: "EXECUTION_FAILED" },
  });
});

test("[CT-04] 合法工具错误保持原错误码", async () => {
  const task = startTool(request);
  latestWorker().respond({
    ok: false,
    error: { code: "INVALID_INPUT", message: "无效 JSON" },
    durationMs: 1,
  });
  await expect(task.result).resolves.toMatchObject({
    ok: false,
    error: { code: "INVALID_INPUT" },
  });
});

test("[CT-05] Worker 无法启动时明确失败", async () => {
  TestWorker.failConstruction = true;
  const task = startTool(request);
  await expect(task.result).resolves.toMatchObject({
    ok: false,
    error: { code: "EXECUTION_FAILED" },
  });
  task.cancel();
});

test("[CT-05] 消息发送失败会释放 Worker 并返回错误", async () => {
  vi.spyOn(TestWorker.prototype, "postMessage").mockImplementationOnce(() => {
    throw new Error("Could not post message");
  });
  const task = startTool(request);
  await expect(task.result).resolves.toMatchObject({
    ok: false,
    error: { code: "EXECUTION_FAILED" },
  });
  expect(latestWorker().terminated).toBe(true);
});
