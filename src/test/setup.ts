import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { i18n } from "../i18n";

beforeEach(async () => {
  vi.spyOn(navigator, "languages", "get").mockReturnValue(["zh-CN"]);
  vi.spyOn(navigator, "language", "get").mockReturnValue("zh-CN");
  await i18n.changeLanguage("zh-CN");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
