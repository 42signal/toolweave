import { expect, test } from "vitest";
import { resolveLocale } from "./locale";

test.each([
  { languages: [], expected: "en" },
  { languages: ["fr-FR", "de-DE"], expected: "en" },
  { languages: ["en-US", "zh-CN"], expected: "en" },
  { languages: ["fr-FR", "zh-TW", "en"], expected: "zh-CN" },
  { languages: ["zh-Hant-HK", "en-GB"], expected: "zh-CN" },
  { languages: ["zh"], expected: "zh-CN" },
  { languages: ["EN-gb"], expected: "en" },
  { languages: ["ZH-cn"], expected: "zh-CN" },
  { languages: ["zhx", "english", ""], expected: "en" },
])("[I18N-01] 按首个支持语言匹配：$languages", ({ languages, expected }) => {
  expect(resolveLocale(languages)).toBe(expected);
});

test("[I18N-01] 缺少语言信息时使用英文", () => {
  expect(resolveLocale()).toBe("en");
});
