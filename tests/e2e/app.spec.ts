import { expect, test } from "@playwright/test";

test("[E-00] 生产页面打开及刷新后工作区可用且资源无错误", async ({ page }) => {
  const errors: string[] = [];
  const origin = "http://127.0.0.1:4173";

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => errors.push(request.url()));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      errors.push(`Unexpected external request: ${route.request().url()}`);
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto("/");
  await expect(page).toHaveTitle("Developer Toolbox");
  await expect(
    page.getByRole("heading", { level: 1, name: "Developer Toolbox" }),
  ).toBeVisible();
  await expect(page.getByRole("main", { name: "工作区" })).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Developer Toolbox" }),
  ).toBeVisible();
  await expect(page.getByRole("main", { name: "工作区" })).toBeVisible();
  expect(errors).toEqual([]);
});
