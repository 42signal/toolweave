import { expect, test } from "vitest";

import { executeTool } from "./execute-tool";

test.each([
  { toolId: "base64.encode", input: "你好😀", output: "5L2g5aW98J+YgA==" },
  { toolId: "base64.encode", input: "", output: "" },
])(
  "[BT-02] UTF-8 编解码与空结果：$toolId $input",
  ({ toolId, input, output }) => {
    expect(executeTool({ toolId, input, config: {} })).toMatchObject({
      ok: true,
      output,
    });
  },
);

test("[BT-02] 编码不静默替换孤立 surrogate", () => {
  expect(
    executeTool({ toolId: "base64.encode", input: "\uD800", config: {} }),
  ).toMatchObject({
    ok: false,
    error: { code: "INVALID_INPUT" },
  });
});

for (const toolId of ["base64.encode"]) {
  test.each([null, { extra: true }])(
    `[CT-03] ${toolId} 不接受额外或非对象配置：%j`,
    (config) => {
      expect(executeTool({ toolId, input: "", config })).toMatchObject({
        ok: false,
        error: { code: "INVALID_CONFIG" },
      });
    },
  );
}
