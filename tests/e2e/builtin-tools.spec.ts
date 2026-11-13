import { expect, test } from "@playwright/test";

const parsedURL =
  '{\n  "protocol": "https:",\n  "host": "example.com:8080",\n  "pathname": "/search",\n  "query": {\n    "q": "hello world",\n    "tag": [\n      "a",\n      "b"\n    ]\n  },\n  "hash": "#results"\n}';

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
        page.getByText(chinese ? "12 个工具" : "12 tools", { exact: true }),
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
        {
          names: ["URL Encoder", "URL 编码"],
          inputs: ["Input text", "输入文本"],
          outputs: ["Output encoded text", "输出编码文本"],
          input: "a b+中",
          output: "a%20b%2B%E4%B8%AD",
        },
        {
          names: ["URL Decoder", "URL 解码"],
          inputs: ["Input encoded text", "输入编码文本"],
          outputs: ["Output text", "输出文本"],
          input: "a%20b+%E4%B8%AD",
          output: "a b+中",
        },
        {
          names: ["JWT Decoder", "JWT 解码"],
          inputs: ["Input JWT", "输入 JWT"],
          outputs: ["Output JSON", "输出 JSON"],
          input: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2ln",
          output:
            '{\n  "header": {\n    "alg": "HS256"\n  },\n  "payload": {\n    "sub": "123"\n  }\n}',
        },
        {
          names: ["UUID Generator", "UUID 生成"],
          inputs: ["Input (ignored)", "输入（忽略）"],
          outputs: ["Output UUID", "输出 UUID"],
          input: "ignored",
          output:
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        },
        {
          names: ["Unix Time Converter", "Unix 时间转换"],
          inputs: ["Input time", "输入时间"],
          outputs: ["Output time", "输出时间"],
          input: "0",
          output: "0",
        },
        {
          names: ["URL to JSON", "URL 转 JSON"],
          inputs: ["Input URL", "输入 URL"],
          outputs: ["Output JSON", "输出 JSON"],
          input:
            "https://example.com:8080/search?q=hello+world&tag=a&tag=b#results",
          output: parsedURL,
        },
        {
          names: ["JSON to URL", "JSON 转 URL"],
          inputs: ["Input JSON", "输入 JSON"],
          outputs: ["Output URL", "输出 URL"],
          input: parsedURL,
          output:
            "https://example.com:8080/search?q=hello+world&tag=a&tag=b#results",
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
      await page
        .getByRole("button", {
          name: chinese ? "JWT 解码" : "JWT Decoder",
          exact: true,
        })
        .click();
      await expect(
        page.getByText(
          chinese
            ? "仅解码，未验证签名。"
            : "Decoded only. Signature not verified.",
          { exact: true },
        ),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: chinese ? "Unix 时间转换" : "Unix Time Converter",
          exact: true,
        })
        .click();
      for (const vector of [
        {
          inputFormat: "milliseconds",
          outputFormat: "iso",
          input: "1001",
          output: "1970-01-01T00:00:01.001Z",
        },
        {
          inputFormat: "date",
          outputFormat: "seconds",
          input: "1970-01-01T08:00:00+08:00",
          output: "0",
        },
        {
          inputFormat: "date",
          outputFormat: "milliseconds",
          input: "1970-01-01T00:00:01.001Z",
          output: "1001",
        },
      ]) {
        await page
          .getByLabel(chinese ? "输入格式" : "Input format")
          .selectOption(vector.inputFormat);
        await page
          .getByLabel(chinese ? "输出格式" : "Output format")
          .selectOption(vector.outputFormat);
        await page
          .getByLabel(chinese ? "输入时间" : "Input time")
          .fill(vector.input);
        await page.getByRole("button", { name: run, exact: true }).click();
        await expect(
          page.getByLabel(chinese ? "输出时间" : "Output time"),
        ).toHaveValue(vector.output);
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
      {
        tool: "URL Decoder",
        inputLabel: "Input encoded text",
        outputLabel: "Output text",
        invalid: "%ZZprivate-sentinel",
        valid: "a%20b",
        output: "a b",
        message: "Enter valid percent-encoded UTF-8 text.",
      },
      {
        tool: "JWT Decoder",
        inputLabel: "Input JWT",
        outputLabel: "Output JSON",
        invalid: "private-sentinel",
        valid: "e30.e30.",
        output: '{\n  "header": {},\n  "payload": {}\n}',
        message: "Enter a three-part JWT with JSON header and payload.",
      },
      {
        tool: "Unix Time Converter",
        inputLabel: "Input time",
        outputLabel: "Output time",
        invalid: "private-sentinel",
        valid: "0",
        output: "0",
        message:
          "Enter a valid timestamp or supported date. Check the input format and timezone.",
      },
      {
        tool: "URL to JSON",
        inputLabel: "Input URL",
        outputLabel: "Output JSON",
        invalid: "private-sentinel",
        valid: "https://example.com/",
        output:
          '{\n  "protocol": "https:",\n  "host": "example.com",\n  "pathname": "/",\n  "query": {},\n  "hash": ""\n}',
        message: "Enter an absolute HTTP or HTTPS URL without credentials.",
      },
      {
        tool: "JSON to URL",
        inputLabel: "Input JSON",
        outputLabel: "Output URL",
        invalid: '{"private-sentinel":1}',
        valid:
          '{"protocol":"https:","host":"example.com","pathname":"/","query":[],"hash":""}',
        output: "https://example.com/",
        message:
          "Enter URL JSON with protocol, host, pathname, query strings or arrays, and hash.",
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
      {
        tool: "URL Encoder",
        input: "Input text",
        output: "Output encoded text",
      },
      {
        tool: "URL Decoder",
        input: "Input encoded text",
        output: "Output text",
      },
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

  test("[ALL-E03] URL query 重复和空值不丢失，切换语言保留结果", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "URL to JSON", exact: true })
      .click();
    await page
      .getByLabel("Input URL", { exact: true })
      .fill("https://example.com/?a=1&a=2&empty=&=x");
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByLabel("Output JSON", { exact: true })).toHaveValue(
      '{\n  "protocol": "https:",\n  "host": "example.com",\n  "pathname": "/",\n  "query": {\n    "a": [\n      "1",\n      "2"\n    ],\n    "empty": "",\n    "": "x"\n  },\n  "hash": ""\n}',
    );
    await page
      .getByRole("button", { name: "JSON to URL", exact: true })
      .click();
    await expect(page.getByLabel("Input JSON", { exact: true })).toHaveValue(
      "https://example.com/?a=1&a=2&empty=&=x",
    );
    await expect(page.getByLabel("Output URL", { exact: true })).toHaveValue(
      "",
    );
    await page.getByLabel("Input JSON", { exact: true }).fill(parsedURL);
    await page.getByRole("button", { name: "Run", exact: true }).click();
    await expect(page.getByLabel("Output URL", { exact: true })).toHaveValue(
      "https://example.com:8080/search?q=hello+world&tag=a&tag=b#results",
    );
    await page
      .getByRole("combobox", { name: "Language" })
      .selectOption("zh-CN");
    await expect(
      page.getByRole("button", { name: "JSON 转 URL", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("输出 URL", { exact: true })).toHaveValue(
      "https://example.com:8080/search?q=hello+world&tag=a&tag=b#results",
    );
  });
});
