import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { App } from "../App";
import { latestWorker, TestWorker } from "../test/test-worker";
import { i18n } from ".";

beforeEach(async () => {
  vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
  vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
  await i18n.changeLanguage("en");
  TestWorker.instances = [];
  TestWorker.failConstruction = false;
  vi.stubGlobal("Worker", TestWorker);
});

afterEach(() => vi.unstubAllGlobals());

test("[I18N-02] 默认英文文案、无障碍名称和 html.lang 一致", () => {
  render(<App />);
  expect(screen.getByRole("main", { name: "Workspace" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Format" })).toBeVisible();
  expect(screen.getByLabelText("Input JSON / YAML")).toBeVisible();
  expect(screen.getByLabelText("Output JSON")).toHaveAttribute(
    "placeholder",
    "Run the tool to see the result",
  );
  expect(screen.getByRole("status")).toHaveTextContent("Ready");
  expect(screen.getByText("2 tools")).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Language" })).toHaveValue(
    "auto",
  );
  expect(document.documentElement.lang).toBe("en");
});

test("[I18N-02] 工具数量使用词典复数规则", () => {
  expect(i18n.t("workspace.tools", { count: 0 })).toBe("0 tools");
  expect(i18n.t("workspace.tools", { count: 1 })).toBe("1 tool");
  expect(i18n.t("workspace.tools", { count: 2 })).toBe("2 tools");
});

test("[I18N-03] 切换语言保留输入、缩进和已有结果", async () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Input JSON / YAML"), {
    target: { value: '{"x":1}' },
  });
  fireEvent.change(screen.getByLabelText("Indent"), { target: { value: "4" } });
  fireEvent.click(screen.getByRole("button", { name: "Run" }));
  latestWorker().respond({
    ok: true,
    output: '{\n    "x": 1\n}',
    durationMs: 2.5,
  });
  await waitFor(() =>
    expect(screen.getByLabelText("Output JSON")).toHaveValue(
      '{\n    "x": 1\n}',
    ),
  );
  vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR", "zh-TW"]);
  await act(async () => {
    window.dispatchEvent(new Event("languagechange"));
    await Promise.resolve();
  });
  expect(screen.getByRole("main", { name: "工作区" })).toBeVisible();
  expect(screen.getByLabelText("输入 JSON / YAML")).toHaveValue('{"x":1}');
  expect(screen.getByLabelText("输出 JSON")).toHaveValue('{\n    "x": 1\n}');
  expect(screen.getByLabelText("缩进")).toHaveValue("4");
  expect(screen.getByRole("status")).toHaveTextContent("完成 · 2.5 ms");
  expect(document.documentElement.lang).toBe("zh-CN");
});

test("[I18N-03] 运行中语言切换不取消任务，错误按当前语言显示", async () => {
  const view = render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Run" }));
  const worker = latestWorker();
  vi.spyOn(navigator, "languages", "get").mockReturnValue(["zh-CN"]);
  await act(async () => {
    window.dispatchEvent(new Event("languagechange"));
    await Promise.resolve();
  });
  expect(worker.terminated).toBe(false);
  expect(screen.getByRole("button", { name: "运行" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "取消运行" })).toBeEnabled();
  worker.respond({
    ok: false,
    error: { code: "INVALID_INPUT", message: "Private diagnostic" },
    durationMs: 1,
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "请输入有效的 JSON",
  );
  expect(screen.getByRole("alert")).not.toHaveTextContent("Private diagnostic");
  expect(screen.getByRole("alert")).not.toHaveTextContent("INVALID_INPUT");
  vi.spyOn(navigator, "languages", "get").mockReturnValue(["en"]);
  await act(async () => {
    window.dispatchEvent(new Event("languagechange"));
    await Promise.resolve();
  });
  expect(screen.getByRole("alert")).toHaveTextContent("Enter valid JSON");
  view.unmount();
  vi.spyOn(navigator, "languages", "get").mockReturnValue(["zh"]);
  await act(async () => {
    window.dispatchEvent(new Event("languagechange"));
    await Promise.resolve();
  });
  expect(document.documentElement.lang).toBe("en");
});

test("[I18N-02] 英文取消和执行失败不显示底层诊断", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Run" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel run" }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("Cancelled"),
  );
  fireEvent.click(screen.getByRole("button", { name: "Run" }));
  latestWorker().respond({
    ok: false,
    error: { code: "EXECUTION_FAILED", message: "Private diagnostic" },
    durationMs: 1,
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Local execution failed",
  );
  expect(screen.getByRole("alert")).not.toHaveTextContent("Private diagnostic");
  expect(screen.getByRole("alert")).not.toHaveTextContent("EXECUTION_FAILED");
});

test("[I18N-04] 手动选择保留结果，跟随浏览器使用最新偏好，重开页面恢复自动", async () => {
  const view = render(<App />);
  fireEvent.change(screen.getByLabelText("Input JSON / YAML"), {
    target: { value: '{"x":1}' },
  });
  fireEvent.change(screen.getByLabelText("Indent"), { target: { value: "4" } });
  fireEvent.click(screen.getByRole("button", { name: "Run" }));
  latestWorker().respond({
    ok: true,
    output: '{\n    "x": 1\n}',
    durationMs: 2.5,
  });
  await waitFor(() =>
    expect(screen.getByLabelText("Output JSON")).toHaveValue(
      '{\n    "x": 1\n}',
    ),
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
    target: { value: "zh-CN" },
  });
  expect(screen.getByRole("combobox", { name: "语言" })).toHaveValue("zh-CN");
  expect(screen.getByLabelText("输入 JSON / YAML")).toHaveValue('{"x":1}');
  expect(screen.getByLabelText("输出 JSON")).toHaveValue('{\n    "x": 1\n}');
  expect(screen.getByLabelText("缩进")).toHaveValue("4");
  expect(document.documentElement.lang).toBe("zh-CN");
  vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-GB"]);
  await act(async () => {
    window.dispatchEvent(new Event("languagechange"));
    await Promise.resolve();
  });
  expect(document.documentElement.lang).toBe("zh-CN");
  fireEvent.change(screen.getByRole("combobox", { name: "语言" }), {
    target: { value: "en" },
  });
  expect(screen.getByRole("combobox", { name: "Language" })).toHaveValue("en");
  vi.spyOn(navigator, "languages", "get").mockReturnValue(["zh-HK"]);
  await act(async () => {
    window.dispatchEvent(new Event("languagechange"));
    await Promise.resolve();
  });
  expect(document.documentElement.lang).toBe("en");
  fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
    target: { value: "auto" },
  });
  expect(screen.getByRole("combobox", { name: "语言" })).toHaveValue("auto");
  expect(screen.getByLabelText("输出 JSON")).toHaveValue('{\n    "x": 1\n}');
  expect(document.documentElement.lang).toBe("zh-CN");
  fireEvent.change(screen.getByRole("combobox", { name: "语言" }), {
    target: { value: "en" },
  });
  view.unmount();
  render(<App />);
  expect(screen.getByRole("combobox", { name: "语言" })).toHaveValue("auto");
  expect(document.documentElement.lang).toBe("zh-CN");
});

test("[I18N-04] 运行中可手动切换，不中断任务且错误只显示友好提示", async () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText("Input JSON / YAML"), {
    target: { value: "{" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Run" }));
  const worker = latestWorker();
  fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
    target: { value: "zh-CN" },
  });
  expect(screen.getByRole("button", { name: "运行" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "取消运行" })).toBeEnabled();
  expect(screen.getByLabelText("输入 JSON / YAML")).toHaveValue("{");
  expect(worker.terminated).toBe(false);
  worker.respond({
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
  fireEvent.change(screen.getByRole("combobox", { name: "语言" }), {
    target: { value: "en" },
  });
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Enter valid JSON or YAML. Check the syntax and selected input format.",
  );
  expect(screen.getByRole("alert")).not.toHaveTextContent(
    /INVALID_INPUT|Private diagnostic/,
  );
  expect(TestWorker.instances).toHaveLength(1);
});
