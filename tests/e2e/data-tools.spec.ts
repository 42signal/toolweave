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
      await page
        .getByRole("button", {
          name: chinese ? "Unix 时间转换" : "Unix Time Converter",
          exact: true,
        })
        .click();
      await expect(inputFormat).toHaveValue("auto");
      await expect(outputFormat).toHaveValue("seconds");
      const timeInput = page.getByLabel(chinese ? "输入时间" : "Input time");
      const timeOutput = page.getByLabel(chinese ? "输出时间" : "Output time");
      await timeInput.fill("1700000000123456789");
      await run.click();
      await expect(timeOutput).toHaveValue("1700000000.123456789");
      await outputFormat.selectOption("iso");
      await timeInput.fill("1970/01/01 08:00");
      await run.click();
      await expect(timeOutput).toHaveValue("1970-01-01T00:00:00.000Z");
      await timeInput.fill("");
      await outputFormat.selectOption("milliseconds");
      const beforeNow = Date.now();
      await run.click();
      await expect(page.getByRole("status")).toContainText(
        chinese ? "完成" : "Completed",
      );
      const now = Number(await timeOutput.inputValue());
      expect(now).toBeGreaterThanOrEqual(beforeNow);
      expect(now).toBeLessThanOrEqual(Date.now());
      await page
        .getByRole("button", {
          name: chinese ? "Diff 比较" : "Diff",
          exact: true,
        })
        .click();
      const before = page.getByLabel(chinese ? "原始内容" : "Before", {
        exact: true,
      });
      const after = page.getByLabel(chinese ? "修改内容" : "After", {
        exact: true,
      });
      const diffOutput = page.getByLabel(chinese ? "差异输出" : "Diff output");
      await before.fill('{"a":1}');
      await after.fill("a: 2");
      await run.click();
      await expect(diffOutput).toHaveValue(
        '[\n  {\n    "op": "replace",\n    "path": "/a",\n    "value": 2\n  }\n]',
      );
      await page
        .getByRole("combobox", { name: chinese ? "语言" : "Language" })
        .selectOption(chinese ? "en" : "zh-CN");
      await expect(
        page.getByLabel(chinese ? "Before" : "原始内容", { exact: true }),
      ).toHaveValue('{"a":1}');
      await expect(
        page.getByLabel(chinese ? "After" : "修改内容", { exact: true }),
      ).toHaveValue("a: 2");
      await expect(
        page.getByLabel(chinese ? "Diff output" : "差异输出"),
      ).toHaveValue(/"path": "\/a"/);
      await page
        .getByRole("combobox", { name: chinese ? "Language" : "语言" })
        .selectOption(chinese ? "zh-CN" : "en");
      await after.fill('{"a":1}');
      await run.click();
      await expect(
        page.getByText(chinese ? "没有差异" : "No differences", {
          exact: true,
        }),
      ).toBeVisible();
      await before.fill("hello\nold\n");
      await after.fill("hello\nnew\n");
      await run.click();
      await expect(diffOutput).toHaveValue(/ hello\n-old\n\+new\n/);
      await page
        .getByLabel(chinese ? "比较模式" : "Comparison mode")
        .selectOption("structured");
      await run.click();
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(diffOutput).toHaveValue("");
      await before.fill('{"ok":true}');
      await after.fill("ok: true");
      await run.click();
      await expect(diffOutput).toHaveValue("[]");
      await expect(page.getByRole("alert")).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(375);
      expect(external).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}
