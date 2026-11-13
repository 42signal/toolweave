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

test("[BT-03] JWT 组合只输出 header/payload，不保留签名", () => {
  expect(
    executeTool({
      toolId: "jwt.decode",
      config: {},
      input: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2ln",
    }),
  ).toMatchObject({
    ok: true,
    output:
      '{\n  "header": {\n    "alg": "HS256"\n  },\n  "payload": {\n    "sub": "123"\n  }\n}',
  });
});

test("[BT-03] JWT 空签名仍只解码而不声称验证", () => {
  expect(
    executeTool({ toolId: "jwt.decode", input: "e30.e30.", config: {} }),
  ).toMatchObject({
    ok: true,
    output: '{\n  "header": {},\n  "payload": {}\n}',
  });
});

test.each([
  "",
  "invalid",
  "e30.e30",
  "e30.e30.x.y",
  "e30=.e30.sig",
  "bnVsbA.e30.",
  "e30.W10.",
  "_w.e30.",
  "ew.e30.",
  "e30.e30.a",
  "e30.e30.Zh",
])("[BT-03] JWT 坏结构/编码/JSON 拒绝：%j", (input) => {
  expect(
    executeTool({ toolId: "jwt.decode", input, config: {} }),
  ).toMatchObject({
    ok: false,
    error: { code: "INVALID_INPUT" },
  });
});

for (const toolId of [
  "base64.encode",
  "base64.decode",
  "url.encode",
  "url.decode",
  "jwt.decode",
  "uuid.generate",
]) {
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

test.each([
  {
    input: "0",
    config: { outputFormat: "iso" },
    output: "1970-01-01T00:00:00.000Z",
  },
  {
    input: "-0.001",
    config: { inputFormat: "seconds", outputFormat: "iso" },
    output: "1969-12-31T23:59:59.999Z",
  },
  {
    input: "1001",
    config: { inputFormat: "milliseconds", outputFormat: "iso" },
    output: "1970-01-01T00:00:01.001Z",
  },
  {
    input: "1970-01-01T08:00:00+08:00",
    config: { inputFormat: "date", outputFormat: "seconds" },
    output: "0",
  },
  {
    input: "1969-12-31T23:59:59.999Z",
    config: { inputFormat: "date", outputFormat: "seconds" },
    output: "-0.001",
  },
  {
    input: "2000-02-29T00:00:00.123Z",
    config: { inputFormat: "date", outputFormat: "milliseconds" },
    output: "951782400123",
  },
  {
    input: "8640000000000000",
    config: { inputFormat: "milliseconds", outputFormat: "iso" },
    output: "+275760-09-13T00:00:00.000Z",
  },
  {
    input: "-8640000000000000",
    config: { inputFormat: "milliseconds", outputFormat: "iso" },
    output: "-271821-04-20T00:00:00.000Z",
  },
])(
  "[BT-04] 显式时间方向、时区和毫秒精度：$input $config",
  ({ input, config, output }) => {
    expect(
      executeTool({ toolId: "unix-time.convert", input, config }),
    ).toMatchObject({ ok: true, output });
  },
);

test.each([
  { input: "1e3", inputFormat: "seconds" },
  { input: "1.0000000001", inputFormat: "seconds" },
  { input: "1.0000001", inputFormat: "milliseconds" },
  { input: "8640000000000001", inputFormat: "milliseconds" },
  { input: "2023-02-29T00:00:00Z", inputFormat: "date" },
  { input: "2024-04-31T00:00:00Z", inputFormat: "date" },
  { input: "2024-01-01T24:00:00Z", inputFormat: "date" },
  { input: "2024-01-01T00:00:00+24:00", inputFormat: "date" },
  { input: "not-a-date", inputFormat: "date" },
])("[BT-04] 时间歧义/越界/日历溢出拒绝：$input", ({ input, inputFormat }) => {
  expect(
    executeTool({
      toolId: "unix-time.convert",
      input,
      config: { inputFormat },
    }),
  ).toMatchObject({
    ok: false,
    error: { code: "INVALID_INPUT" },
  });
});

test.each([
  null,
  { mode: "auto" },
  { mode: 1 },
  { mode: "seconds-to-iso", extra: true },
])("[CT-03] 时间配置严格校验：%j", (config) => {
  expect(
    executeTool({ toolId: "unix-time.convert", input: "0", config }),
  ).toMatchObject({
    ok: false,
    error: { code: "INVALID_CONFIG" },
  });
});
