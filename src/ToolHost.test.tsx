import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, expectTypeOf, test, vi } from "vitest";
import { ToolHost } from "./ToolHost";
import type { ToolUI } from "./tools/ui";
import { latestWorker, TestWorker } from "./test/test-worker";

test("[UI-REG] custom panels independently fall back to standard editors", async () => {
  TestWorker.instances = [];
  vi.stubGlobal("Worker", TestWorker);
  const props = {
    toolId: "base64.encode" as const,
    input: "hello",
    config: {},
    onInputChange: vi.fn(),
    onConfigChange: vi.fn(),
    onBusyChange: vi.fn(),
  };
  const view = render(
    <ToolHost
      {...props}
      registration={{
        ui: {
          kind: "panels",
          Input: ({ input, onInputChange }) => (
            <button type="button" onClick={() => onInputChange(input + "!")}>
              Custom input
            </button>
          ),
        },
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Custom input" }));
  expect(props.onInputChange).toHaveBeenCalledWith("hello!");
  expect(screen.queryByLabelText("输入文本")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "运行" }));
  expect(latestWorker().requests).toEqual([
    { toolId: "base64.encode", input: "hello", config: {} },
  ]);
  latestWorker().respond({ ok: true, output: "encoded result", durationMs: 1 });
  await waitFor(() =>
    expect(screen.getByLabelText("输出 Base64")).toHaveValue("encoded result"),
  );
  view.rerender(
    <ToolHost
      {...props}
      registration={{
        ui: {
          kind: "panels",
          Output: ({ result }) => (
            <p>{result?.ok ? result.output : "Custom output"}</p>
          ),
        },
      }}
    />,
  );
  expect(screen.getByLabelText("输入文本")).toHaveValue("hello");
  expect(screen.getByText("encoded result")).toBeVisible();
  expect(screen.queryByLabelText("输出 Base64")).not.toBeInTheDocument();
  vi.unstubAllGlobals();
});

test("[UI-REG] a workspace replaces both panels and uses host execution", async () => {
  TestWorker.instances = [];
  vi.stubGlobal("Worker", TestWorker);
  const Workspace = (props: { run: () => void; cancel: () => void }) => (
    <div>
      <p>Whole workspace</p>
      <button type="button" onClick={props.run}>
        Workspace run
      </button>
      <button type="button" onClick={props.cancel}>
        Workspace cancel
      </button>
    </div>
  );
  expectTypeOf<{
    kind: "workspace";
    Workspace: typeof Workspace;
    Input: typeof Workspace;
  }>().not.toExtend<ToolUI>();
  expectTypeOf<{
    kind: "panels";
    Workspace: typeof Workspace;
  }>().not.toExtend<ToolUI>();
  render(
    <ToolHost
      toolId="base64.encode"
      input=""
      config={{}}
      registration={{ ui: { kind: "workspace", Workspace } }}
      onInputChange={vi.fn()}
      onConfigChange={vi.fn()}
      onBusyChange={vi.fn()}
    />,
  );
  expect(screen.getByText("Whole workspace")).toBeVisible();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "运行" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Workspace run" }));
  expect(latestWorker().requests).toEqual([
    { toolId: "base64.encode", input: "", config: {} },
  ]);
  expect(screen.getByRole("button", { name: "运行" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Workspace cancel" }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("已取消"),
  );
  expect(latestWorker().terminated).toBe(true);
  vi.unstubAllGlobals();
});

test("[UI-HOST] live execution debounces edits and discards stale or unmounted work", async () => {
  TestWorker.instances = [];
  vi.stubGlobal("Worker", TestWorker);
  vi.useFakeTimers();
  try {
    const props = {
      toolId: "base64.encode" as const,
      input: "first",
      config: {},
      registration: { execution: { kind: "live" as const, debounceMs: 150 } },
      onInputChange: vi.fn(),
      onConfigChange: vi.fn(),
      onBusyChange: vi.fn(),
    };
    const view = render(<ToolHost {...props} />);
    await act(() => vi.advanceTimersByTimeAsync(149));
    expect(TestWorker.instances).toHaveLength(0);
    view.rerender(<ToolHost {...props} input="second" />);
    await act(() => vi.advanceTimersByTimeAsync(150));
    const oldWorker = latestWorker();
    expect(oldWorker.requests).toEqual([
      { toolId: "base64.encode", input: "second", config: {} },
    ]);
    view.rerender(<ToolHost {...props} input="third" />);
    expect(oldWorker.terminated).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(150));
    const currentWorker = latestWorker();
    act(() => oldWorker.respond({ ok: true, output: "stale", durationMs: 1 }));
    expect(screen.getByLabelText("输出 Base64")).toHaveValue("");
    view.unmount();
    expect(currentWorker.terminated).toBe(true);
    const pending = render(<ToolHost {...props} />);
    pending.unmount();
    await act(() => vi.advanceTimersByTimeAsync(150));
    expect(TestWorker.instances).toHaveLength(2);
    expect(props.onBusyChange).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
