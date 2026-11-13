import { expect, test } from "@playwright/test";

test.use({ locale: "zh-CN" });

test("[E-01] JSON 格式化在真实 Worker 执行固定向量且不上传输入", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).origin !== "http://127.0.0.1:4173" ||
      request.method() !== "GET"
    )
      external.push(request.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "格式化", exact: true }),
  ).toBeVisible();
  const workerCreated = page.waitForEvent("worker");
  await page.getByLabel("输入 JSON").fill('{"x":1}');
  await page.getByRole("button", { name: "运行", exact: true }).click();
  await expect(page.getByLabel("输出 JSON")).toHaveValue('{\n  "x": 1\n}');
  const worker = await workerCreated;
  expect(new URL(worker.url()).origin).toBe("http://127.0.0.1:4173");
  await expect(page.getByRole("status")).toContainText(/完成.*\d+(\.\d+)? ms/);

  for (const vector of [
    {
      input: '{"你好":[1,null]}',
      indent: "4",
      output: '{\n    "你好": [\n        1,\n        null\n    ]\n}',
    },
    { input: '{"x":1}', indent: "0", output: '{"x":1}' },
    { input: '{"x":1}', indent: "8", output: '{\n        "x": 1\n}' },
    { input: "null", indent: "2", output: "null" },
    {
      input: '"<script>throw new Error(1)</script>"',
      indent: "2",
      output: '"<script>throw new Error(1)</script>"',
    },
  ]) {
    await page.getByLabel("输入 JSON").fill(vector.input);
    await page.getByLabel("缩进").selectOption(vector.indent);
    await page.getByRole("button", { name: "运行", exact: true }).click();
    await expect(page.getByLabel("输出 JSON")).toHaveValue(vector.output);
  }
  expect(external).toEqual([]);
});

test("[E-01] 非法和空 JSON 不显示旧结果，修正后可以再运行", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("输入 JSON").fill("{}");
  await page.getByRole("button", { name: "运行", exact: true }).click();
  await expect(page.getByLabel("输出 JSON")).toHaveValue("{}");
  for (const input of ['{"private-sentinel":', ""]) {
    await page.getByLabel("输入 JSON").fill(input);
    await page.getByRole("button", { name: "运行", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "请输入有效的 JSON 或 YAML，请检查格式及所选输入类型。",
    );
    await expect(page.getByRole("alert")).not.toContainText("INVALID_INPUT");
    await expect(page.getByRole("alert")).not.toContainText("private-sentinel");
    await expect(page.getByLabel("输出 JSON")).toHaveValue("");
  }
  await page.getByLabel("输入 JSON").fill("[1]");
  await page.getByRole("button", { name: "运行", exact: true }).click();
  await expect(page.getByLabel("输出 JSON")).toHaveValue("[\n  1\n]");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("[E-02] 取消真实 Worker 后可重新执行且无旧输出", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("输入 JSON").fill('{"cancelled":true}');
  await page
    .getByRole("button", { name: "运行", exact: true })
    .evaluate(async (button: HTMLButtonElement) => {
      button.click();
      await Promise.resolve();
      const cancel = document.querySelector<HTMLButtonElement>(
        'button[aria-label="取消运行"]',
      );
      if (!cancel || cancel.disabled) throw new Error("运行期间必须可取消");
      cancel.click();
    });
  await expect(page.getByRole("status")).toContainText("已取消");
  await expect(page.getByLabel("输出 JSON")).toHaveValue("");
  await page.getByLabel("输入 JSON").fill('{"current":1}');
  await page.getByRole("button", { name: "运行", exact: true }).click();
  await expect(page.getByLabel("输出 JSON")).toHaveValue(
    '{\n  "current": 1\n}',
  );
});

test("[E-09] 375px 下可用键盘完成运行且布局不溢出", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByLabel("输入 JSON").fill('{"x":1}');
  await page.getByLabel("缩进").focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "运行", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("输出 JSON")).toHaveValue('{\n  "x": 1\n}');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    375,
  );
});
