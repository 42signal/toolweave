import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { App } from "./App";

test("[APP-00] 用户可以识别产品并找到工作区", () => {
  render(<App />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Toolweave AI" }),
  ).toBeVisible();
  expect(screen.getByRole("main", { name: "工作区" })).toBeVisible();
});
