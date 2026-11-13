import { expect, test } from "vitest";

import { executeTool } from "./execute-tool";

test.each([
  [{}, '{\n  "x": 1\n}'],
  [{ indent: 0 }, '{"x":1}'],
  [{ indent: 4 }, '{\n    "x": 1\n}'],
  [{ indent: 8 }, '{\n        "x": 1\n}'],
])("[BT-01] JSON 格式化使用配置缩进 %j", (config, output) => {
  expect(
    executeTool({ toolId: "format", input: '{"x":1}', config }),
  ).toMatchObject({
    ok: true,
    output,
  });
});

test.each(
  [
    null,
    [],
    "2",
    { indent: "2" },
    { indent: -1 },
    { indent: 9 },
    { indent: 1.5 },
    { indent: NaN },
    { indent: Infinity },
    { extra: true },
  ].map((config) => ({ config })),
)("[BT-01] 非法配置拒绝而不是转换或忽略：%j", ({ config }) => {
  expect(
    executeTool({ toolId: "format", input: '{"x":1}', config }),
  ).toMatchObject({
    ok: false,
    error: { code: "INVALID_CONFIG" },
  });
});

for (const toolId of ["format"]) {
  test.each(["", " \n ", "{", '{"private-sentinel":'])(
    `[BT-01] ${toolId} 非法 JSON 返回脱敏错误：%j`,
    (input) => {
      const result = executeTool({ toolId, input, config: {} });
      expect(result).toMatchObject({
        ok: false,
        error: { code: "INVALID_INPUT" },
      });
      expect(JSON.stringify(result)).not.toContain("private-sentinel");
    },
  );
}

test("[CT-02] 未知工具明确失败", () => {
  expect(
    executeTool({ toolId: "missing.tool", input: "{}", config: {} }),
  ).toMatchObject({
    ok: false,
    error: { code: "UNKNOWN_TOOL" },
  });
});

test.each(
  [null, [], { toolId: "format", input: 42, config: {} }].map((request) => ({
    request,
  })),
)("[CT-04] 非法 Worker 请求不能执行：%j", ({ request }) => {
  expect(executeTool(request)).toMatchObject({
    ok: false,
    error: { code: "EXECUTION_FAILED" },
  });
});
