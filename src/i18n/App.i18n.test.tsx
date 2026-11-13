import { act, fireEvent, render, screen } from "@testing-library/react";

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { App } from "../App";

import { i18n } from ".";

beforeEach(async () => {
  vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
  vi.spyOn(navigator, "language", "get").mockReturnValue("en-US");
  await i18n.changeLanguage("en");
});

afterEach(() => vi.unstubAllGlobals());

test("[I18N-02] 默认英文文案、无障碍名称和 html.lang 一致", () => {
  render(<App />);
  expect(screen.getByRole("main", { name: "Workspace" })).toBeVisible();

  expect(screen.getByText("0 tools")).toBeVisible();
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

  vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR", "zh-TW"]);
  await act(async () => {
    window.dispatchEvent(new Event("languagechange"));
    await Promise.resolve();
  });
  expect(screen.getByRole("main", { name: "工作区" })).toBeVisible();

  expect(document.documentElement.lang).toBe("zh-CN");
});

test("[I18N-04] 手动选择保留结果，跟随浏览器使用最新偏好，重开页面恢复自动", async () => {
  const view = render(<App />);

  fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
    target: { value: "zh-CN" },
  });
  expect(screen.getByRole("combobox", { name: "语言" })).toHaveValue("zh-CN");

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

  expect(document.documentElement.lang).toBe("zh-CN");
  fireEvent.change(screen.getByRole("combobox", { name: "语言" }), {
    target: { value: "en" },
  });
  view.unmount();
  render(<App />);
  expect(screen.getByRole("combobox", { name: "语言" })).toHaveValue("auto");
  expect(document.documentElement.lang).toBe("zh-CN");
});
