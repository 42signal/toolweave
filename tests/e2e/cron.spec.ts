import { expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

async function allowClipboard(context: BrowserContext, browserName: string) {
  if (browserName !== "chromium") return;
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://127.0.0.1:4173",
  });
}

async function expectClipboard(page: Page, browserName: string, value: string) {
  if (browserName !== "chromium") return;
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(value);
}

async function pasteExpression(
  page: Page,
  browserName: string,
  text = "*/10 * * * * *",
) {
  if (browserName === "chromium") {
    await page.evaluate((value) => navigator.clipboard.writeText(value), text);
    await page.keyboard.press("Meta+V");
    return;
  }
  await page.getByRole("textbox").evaluate((element, value) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", value);
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, text);
}

for (const language of ["cron-en", "cron-zh"]) {
  const chinese = language === "cron-zh";

  test.describe(language, () => {
    test.use({
      locale: chinese ? "zh-CN" : "en-US",
      timezoneId: "Asia/Shanghai",
    });

    test("[CRON-E01] parses and composes cron locally in both languages", async ({
      page,
      context,
      browserName,
    }) => {
      await allowClipboard(context, browserName);
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
      await page
        .getByRole("button", {
          name: chinese ? "Cron 解析" : "Cron Parser",
          exact: true,
        })
        .click();
      const workerCreated = page.waitForEvent("worker");
      await page
        .getByLabel(chinese ? "Cron 表达式" : "Cron expression")
        .fill("*/5 9-17 * * 1-5");
      await expect(
        page.getByLabel(chinese ? "描述" : "Description"),
      ).toContainText(chinese ? "每隔 5 分钟" : "Every 5 minutes");
      expect(new URL((await workerCreated).url()).origin).toBe(
        "http://127.0.0.1:4173",
      );
      const runs = page.getByRole("list", {
        name: chinese ? "执行计划" : "Next runs",
      });
      await expect(runs.getByRole("listitem")).toHaveCount(5);
      await expect(
        page.getByText("Asia/Shanghai", { exact: true }),
      ).toBeVisible();
      const times = await runs
        .locator("time")
        .evaluateAll((elements) =>
          elements.map((element) =>
            new Date(element.getAttribute("datetime") ?? "").getTime(),
          ),
        );
      expect(
        times.every(
          (time, index) => time > (times[index - 1] ?? Date.now() - 60_000),
        ),
      ).toBe(true);
      await expect(runs).toContainText("GMT+8");
      await expect(
        page.getByText(chinese ? "下次执行" : "Next", { exact: true }),
      ).toBeVisible();
      const expression = page.getByLabel(
        chinese ? "Cron 表达式" : "Cron expression",
      );
      await expression.focus();
      await page.keyboard.press(
        browserName === "webkit" ? "Meta+ArrowLeft" : "Home",
      );
      await page.keyboard.press("ArrowRight");
      const help = page.getByRole("list", {
        name: chinese ? "字段提示" : "Field help",
      });
      await expect(help).toContainText("0–59");
      await expect(help).toContainText(chinese ? "步长" : "Step");

      await page
        .getByRole("button", { name: chinese ? "小时" : "Hour", exact: true })
        .click();
      await page.keyboard.insertText("10-18");
      await expect(
        page.getByLabel(chinese ? "Cron 表达式" : "Cron expression"),
      ).toHaveText("*/5 10-18 * * 1-5");
      await expect(
        page.getByLabel(chinese ? "描述" : "Description"),
      ).toContainText("10:00");
      await expect(help).toContainText("0–23");
      await expect(help).toContainText(chinese ? "范围" : "Range");
      await page
        .getByRole("button", { name: chinese ? "复制" : "Copy", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: chinese ? "已复制" : "Copied",
          exact: true,
        }),
      ).toBeVisible();
      await expectClipboard(page, browserName, "*/5 10-18 * * 1-5");
      await page
        .getByRole("button", { name: chinese ? "随机" : "Random", exact: true })
        .click();
      await expect(expression).toHaveText(/^(\S+ ){4}\S+$/);
      await expect(
        page.getByLabel(chinese ? "描述" : "Description"),
      ).not.toHaveText("");
      await expect(runs.getByRole("listitem")).toHaveCount(5);
      await expression.fill("*/5 10-18 * * 1-5");
      await page
        .getByRole("button", { name: chinese ? "小时" : "Hour", exact: true })
        .click();
      await page.keyboard.press("Backspace");
      await expect(expression).toHaveText("*/5  * * 1-5");
      await page.keyboard.insertText("9-17");
      await expect(expression).toHaveText("*/5 9-17 * * 1-5");
      await page
        .getByLabel(chinese ? "Cron 表达式" : "Cron expression")
        .fill("60 * * * *");
      await expect(page.getByRole("alert")).toHaveText(
        chinese
          ? "请输入五段或六段（秒在首位）Cron 表达式，请检查字段值和范围。"
          : "Enter five fields, or six with seconds first. Check field values and ranges.",
      );
      await expect(page.getByRole("alert")).not.toContainText(
        /INVALID_INPUT|RangeError/,
      );
      await page
        .getByRole("button", {
          name: chinese ? "每分钟" : "Every minute",
          exact: true,
        })
        .click();
      await expect(
        page.getByLabel(chinese ? "描述" : "Description"),
      ).toHaveText(chinese ? "每分钟" : "Every minute");
      await expect(page.getByRole("alert")).toHaveCount(0);
      await page
        .getByRole("button", { name: chinese ? "分钟" : "Minute", exact: true })
        .click();
      await page.keyboard.press("Tab");
      await expect(help).toContainText("0–23");
      await expect(expression).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(help).toContainText("0–59");
      await page
        .getByRole("button", {
          name: chinese ? "星期" : "Day of week",
          exact: true,
        })
        .click();
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("button", {
          name: chinese ? "复制" : "Copy",
          exact: true,
        }),
      ).toBeFocused();
      await page
        .getByRole("combobox", { name: chinese ? "语言" : "Language" })
        .selectOption(chinese ? "en" : "zh-CN");
      await expect(
        page.getByLabel(chinese ? "Cron expression" : "Cron 表达式"),
      ).toHaveText("* * * * *");
      await expect(
        page.getByLabel(chinese ? "Description" : "描述"),
      ).toHaveText(chinese ? "Every minute" : "每分钟");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(375);
      await page.screenshot({
        path: test.info().outputPath("cron-mobile.png"),
        fullPage: true,
      });
      expect(errors).toEqual([]);
      expect(external).toEqual([]);
    });

    test("[CRON-E03] custom editor pastes six fields and previews seconds", async ({
      page,
      context,
      browserName,
    }) => {
      await allowClipboard(context, browserName);
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/");
      await page
        .getByRole("button", {
          name: chinese ? "Cron 解析" : "Cron Parser",
          exact: true,
        })
        .click();
      const editor = page.getByRole("textbox", {
        name: chinese ? "Cron 表达式" : "Cron expression",
      });
      await expect(editor).toHaveAttribute("contenteditable", "plaintext-only");
      await expect(page.getByRole("textbox")).toHaveCount(1);
      await editor.focus();
      await pasteExpression(page, browserName);
      await expect(editor).toHaveText("*/10 * * * * *");
      await expect(
        page.getByRole("button", {
          name: chinese ? "六段（含秒）" : "6 fields (seconds)",
        }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.getByLabel(chinese ? "描述" : "Description"),
      ).toHaveText(chinese ? "每隔 10 秒" : "Every 10 seconds");
      const runs = page.getByRole("list", {
        name: chinese ? "执行计划" : "Next runs",
      });
      await expect(runs.getByRole("listitem")).toHaveCount(5);
      await expect(runs).toContainText(/\d{2}:\d{2}:\d{2}/);
      const times = await runs
        .locator("time")
        .evaluateAll((elements) =>
          elements.map((element) =>
            Date.parse(element.getAttribute("datetime")!),
          ),
        );
      expect(times.slice(1).map((time, index) => time - times[index]!)).toEqual(
        [10000, 10000, 10000, 10000],
      );
      await page
        .getByRole("button", { name: chinese ? "秒" : "Second", exact: true })
        .click();
      await page.keyboard.type("@?#+");
      await expect(editor).toHaveText("*/10 * * * * *");
      await page.keyboard.insertText("中文");
      await expect(editor).toHaveText("*/10 * * * * *");
      await pasteExpression(page, browserName, "*/5 * * * * ?");
      await expect(editor).toHaveText("*/10 * * * * *");
      await page.keyboard.insertText("*/10");
      await expect(editor).toHaveText("*/10 * * * * *");
      await page
        .getByRole("button", { name: chinese ? "月份" : "Month", exact: true })
        .click();
      await page.keyboard.type("jul");
      await expect(editor).toHaveText("*/10 * * * jul *");
      await page
        .getByRole("button", {
          name: chinese ? "星期" : "Day of week",
          exact: true,
        })
        .click();
      await page.keyboard.type("WED");
      await expect(editor).toHaveText("*/10 * * * jul WED");
      await expect(
        page.getByLabel(chinese ? "描述" : "Description"),
      ).toContainText(chinese ? "星期三" : "Wednesday");
      await editor.fill("*/10 * * * * *");
      await page
        .getByRole("button", { name: chinese ? "秒" : "Second", exact: true })
        .click();
      const help = page.getByRole("list", {
        name: chinese ? "字段提示" : "Field help",
      });
      await expect(help).toContainText(chinese ? "秒" : "Second");
      await page.keyboard.insertText("60");
      await expect(page.getByRole("alert")).toBeVisible();
      await page
        .getByRole("button", { name: chinese ? "秒" : "Second", exact: true })
        .click();
      await page.keyboard.insertText("*/15");
      await expect(
        page.getByLabel(chinese ? "描述" : "Description"),
      ).toHaveText(chinese ? "每隔 15 秒" : "Every 15 seconds");
      await page
        .getByRole("button", { name: chinese ? "复制" : "Copy", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: chinese ? "已复制" : "Copied" }),
      ).toBeVisible();
      await expectClipboard(page, browserName, "*/15 * * * * *");
      await page
        .getByRole("button", { name: chinese ? "每天" : "Daily", exact: true })
        .click();
      await expect(editor).toHaveText("0 0 0 * * *");
      await page
        .getByRole("button", { name: chinese ? "随机" : "Random" })
        .click();
      await expect(editor).toHaveText(/^(\S+ ){5}\S+$/);
      await expect(runs.getByRole("listitem")).toHaveCount(5);
      await page
        .getByRole("button", {
          name: chinese ? "五段" : "5 fields",
          exact: true,
        })
        .click();
      await expect(editor).toHaveText(/^(\S+ ){4}\S+$/);
      await page
        .getByRole("button", {
          name: chinese ? "六段（含秒）" : "6 fields (seconds)",
        })
        .click();
      await expect(editor).toHaveText(/^0 (\S+ ){4}\S+$/);
      await expect(runs.getByRole("listitem")).toHaveCount(5);
      await expect(
        page.getByLabel(chinese ? "描述" : "Description"),
      ).not.toHaveText("");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(375);
      await page.screenshot({
        path: test.info().outputPath("cron-six-fields-mobile.png"),
        fullPage: true,
      });
    });
  });
}

for (const timezone of ["UTC", "Asia/Shanghai"]) {
  test.describe(timezone, () => {
    test.use({ locale: "en-US", timezoneId: timezone });

    test("[CRON-E02] previews next local midnight in the browser timezone", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByRole("button", { name: "Cron Parser", exact: true })
        .click();
      const expected = await page.evaluate(() => {
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);
        return tomorrow.toISOString();
      });
      await page.getByLabel("Cron expression").fill("0 0 * * *");
      const runs = page.getByRole("list", { name: "Next runs" });
      await expect(runs.getByRole("listitem")).toHaveCount(5);
      await expect(runs.locator("time").first()).toHaveAttribute(
        "datetime",
        expected,
      );
      await expect(page.getByText(timezone, { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Monthly", exact: true }).click();
      await expect(page.getByLabel("Cron expression")).toHaveText("0 0 1 * *");
      await expect(page.getByLabel("Description")).toContainText("day 1");
      await page.getByRole("button", { name: "Hourly", exact: true }).click();
      await expect(page.getByLabel("Cron expression")).toHaveText("0 * * * *");
      await page.getByRole("button", { name: "Daily", exact: true }).click();
      await expect(page.getByLabel("Cron expression")).toHaveText("0 0 * * *");
      await page
        .getByRole("button", { name: "Weekdays at 09:00", exact: true })
        .click();
      await expect(page.getByLabel("Cron expression")).toHaveText(
        "0 9 * * 1-5",
      );
      await expect(page.getByLabel("Description")).toHaveText(
        "At 09:00, Monday through Friday",
      );
    });
  });
}
