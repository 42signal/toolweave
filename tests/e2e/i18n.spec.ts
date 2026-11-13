import { expect, test } from "@playwright/test";

for (const scenario of [
  {
    locale: "en-US",
    lang: "en",
    workspace: "Workspace",
    title: "Format",
    input: "Input JSON",
    output: "Output JSON",
    run: "Run",
    error: "Enter valid JSON",
  },
  {
    locale: "zh-CN",
    lang: "zh-CN",
    workspace: "工作区",
    title: "格式化",
    input: "输入 JSON",
    output: "输出 JSON",
    run: "运行",
    error: "请输入有效的 JSON",
  },
  {
    locale: "fr-FR",
    lang: "en",
    workspace: "Workspace",
    title: "Format",
    input: "Input JSON",
    output: "Output JSON",
    run: "Run",
    error: "Enter valid JSON",
  },
]) {
  test.describe(scenario.locale, () => {
    test.use({ locale: scenario.locale });

    test("[I18N-E01] 浏览器语言决定文案，格式化及错误可用", async ({
      page,
    }) => {
      const unexpected: string[] = [];
      page.on("request", (request) => {
        if (new URL(request.url()).origin !== "http://127.0.0.1:4173")
          unexpected.push(request.url());
      });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("lang", scenario.lang);
      await expect(
        page.getByRole("main", { name: scenario.workspace }),
      ).toBeVisible();

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(375);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", scenario.lang);
      expect(unexpected).toEqual([]);
    });
  });
}

test.describe("languagechange", () => {
  test.use({ locale: "en-US" });

  test("[I18N-E02] 英中切换保留输入配置和结果，错误重新翻译", async ({
    page,
  }) => {
    await page.goto("/");

    await page.evaluate(() => {
      Object.defineProperty(navigator, "languages", {
        configurable: true,
        value: ["fr-FR", "zh-HK"],
      });
      window.dispatchEvent(new Event("languagechange"));
    });
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");

    await page.evaluate(() => {
      Object.defineProperty(navigator, "languages", {
        configurable: true,
        value: ["en-GB"],
      });
      window.dispatchEvent(new Event("languagechange"));
    });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("[I18N-E03] 右上角手动选择与浏览器跟随不丢状态，刷新恢复自动", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(
      header.getByRole("combobox", { name: "Language" }),
    ).toHaveValue("auto");
    await header.getByRole("combobox", { name: "Language" }).focus();
    await expect(
      header.getByRole("combobox", { name: "Language" }),
    ).toBeFocused();

    await header
      .getByRole("combobox", { name: "Language" })
      .selectOption("zh-CN");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");

    await page.evaluate(() => {
      Object.defineProperty(navigator, "languages", {
        configurable: true,
        value: ["en-GB"],
      });
      window.dispatchEvent(new Event("languagechange"));
    });
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(header.getByRole("combobox", { name: "语言" })).toHaveValue(
      "zh-CN",
    );
    await header.getByRole("combobox", { name: "语言" }).selectOption("auto");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await header
      .getByRole("combobox", { name: "Language" })
      .selectOption("zh-CN");

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(375);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      header.getByRole("combobox", { name: "Language" }),
    ).toHaveValue("auto");
  });
});
