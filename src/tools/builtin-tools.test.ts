import { expect, test } from "vitest";

import { executeTool } from "./execute-tool";

test.each([
  { toolId: "base64.encode", input: "你好😀", output: "5L2g5aW98J+YgA==" },
  { toolId: "base64.decode", input: "5L2g5aW98J+YgA==", output: "你好😀" },
  { toolId: "base64.decode", input: "77u/aGk=", output: "\uFEFFhi" },
  { toolId: "base64.encode", input: "", output: "" },
  { toolId: "base64.decode", input: "", output: "" },
])(
  "[BT-02] UTF-8 编解码与空结果：$toolId $input",
  ({ toolId, input, output }) => {
    expect(executeTool({ toolId, input, config: {} })).toMatchObject({
      ok: true,
      output,
    });
  },
);

test.each([
  "a",
  "aGk",
  "aGk===",
  "aGk=\n",
  "aGk_",
  "Zh==",
  "/w==",
  "wK8=",
  "%%%",
])("[BT-02] 拒绝坏 Base64、非规范填充和 UTF-8：%j", (input) => {
  expect(
    executeTool({ toolId: "base64.decode", input, config: {} }),
  ).toMatchObject({
    ok: false,
    error: { code: "INVALID_INPUT" },
  });
});

test("[BT-02] 编码不静默替换孤立 surrogate", () => {
  expect(
    executeTool({ toolId: "base64.encode", input: "\uD800", config: {} }),
  ).toMatchObject({
    ok: false,
    error: { code: "INVALID_INPUT" },
  });
});

for (const toolId of ["base64.encode", "base64.decode"]) {
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
