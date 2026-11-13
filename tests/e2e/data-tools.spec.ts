import { expect, test } from "@playwright/test";

for (const language of ["data-en", "data-zh"]) {
  const chinese = language === "data-zh";

  test.describe(language, () => {
    test.use({
      locale: chinese ? "zh-CN" : "en-US",
      timezoneId: "Asia/Shanghai",
    });

    test("[DATA-E01] 结构化转换、时间、Diff 在本地 Worker 完成且双语窄屏可用", async ({
      page,
    }) => {
      const external: string[] = [];
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (
          new URL(request.url()).origin !== "http://127.0.0.1:4173" ||
          request.method() !== "GET"
        )
          external.push(request.url());
      });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/");
      const run = page.getByRole("button", {
        name: chinese ? "运行" : "Run",
        exact: true,
      });
      const inputFormat = page.getByRole("combobox", {
        name: chinese ? "输入格式" : "Input format",
        exact: true,
      });
      const outputFormat = page.getByRole("combobox", {
        name: chinese ? "输出格式" : "Output format",
        exact: true,
      });
      await expect(inputFormat).toHaveValue("auto");
      await page
        .getByLabel(chinese ? "输入 JSON / YAML" : "Input JSON / YAML")
        .fill("hello: world\nitems: [1, 2]");
      const workerCreated = page.waitForEvent("worker");
      await run.click();
      await expect(
        page.getByLabel(chinese ? "输出 JSON" : "Output JSON"),
      ).toHaveValue(
        '{\n  "hello": "world",\n  "items": [\n    1,\n    2\n  ]\n}',
      );
      expect(new URL((await workerCreated).url()).origin).toBe(
        "http://127.0.0.1:4173",
      );
      await outputFormat.selectOption("yaml");
      await expect(
        page.getByLabel(chinese ? "输出 YAML" : "Output YAML"),
      ).toHaveValue("");
      await run.click();
      await expect(
        page.getByLabel(chinese ? "输出 YAML" : "Output YAML"),
      ).toHaveValue("hello: world\nitems:\n  - 1\n  - 2\n");
      await inputFormat.selectOption("json");
      await run.click();
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("alert")).not.toContainText(
        /INVALID_INPUT|SyntaxError/,
      );
      await inputFormat.selectOption("auto");
      await page
        .getByRole("button", {
          name: chinese ? "压缩" : "Minify",
          exact: true,
        })
        .click();
      await run.click();
      await expect(
        page.getByLabel(chinese ? "输出 JSON" : "Output JSON"),
      ).toHaveValue('{"hello":"world","items":[1,2]}');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(375);
      expect(external).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}
