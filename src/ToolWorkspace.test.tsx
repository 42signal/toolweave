import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { App } from "./App";

import { latestWorker, TestWorker } from "./test/test-worker";

beforeEach(() => {
  TestWorker.instances = [];
  TestWorker.failConstruction = false;
  vi.stubGlobal("Worker", TestWorker);
});

afterEach(() => vi.unstubAllGlobals());

test("[UI-02] 运行期间不重复提交，成功后展示输出和耗时，编辑清除旧结果", async () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText("输入 JSON / YAML"), {
    target: { value: '{"x":1}' },
  });
  fireEvent.click(screen.getByRole("button", { name: "运行" }));
  expect(screen.getByRole("button", { name: "运行" })).toBeDisabled();
  expect(screen.getByLabelText("输入 JSON / YAML")).toBeDisabled();
  latestWorker().respond({
    ok: true,
    output: '{\n  "x": 1\n}',
    durationMs: 2.5,
  });
  await waitFor(() =>
    expect(screen.getByLabelText("输出 JSON")).toHaveValue('{\n  "x": 1\n}'),
  );
  expect(screen.getByRole("status")).toHaveTextContent("2.5 ms");
  fireEvent.change(screen.getByLabelText("输入 JSON / YAML"), {
    target: { value: "null" },
  });
  expect(screen.getByLabelText("输出 JSON")).toHaveValue("");
});

test("[UI-03] 配置随请求提交，失败清除输出并能重试", async () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText("缩进"), { target: { value: "4" } });
  fireEvent.click(screen.getByRole("button", { name: "运行" }));
  expect(latestWorker().requests).toEqual([
    {
      toolId: "format",
      input: "",
      config: { indent: 4, inputFormat: "auto", outputFormat: "json" },
    },
  ]);
  latestWorker().respond({
    ok: false,
    error: { code: "INVALID_INPUT", message: "请输入有效的 JSON" },
    durationMs: 1,
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "请输入有效的 JSON 或 YAML，请检查格式及所选输入类型。",
  );
  expect(screen.getByRole("alert")).not.toHaveTextContent("INVALID_INPUT");
  expect(screen.getByLabelText("输出 JSON")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("输入 JSON / YAML"), {
    target: { value: "{}" },
  });
  fireEvent.click(screen.getByRole("button", { name: "运行" }));
  latestWorker().respond({ ok: true, output: "{}", durationMs: 1 });
  await waitFor(() =>
    expect(screen.getByLabelText("输出 JSON")).toHaveValue("{}"),
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("缩进"), { target: { value: "2" } });
  expect(screen.getByLabelText("输出 JSON")).toHaveValue("");
});

test("[UI-02] 用户可以取消，卸载释放正在运行的 Worker", async () => {
  const view = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "运行" }));
  fireEvent.click(screen.getByRole("button", { name: "取消运行" }));
  expect(await screen.findByRole("status")).toHaveTextContent("已取消");
  expect(screen.getByRole("button", { name: "运行" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "运行" }));
  const worker = latestWorker();
  view.unmount();
  expect(worker.terminated).toBe(true);
});
