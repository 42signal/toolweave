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

test("[UI-02] 切换工具保留输入并清除旧结果，压缩不带缩进配置", async () => {
  render(<App />);
  expect(screen.getByText("10 个工具")).toBeVisible();
  fireEvent.change(screen.getByLabelText("输入 JSON / YAML"), {
    target: { value: '{\n  "x": 1\n}' },
  });
  fireEvent.change(screen.getByLabelText("缩进"), { target: { value: "4" } });
  fireEvent.click(screen.getByRole("button", { name: "运行" }));
  latestWorker().respond({
    ok: true,
    output: '{\n    "x": 1\n}',
    durationMs: 1,
  });
  await waitFor(() =>
    expect(screen.getByLabelText("输出 JSON")).toHaveValue('{\n    "x": 1\n}'),
  );
  fireEvent.click(screen.getByRole("button", { name: "格式化" }));
  expect(screen.getByLabelText("输出 JSON")).toHaveValue('{\n    "x": 1\n}');
  fireEvent.click(screen.getByRole("button", { name: "压缩" }));
  expect(screen.getByRole("heading", { name: "压缩" })).toBeVisible();
  expect(screen.getByRole("button", { name: "压缩" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByLabelText("输入 JSON / YAML")).toHaveValue(
    '{\n  "x": 1\n}',
  );
  expect(screen.getByLabelText("输出 JSON")).toHaveValue("");
  expect(screen.getByRole("status")).toHaveTextContent("等待运行");
  expect(screen.queryByLabelText("缩进")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "运行" }));
  expect(latestWorker().requests).toEqual([
    {
      toolId: "minify",
      input: '{\n  "x": 1\n}',
      config: { inputFormat: "auto" },
    },
  ]);
  latestWorker().respond({ ok: true, output: '{"x":1}', durationMs: 1 });
  await waitFor(() =>
    expect(screen.getByLabelText("输出 JSON")).toHaveValue('{"x":1}'),
  );
  fireEvent.click(screen.getByRole("button", { name: "格式化" }));
  expect(screen.getByLabelText("输出 JSON")).toHaveValue("");
  expect(screen.getByLabelText("输入 JSON / YAML")).toHaveValue(
    '{\n  "x": 1\n}',
  );
});

test("[UI-03] 独立时间格式提交、运行中禁改配置，编辑后清结果", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Unix 时间转换" }));
  expect(screen.getByLabelText("输入格式")).toHaveValue("auto");
  expect(screen.getByLabelText("输出格式")).toHaveValue("seconds");
  fireEvent.change(screen.getByLabelText("输出格式"), {
    target: { value: "milliseconds" },
  });
  fireEvent.change(screen.getByLabelText("输入时间"), {
    target: { value: "1970-01-01T00:00:00Z" },
  });
  fireEvent.click(screen.getByRole("button", { name: "运行" }));
  expect(latestWorker().requests).toEqual([
    {
      toolId: "unix-time.convert",
      input: "1970-01-01T00:00:00Z",
      config: { inputFormat: "auto", outputFormat: "milliseconds" },
    },
  ]);
  expect(screen.getByLabelText("输入格式")).toBeDisabled();
  expect(screen.getByLabelText("输出格式")).toBeDisabled();
  latestWorker().respond({ ok: true, output: "0", durationMs: 1 });
  await waitFor(() =>
    expect(screen.getByLabelText("输出时间")).toHaveValue("0"),
  );
  fireEvent.change(screen.getByLabelText("输入格式"), {
    target: { value: "seconds" },
  });
  expect(screen.getByLabelText("输出时间")).toHaveValue("");
  expect(screen.getByRole("status")).toHaveTextContent("等待运行");
});

test("[UI-02] Base64 空输出仍为成功，错误不再显示 JSON 说明", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Base64 解码" }));
  fireEvent.click(screen.getByRole("button", { name: "运行" }));
  latestWorker().respond({ ok: true, output: "", durationMs: 1 });
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("完成"),
  );
  expect(screen.getByLabelText("输出文本")).toHaveValue("");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("输入 Base64"), {
    target: { value: "%%%" },
  });
  fireEvent.click(screen.getByRole("button", { name: "运行" }));
  latestWorker().respond({
    ok: false,
    error: { code: "INVALID_INPUT", message: "Private diagnostic" },
    durationMs: 1,
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "请输入有效的标准 Base64 和 UTF-8 文本。",
  );
  expect(screen.getByRole("alert")).not.toHaveTextContent(
    /INVALID_INPUT|JSON|Private diagnostic/,
  );
});

test("[UI-02] 压缩运行中禁切换，取消后恢复，切换清除错误和终态", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "压缩" }));
  fireEvent.click(screen.getByRole("button", { name: "运行" }));
  expect(screen.getByRole("button", { name: "格式化" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "压缩" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "格式化" }));
  expect(screen.getByRole("heading", { name: "压缩" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "取消运行" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "格式化" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "格式化" }));
  expect(screen.getByRole("status")).toHaveTextContent("等待运行");
  fireEvent.click(screen.getByRole("button", { name: "压缩" }));
  fireEvent.click(screen.getByRole("button", { name: "运行" }));
  latestWorker().respond({
    ok: false,
    error: { code: "INVALID_INPUT", message: "Private diagnostic" },
    durationMs: 1,
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "请输入有效的 JSON 或 YAML，请检查格式及所选输入类型。",
  );
  expect(screen.getByRole("alert")).not.toHaveTextContent(
    /INVALID_INPUT|Private diagnostic/,
  );
  fireEvent.click(screen.getByRole("button", { name: "格式化" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("等待运行");
});
