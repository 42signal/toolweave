import { expect, test } from "vitest";
import { executeTool } from "./execute-tool";

test("[DATA-URL] 特殊键/空值和重复值不污染原型", () => {
  const result = executeTool({
    toolId: "url.parse",
    input:
      "https://example.com/?__proto__=x&__proto__=y&constructor=z&empty=&=v",
    config: {},
  });
  expect(result).toMatchObject({
    ok: true,
    output:
      '{\n  "protocol": "https:",\n  "host": "example.com",\n  "pathname": "/",\n  "query": {\n    "__proto__": [\n      "x",\n      "y"\n    ],\n    "constructor": "z",\n    "empty": "",\n    "": "v"\n  },\n  "hash": ""\n}',
  });
});

test.each([
  [{ q: "hello world", tag: ["a", "b"] }, "?q=hello+world&tag=a&tag=b"],
  [
    [
      ["a", "1"],
      ["b", "2"],
      ["a", "3"],
    ],
    "?a=1&b=2&a=3",
  ],
  [{}, ""],
])("[DATA-URL] 对象和旧数组 query 均可生成 %j", (query, suffix) => {
  expect(
    executeTool({
      toolId: "url.build",
      input: JSON.stringify({
        protocol: "https:",
        host: "example.com",
        pathname: "/",
        query,
        hash: "",
      }),
      config: {},
    }),
  ).toMatchObject({ ok: true, output: `https://example.com/${suffix}` });
});

test.each([
  { q: null },
  { q: 1 },
  { q: [] },
  { q: ["a", 2] },
  { q: {} },
  "q=1",
])("[DATA-URL] query 值必须为字符串或非空字符串数组 %j", (query) => {
  expect(
    executeTool({
      toolId: "url.build",
      input: JSON.stringify({
        protocol: "https:",
        host: "example.com",
        pathname: "/",
        query,
        hash: "",
      }),
      config: {},
    }),
  ).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
});
