import { expect, test } from "@playwright/test";

for (const scenario of [
  {
    locale: "en-US",
    title: "Minify",
    count: "4 tools",
    input: "Input JSON",
    output: "Output JSON",
    indent: "Indent",
    run: "Run",
    error:
      "Enter valid JSON or YAML. Check the syntax and selected input format.",
  },
  {
    locale: "zh-CN",
    title: "压缩",
    count: "4 个工具",
    input: "输入 JSON",
    output: "输出 JSON",
    indent: "缩进",
    run: "运行",
    error: "请输入有效的 JSON 或 YAML，请检查格式及所选输入类型。",
  },
]) {
  test.describe(scenario.locale, () => {
    test.use({ locale: scenario.locale });

    test("[MIN-E01] 双语压缩使用真实 Worker，错误恢复且不上传输入", async ({
      page,
    }) => {
      const unexpected: string[] = [];
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("request", (request) => {
        if (
          new URL(request.url()).origin !== "http://127.0.0.1:4173" ||
          request.method() !== "GET"
        )
          unexpected.push(request.url());
      });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/");
      await expect(
        page.getByText(scenario.count, { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: scenario.title, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: scenario.title }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: scenario.title }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByLabel(scenario.indent)).toHaveCount(0);
      const workerCreated = page.waitForEvent("worker");
      await page.getByLabel(scenario.input).fill('{\n  "x": 1\n}');
      await page
        .getByRole("button", { name: scenario.run, exact: true })
        .click();
      await expect(page.getByLabel(scenario.output)).toHaveValue('{"x":1}');
      expect(new URL((await workerCreated).url()).origin).toBe(
        "http://127.0.0.1:4173",
      );
      for (const vector of [
        {
          input: '{ "你好": [1, null], "text": "a  b" }',
          output: '{"你好":[1,null],"text":"a  b"}',
        },
        { input: "[ 1, true ]", output: "[1,true]" },
        { input: " null ", output: "null" },
        {
          input: '"<script>throw new Error(1)</script>"',
          output: '"<script>throw new Error(1)</script>"',
        },
      ]) {
        await page.getByLabel(scenario.input).fill(vector.input);
        await page
          .getByRole("button", { name: scenario.run, exact: true })
          .click();
        await expect(page.getByLabel(scenario.output)).toHaveValue(
          vector.output,
        );
      }
      for (const input of ['{"private-sentinel":', ""]) {
        await page.getByLabel(scenario.input).fill(input);
        await page
          .getByRole("button", { name: scenario.run, exact: true })
          .click();
        await expect(page.getByRole("alert")).toHaveText(scenario.error);
        await expect(page.getByRole("alert")).not.toContainText(
          /INVALID_INPUT|private-sentinel/,
        );
        await expect(page.getByLabel(scenario.output)).toHaveValue("");
      }
      await page.getByLabel(scenario.input).fill("[ 1 ]");
      await page
        .getByRole("button", { name: scenario.run, exact: true })
        .click();
      await expect(page.getByLabel(scenario.output)).toHaveValue("[1]");
      await expect(page.getByRole("alert")).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(375);
      expect(unexpected).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });
}

test.describe("tool switching", () => {
  test.use({ locale: "en-US" });

  test("[MIN-E02] 切换保留输入清除旧结果，双语及键盘接线可用", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.getByLabel("Input JSON").fill('{ "x": 1 }');
    await page.getByLabel("Indent").selectOption("4");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByLabel("Output JSON")).toHaveValue(
      '{\n    "x": 1\n}',
    );
    await page.getByRole("button", { name: "Minify", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Minify" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByLabel("Input JSON")).toHaveValue('{ "x": 1 }');
    await expect(page.getByLabel("Output JSON")).toHaveValue("");
    await expect(page.getByRole("status")).toHaveText("Ready");
    await page.getByRole("button", { name: "Run", exact: true }).focus();
    await expect(
      page.getByRole("button", { name: "Run", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Output JSON")).toHaveValue('{"x":1}');
    await page
      .getByRole("combobox", { name: "Language" })
      .selectOption("zh-CN");
    await expect(page.getByRole("heading", { name: "压缩" })).toBeVisible();
    await expect(page.getByRole("button", { name: "压缩" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByLabel("输入 JSON")).toHaveValue('{ "x": 1 }');
    await expect(page.getByLabel("输出 JSON")).toHaveValue('{"x":1}');
    await page.getByRole("button", { name: "格式化", exact: true }).click();
    await expect(page.getByLabel("输入 JSON")).toHaveValue('{ "x": 1 }');
    await expect(page.getByLabel("输出 JSON")).toHaveValue("");
    await expect(page.getByRole("status")).toHaveText("等待运行");
    await expect(page.getByLabel("缩进")).toBeVisible();
  });

  test("[MIN-E03] 运行中禁止工具切换，取消后恢复并可格式化", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Minify", exact: true }).click();
    await page.getByLabel("Input JSON").fill('{ "x": 1 }');
    const formatter = await page
      .getByRole("button", { name: "Format", exact: true })
      .elementHandle();
    const minifier = await page
      .getByRole("button", { name: "Minify", exact: true })
      .elementHandle();
    await page.getByRole("button", { name: "Run", exact: true }).evaluate(
      async (button: HTMLButtonElement, tools) => {
        if (
          !(tools.formatter instanceof HTMLButtonElement) ||
          !(tools.minifier instanceof HTMLButtonElement)
        )
          throw new Error("Both tools must be available");
        button.click();
        await Promise.resolve();
        if (!tools.formatter.disabled || !tools.minifier.disabled)
          throw new Error("Tools must be disabled during execution");
        tools.formatter.click();
        if (tools.minifier.getAttribute("aria-pressed") !== "true")
          throw new Error("Running tool must remain selected");
        const cancel = document.querySelector<HTMLButtonElement>(
          'button[aria-label="Cancel run"]',
        );
        if (!cancel || cancel.disabled)
          throw new Error("Run must be cancellable");
        cancel.click();
      },
      { formatter, minifier },
    );
    await expect(page.getByRole("status")).toContainText("Cancelled");
    await expect(page.getByRole("button", { name: "Format" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Minify" })).toBeEnabled();
    await page.getByRole("button", { name: "Format", exact: true }).click();
    await expect(page.getByLabel("Output JSON")).toHaveValue("");
    await expect(page.getByRole("status")).toHaveText("Ready");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByLabel("Output JSON")).toHaveValue('{\n  "x": 1\n}');
  });
});
