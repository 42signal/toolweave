import { expect, test } from "@playwright/test";

for (const language of ["en", "zh"] as const) {
  test.describe(language, () => {
    const chinese = language === "zh";
    const index = chinese ? 1 : 0;
    const run = chinese ? "运行" : "Run";
    test.use({ locale: chinese ? "zh-CN" : "en-US" });

    test("[ALL-E01] 全部工具双语固定向量、真实 Worker 与窄屏接线", async ({
      page,
    }) => {
      const unexpected: string[] = [];
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
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
        page.getByText(chinese ? "4 个工具" : "4 tools", { exact: true }),
      ).toBeVisible();
      const vectors = [
        {
          names: ["Format", "格式化"],
          inputs: ["Input JSON / YAML", "输入 JSON / YAML"],
          outputs: ["Output JSON", "输出 JSON"],
          input: '{"x":1}',
          output: '{\n  "x": 1\n}',
        },
        {
          names: ["Minify", "压缩"],
          inputs: ["Input JSON / YAML", "输入 JSON / YAML"],
          outputs: ["Output JSON", "输出 JSON"],
          input: '{ "x": 1 }',
          output: '{"x":1}',
        },
        {
          names: ["Base64 Encoder", "Base64 编码"],
          inputs: ["Input text", "输入文本"],
          outputs: ["Output Base64", "输出 Base64"],
          input: "你好😀",
          output: "5L2g5aW98J+YgA==",
        },
        {
          names: ["Base64 Decoder", "Base64 解码"],
          inputs: ["Input Base64", "输入 Base64"],
          outputs: ["Output text", "输出文本"],
          input: "5L2g5aW98J+YgA==",
          output: "你好😀",
        },
      ] as const;
      for (const vector of vectors) {
        const name = vector.names[index];
        const inputLabel = vector.inputs[index];
        const outputLabel = vector.outputs[index];
        await page.getByRole("button", { name, exact: true }).click();
        await expect(
          page.getByRole("heading", { name, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name, exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await page.getByLabel(inputLabel, { exact: true }).fill(vector.input);
        const created = page.waitForEvent("worker");
        await page.getByRole("button", { name: run, exact: true }).click();
        await expect(page.getByLabel(outputLabel, { exact: true })).toHaveValue(
          vector.output,
        );
        expect(new URL((await created).url()).origin).toBe(
          "http://127.0.0.1:4173",
        );
        await expect(page.getByRole("status")).toContainText(
          chinese ? "完成" : "Completed",
        );
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(375);
      expect(unexpected).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}

test.describe("edge cases", () => {
  test.use({ locale: "en-US" });

  test("[ALL-E02] 友好错误、修正恢复及成功空输出", async ({ page }) => {
    await page.goto("/");
    for (const scenario of [
      {
        tool: "Base64 Decoder",
        inputLabel: "Input Base64",
        outputLabel: "Output text",
        invalid: "private-sentinel%%%",
        valid: "aGk=",
        output: "hi",
        message: "Enter valid standard Base64 containing UTF-8 text.",
      },
    ]) {
      await page
        .getByRole("button", { name: scenario.tool, exact: true })
        .click();
      await page
        .getByLabel(scenario.inputLabel, { exact: true })
        .fill(scenario.invalid);
      await page.getByRole("button", { name: "Run", exact: true }).click();
      await expect(page.getByRole("alert")).toHaveText(scenario.message);
      await expect(page.getByRole("alert")).not.toContainText(
        /INVALID_INPUT|private-sentinel/,
      );
      await expect(
        page.getByLabel(scenario.outputLabel, { exact: true }),
      ).toHaveValue("");
      await page
        .getByLabel(scenario.inputLabel, { exact: true })
        .fill(scenario.valid);
      await page.getByRole("button", { name: "Run", exact: true }).click();
      await expect(
        page.getByLabel(scenario.outputLabel, { exact: true }),
      ).toHaveValue(scenario.output);
      await expect(page.getByRole("alert")).toHaveCount(0);
    }
    for (const scenario of [
      { tool: "Base64 Encoder", input: "Input text", output: "Output Base64" },
      { tool: "Base64 Decoder", input: "Input Base64", output: "Output text" },
    ]) {
      await page
        .getByRole("button", { name: scenario.tool, exact: true })
        .click();
      await page.getByLabel(scenario.input, { exact: true }).fill("");
      await page.getByRole("button", { name: "Run", exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Completed");
      await expect(
        page.getByLabel(scenario.output, { exact: true }),
      ).toHaveValue("");
      await expect(page.getByRole("alert")).toHaveCount(0);
    }
  });
});
