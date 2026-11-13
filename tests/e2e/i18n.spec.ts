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
      await expect(
        page.getByRole("heading", { name: scenario.title }),
      ).toBeVisible();
      await page.getByLabel(scenario.input).fill('{"x":1}');
      await page
        .getByRole("button", { name: scenario.run, exact: true })
        .click();
      await expect(page.getByLabel(scenario.output)).toHaveValue(
        '{\n  "x": 1\n}',
      );
      await page.getByLabel(scenario.input).fill("{");
      await page
        .getByRole("button", { name: scenario.run, exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText(scenario.error);
      await expect(page.getByRole("alert")).not.toContainText("INVALID_INPUT");
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
    await page.getByLabel("Input JSON").fill('{"x":1}');
    await page.getByLabel("Indent").selectOption("4");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByLabel("Output JSON")).toHaveValue(
      '{\n    "x": 1\n}',
    );
    await page.evaluate(() => {
      Object.defineProperty(navigator, "languages", {
        configurable: true,
        value: ["fr-FR", "zh-HK"],
      });
      window.dispatchEvent(new Event("languagechange"));
    });
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.getByLabel("输入 JSON")).toHaveValue('{"x":1}');
    await expect(page.getByLabel("输出 JSON")).toHaveValue('{\n    "x": 1\n}');
    await expect(page.getByLabel("缩进")).toHaveValue("4");
    await expect(page.getByRole("status")).toContainText("完成");
    await page.getByLabel("输入 JSON").fill("{");
    await page.getByRole("button", { name: "运行", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("请输入有效的 JSON");
    await page.evaluate(() => {
      Object.defineProperty(navigator, "languages", {
        configurable: true,
        value: ["en-GB"],
      });
      window.dispatchEvent(new Event("languagechange"));
    });
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("alert")).toContainText("Enter valid JSON");
    await expect(page.getByLabel("Input JSON")).toHaveValue("{");
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
    await page.getByLabel("Input JSON").fill('{"x":1}');
    await page.getByLabel("Indent").selectOption("4");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByLabel("Output JSON")).toHaveValue(
      '{\n    "x": 1\n}',
    );
    await header
      .getByRole("combobox", { name: "Language" })
      .selectOption("zh-CN");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.getByLabel("输入 JSON")).toHaveValue('{"x":1}');
    await expect(page.getByLabel("输出 JSON")).toHaveValue('{\n    "x": 1\n}');
    await expect(page.getByLabel("缩进")).toHaveValue("4");
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
    await expect(page.getByLabel("Output JSON")).toHaveValue(
      '{\n    "x": 1\n}',
    );
    await page.getByLabel("Input JSON").fill("{");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Enter valid JSON or YAML. Check the syntax and selected input format.",
    );
    await expect(page.getByRole("alert")).not.toContainText("INVALID_INPUT");
    await header
      .getByRole("combobox", { name: "Language" })
      .selectOption("zh-CN");
    await expect(page.getByRole("alert")).toHaveText(
      "请输入有效的 JSON 或 YAML，请检查格式及所选输入类型。",
    );
    await expect(page.getByRole("alert")).not.toContainText("INVALID_INPUT");
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
