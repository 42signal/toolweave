import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { App } from "./App";
import { latestWorker, TestWorker } from "./test/test-worker";

beforeEach(() => {
  TestWorker.instances = [];
  TestWorker.failConstruction = false;
  vi.stubGlobal("Worker", TestWorker);
});

afterEach(() => vi.unstubAllGlobals());

function editExpression(value: string) {
  const editor = screen.getByRole("textbox", { name: "Cron 表达式" });
  fireEvent.input(editor, { target: { textContent: value } });
  return editor;
}

function selectExpression(start: number, end = start) {
  const editor = screen.getByRole("textbox", { name: "Cron 表达式" });
  const range = document.createRange();
  range.setStart(editor.firstChild!, start);
  range.setEnd(editor.firstChild!, end);
  window.getSelection()!.removeAllRanges();
  window.getSelection()!.addRange(range);
  fireEvent(document, new Event("selectionchange"));
}

test("[CRON-UI] one custom editor preserves incomplete edits and follows the selected field", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Cron 解析" }));
  const editor = editExpression("*/5 9-17 * * 1-5");
  expect(editor.tagName).not.toBe("INPUT");
  expect(editor).toHaveAttribute("contenteditable", "plaintext-only");
  expect(screen.getAllByRole("textbox")).toHaveLength(1);
  selectExpression(5, 8);
  const help = screen.getByRole("list", { name: "字段提示" });
  expect(help).toHaveTextContent("小时");
  expect(help).toHaveTextContent("0–23");
  expect(help).toHaveTextContent("范围");
  editExpression("*/5  * * 1-5");
  expect(editor).toHaveTextContent("*/5 * * 1-5");
  editExpression("*/5 10-18 * * 1-5");
  await waitFor(() => expect(TestWorker.instances).toHaveLength(1));
  expect(latestWorker().requests).toEqual([
    {
      toolId: "cron.parse",
      input: "*/5 10-18 * * 1-5",
      config: { language: "zh-CN" },
    },
  ]);
});

test("[CRON-UI] editing or leaving cancels stale previews and preserves shared input", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Cron 解析" }));
  fireEvent.click(screen.getByRole("button", { name: "每分钟" }));
  await waitFor(() => expect(TestWorker.instances).toHaveLength(1));
  const oldWorker = latestWorker();
  editExpression("0 * * * *");
  expect(oldWorker.terminated).toBe(true);
  await waitFor(() => expect(TestWorker.instances).toHaveLength(2));
  const activeWorker = latestWorker();
  oldWorker.respond({ ok: true, output: "stale result", durationMs: 1 });
  expect(screen.queryByText("stale result")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "格式化" }));
  expect(activeWorker.terminated).toBe(true);
  expect(screen.getByLabelText("输入 JSON / YAML")).toHaveValue("0 * * * *");
});

test("[UI-HOST] debounce and unmount discard pending and active previews", async () => {
  vi.useFakeTimers();
  try {
    const view = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Cron 解析" }));
    editExpression("0 * * * *");
    await act(() => vi.advanceTimersByTimeAsync(149));
    expect(TestWorker.instances).toHaveLength(0);
    editExpression("5 * * * *");
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(TestWorker.instances).toHaveLength(1);
    expect(latestWorker().requests).toEqual([
      {
        toolId: "cron.parse",
        input: "5 * * * *",
        config: { language: "zh-CN" },
      },
    ]);
    const worker = latestWorker();
    view.unmount();
    expect(worker.terminated).toBe(true);
    const pending = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Cron 解析" }));
    fireEvent.click(screen.getByRole("button", { name: "每天" }));
    pending.unmount();
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(TestWorker.instances).toHaveLength(1);
  } finally {
    vi.useRealTimers();
  }
});

test("[CRON-UI] selection updates the hint list, copy and random use current input", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal(
    "navigator",
    Object.create(navigator, { clipboard: { value: { writeText } } }),
  );
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Cron 解析" }));
  editExpression("*/5 9-17 * * 1-5");
  selectExpression(5, 9);
  expect(screen.getByRole("list", { name: "字段提示" })).toHaveTextContent(
    "小时",
  );
  expect(screen.getByRole("list", { name: "字段提示" })).toHaveTextContent(
    "0–23",
  );
  expect(screen.getByRole("list", { name: "字段提示" })).toHaveTextContent(
    "范围",
  );
  selectExpression(13);
  expect(screen.getByRole("list", { name: "字段提示" })).toHaveTextContent(
    "SUN–SAT",
  );
  fireEvent.click(screen.getByRole("button", { name: "复制" }));
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith("*/5 9-17 * * 1-5"),
  );
  expect(await screen.findByRole("button", { name: "已复制" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "随机" }));
  expect(screen.getByLabelText("Cron 表达式")).toHaveTextContent("30 12 * * *");
  expect(screen.getByRole("button", { name: "复制" })).toBeEnabled();
  writeText.mockRejectedValueOnce(new Error("secret clipboard diagnostic"));
  fireEvent.click(screen.getByRole("button", { name: "复制" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "无法复制，请选中表达式手动复制。",
  );
  expect(screen.getByRole("alert")).not.toHaveTextContent("secret");
});

test("[CRON-UI] friendly failure recovers; language switch preserves input and refreshes description", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Cron 解析" }));
  editExpression("60 * * * *");
  await waitFor(() => expect(TestWorker.instances).toHaveLength(1));
  latestWorker().respond({
    ok: false,
    error: { code: "INVALID_INPUT", message: "secret diagnostic" },
    durationMs: 1,
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "请输入五段或六段",
  );
  expect(screen.getByRole("alert")).not.toHaveTextContent(
    /INVALID_INPUT|secret/,
  );
  fireEvent.click(screen.getByRole("button", { name: "每分钟" }));
  await waitFor(() => expect(TestWorker.instances).toHaveLength(2));
  latestWorker().respond({
    ok: true,
    output: JSON.stringify({
      expression: "* * * * *",
      description: "每分钟",
      timezone: "Asia/Shanghai",
      nextRuns: [],
    }),
    durationMs: 1,
  });
  expect(await screen.findByText("没有后续执行时间。")).toBeVisible();
  fireEvent.change(screen.getByRole("combobox", { name: "语言" }), {
    target: { value: "en" },
  });
  expect(screen.getByLabelText("Cron expression")).toHaveTextContent(
    "* * * * *",
  );
  await waitFor(() => expect(TestWorker.instances).toHaveLength(3));
  expect(latestWorker().requests).toEqual([
    { toolId: "cron.parse", input: "* * * * *", config: { language: "en" } },
  ]);
});

test("[CRON-EDITOR] paste detects six fields, mode and presets preserve seconds, unsupported text is rejected", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Cron 解析" }));
  const editor = screen.getByRole("textbox", { name: "Cron 表达式" });
  editor.focus();
  fireEvent.paste(editor, {
    clipboardData: { getData: () => "*/10 * * * * *" },
  });
  expect(editor).toHaveTextContent("*/10 * * * * *");
  expect(screen.getByRole("button", { name: "六段（含秒）" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  selectExpression(2);
  expect(screen.getByRole("list", { name: "字段提示" })).toHaveTextContent(
    "秒",
  );
  await waitFor(() => expect(TestWorker.instances).toHaveLength(1));
  expect(latestWorker().requests).toEqual([
    {
      toolId: "cron.parse",
      input: "*/10 * * * * *",
      config: { language: "zh-CN" },
    },
  ]);
  fireEvent.click(screen.getByRole("button", { name: "每天" }));
  expect(editor).toHaveTextContent("0 0 0 * * *");
  fireEvent.click(screen.getByRole("button", { name: "随机" }));
  expect(editor.textContent?.trim().split(/\s+/)).toHaveLength(6);
  fireEvent.click(screen.getByRole("button", { name: "五段" }));
  expect(editor.textContent?.trim().split(/\s+/)).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: "六段（含秒）" }));
  expect(editor.textContent).toMatch(/^0 /);
  editExpression("");
  expect(screen.getByRole("button", { name: "复制" })).toBeDisabled();
  fireEvent.paste(editor, {
    clipboardData: { getData: () => '<img src=x onerror="alert(1)">' },
  });
  expect(editor.textContent).toBe("");
  expect(editor.querySelector("img")).toBeNull();
  expect(fireEvent.keyDown(editor, { key: "Enter" })).toBe(false);
});

test("[CRON-EDITOR] rejects unsupported typing and paste atomically while allowing partial names", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Cron 解析" }));
  const editor = editExpression("0 9 * * MON-FRI");
  selectExpression(2, 3);
  expect(fireEvent.keyDown(editor, { key: "@" })).toBe(false);
  expect(window.getSelection()!.toString()).toBe("9");
  fireEvent.paste(editor, {
    clipboardData: { getData: () => "10?" },
  });
  expect(editor.textContent).toBe("0 9 * * MON-FRI");
  expect(window.getSelection()!.toString()).toBe("9");
  for (const value of ["?", "L", "W", "#", "+", "中文", "@daily"]) {
    editExpression(`0 9 ${value} * MON-FRI`);
    expect(editor.textContent).toBe("0 9 * * MON-FRI");
  }
  for (const month of ["j", "ju", "jul", "a", "au", "aug"]) {
    editExpression(`0 9 * ${month} MON-FRI`);
    expect(editor.textContent).toBe(`0 9 * ${month} MON-FRI`);
  }
  editExpression("0 9 * aug WED");
  expect(editor.textContent).toBe("0 9 * aug WED");
  selectExpression(0, editor.textContent.length);
  fireEvent.paste(editor, {
    clipboardData: { getData: () => "*/10\n* * * JAN MON" },
  });
  expect(editor.textContent).toBe("*/10 * * * JAN MON");
  selectExpression(0);
  fireEvent.input(editor, {
    target: { textContent: "秒*/10 * * * JAN MON" },
    isComposing: true,
  });
  expect(editor.textContent).toBe("*/10 * * * JAN MON");
  fireEvent.input(editor, {
    target: { textContent: "*/10 * * JAN MON" },
    inputType: "deleteContentBackward",
  });
  expect(editor.textContent).toBe("*/10 * * JAN MON");
});

test("[CRON-EDITOR] keyboard selects fields, exits at edges, and paste replaces only the selection", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Cron 解析" }));
  const editor = editExpression("*/5 9-17 * * 1-5");
  const help = screen.getByRole("list", { name: "字段提示" });
  fireEvent.click(screen.getByRole("button", { name: "分钟" }));
  expect(window.getSelection()!.toString()).toBe("*/5");
  expect(fireEvent.keyDown(editor, { key: "Tab", shiftKey: true })).toBe(true);
  expect(fireEvent.keyDown(editor, { key: "Tab" })).toBe(false);
  expect(window.getSelection()!.toString()).toBe("9-17");
  expect(help).toHaveTextContent("小时");
  fireEvent.paste(editor, { clipboardData: { getData: () => "10-18" } });
  expect(editor).toHaveTextContent("*/5 10-18 * * 1-5");
  expect(fireEvent.keyDown(editor, { key: "Tab", shiftKey: true })).toBe(false);
  expect(help).toHaveTextContent("分钟");
  fireEvent.click(screen.getByRole("button", { name: "星期" }));
  expect(fireEvent.keyDown(editor, { key: "Tab" })).toBe(true);
  expect(fireEvent.keyDown(editor, { key: "Enter", isComposing: true })).toBe(
    true,
  );
  editExpression("");
  fireEvent.click(screen.getByRole("button", { name: "六段（含秒）" }));
  expect(editor).toHaveTextContent("0 * * * * *");
  editExpression("");
  fireEvent.click(screen.getByRole("button", { name: "五段" }));
  expect(editor.textContent).toBe("* * * * *");
});
