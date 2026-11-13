import { afterEach, expect, test, vi } from "vitest";
import { executeTool } from "./execute-tool";

afterEach(() => vi.useRealTimers());

test.each([
  ["1700000000", {}, "1700000000"],
  ["1700000000123", {}, "1700000000.123"],
  ["1700000000123456789", {}, "1700000000.123456789"],
  ["-1700000000123456789", {}, "-1700000000.123456789"],
  [
    "1001",
    { inputFormat: "milliseconds", outputFormat: "iso" },
    "1970-01-01T00:00:01.001Z",
  ],
  [
    "1",
    { inputFormat: "nanoseconds", outputFormat: "iso" },
    "1970-01-01T00:00:00.000000001Z",
  ],
  [
    "-1",
    { inputFormat: "nanoseconds", outputFormat: "iso" },
    "1969-12-31T23:59:59.999999999Z",
  ],
  [
    "-0.000000001",
    { inputFormat: "seconds", outputFormat: "nanoseconds" },
    "-1",
  ],
  [
    "4470084885989.317",
    { inputFormat: "seconds", outputFormat: "milliseconds" },
    "4470084885989317",
  ],
  [
    "1970-01-01T08:00:00.123456789+08:00",
    { outputFormat: "nanoseconds" },
    "123456789",
  ],
  [
    "1969-12-31T23:59:59.999999999Z",
    { outputFormat: "milliseconds" },
    "-0.000001",
  ],
  ["Fri, 21 Nov 1997 09:55:06 -0600", {}, "880127706"],
  ["2000-02-29T00:00:00Z", { outputFormat: "iso" }, "2000-02-29T00:00:00.000Z"],
  [
    "8640000000000000000000",
    { inputFormat: "nanoseconds", outputFormat: "iso" },
    "+275760-09-13T00:00:00.000Z",
  ],
])("[DATA-TIME] 精确转换 %s %j", (input, config, output) => {
  expect(
    executeTool({ toolId: "unix-time.convert", input, config }),
  ).toMatchObject({ ok: true, output });
});

test.each([
  "2000-02-29",
  "2000/02/29",
  "2000-02-29 12:34",
  "2000/02/29 12:34:56.123456789",
])("[DATA-TIME] 无时区日期按本地解释：%s", (input) => {
  const date = new Date(
    2000,
    1,
    29,
    input.includes(" ") ? 12 : 0,
    input.includes(" ") ? 34 : 0,
    input.includes(":56") ? 56 : 0,
    input.includes(".123") ? 123 : 0,
  );
  expect(
    executeTool({
      toolId: "unix-time.convert",
      input,
      config: { outputFormat: "nanoseconds" },
    }),
  ).toMatchObject({
    ok: true,
    output: String(
      BigInt(date.getTime()) * 1000000n +
        (input.includes(".123") ? 456789n : 0n),
    ),
  });
});

test("[DATA-TIME] 空输入每次取当前时间，手动输入单位不影响 now", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2024-01-01T00:00:00.123Z"));
  expect(
    executeTool({ toolId: "unix-time.convert", input: " \n", config: {} }),
  ).toMatchObject({ ok: true, output: "1704067200.123" });
  vi.setSystemTime(new Date("2024-01-01T00:00:01.123Z"));
  expect(
    executeTool({
      toolId: "unix-time.convert",
      input: "",
      config: { inputFormat: "nanoseconds", outputFormat: "nanoseconds" },
    }),
  ).toMatchObject({ ok: true, output: "1704067201123000000" });
});

test.each([
  ["1e3", {}],
  ["1.0000000001", {}],
  ["1.1", { inputFormat: "nanoseconds" }],
  ["8640000000000000000001", { inputFormat: "nanoseconds" }],
  ["2023-02-29", {}],
  ["2024/04/31 12:00", {}],
  ["01/02/2024", {}],
  ["2024-01-01T00:00:00+24:00", {}],
  ["2024-01-01T24:00:00Z", {}],
  ["31 Feb 2024 12:00:00 GMT", {}],
  ["date-private-sentinel", {}],
  ["2024-01-01", { inputFormat: "seconds" }],
])("[DATA-TIME] 非法输入不猜测修复：%s", (input, config) => {
  const result = executeTool({ toolId: "unix-time.convert", input, config });
  expect(result).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  expect(JSON.stringify(result)).not.toContain("private-sentinel");
});

test.each([
  null,
  { inputFormat: "microseconds" },
  { outputFormat: "auto" },
  { outputFormat: 1 },
  { extra: true },
])("[DATA-TIME] 配置严格校验：%j", (config) => {
  expect(
    executeTool({ toolId: "unix-time.convert", input: "0", config }),
  ).toMatchObject({ ok: false, error: { code: "INVALID_CONFIG" } });
});

test.each([
  [
    "format",
    "name: Toolweave\ntags: [local, fast]\n",
    {},
    '{\n  "name": "Toolweave",\n  "tags": [\n    "local",\n    "fast"\n  ]\n}',
  ],
  ["format", '{"x":1}', { outputFormat: "yaml" }, "x: 1\n"],
  [
    "format",
    "x: 1\n",
    { inputFormat: "yaml", outputFormat: "json", indent: 4 },
    '{\n    "x": 1\n}',
  ],
  ["minify", "x: 1\ntext: a  b\n", {}, '{"x":1,"text":"a  b"}'],
  ["minify", "[1, true]", { inputFormat: "json" }, "[1,true]"],
  ["format", "date: 2024-01-01", {}, '{\n  "date": "2024-01-01"\n}'],
  ["format", '"hello"', {}, '"hello"'],
])("[DATA-STRUCT] 结构化转换 %s %s", (toolId, input, config, output) => {
  expect(executeTool({ toolId, input, config })).toMatchObject({
    ok: true,
    output,
  });
});

test.each([
  ["x: 1", { inputFormat: "json" }],
  ["x: [", {}],
  ["a: 1\na: 2", {}],
  ["? [a, b]\n: c", {}],
  ["x: .inf", {}],
  ["x: !secret private-sentinel", {}],
  ["x: &loop [*loop]", {}],
  ["---\na: 1\n---\nb: 2", {}],
])("[DATA-STRUCT] 拒绝非 JSON 数据及坏格式 %s", (input, config) => {
  const result = executeTool({ toolId: "format", input, config });
  expect(result).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  expect(JSON.stringify(result)).not.toContain("private-sentinel");
});

test.each([
  ["format", { inputFormat: "xml" }],
  ["format", { outputFormat: "auto" }],
  ["minify", { outputFormat: "yaml" }],
  ["minify", { inputFormat: 1 }],
])("[DATA-STRUCT] 不支持的格式配置拒绝 %s %j", (toolId, config) => {
  expect(executeTool({ toolId, input: "{}", config })).toMatchObject({
    ok: false,
    error: { code: "INVALID_CONFIG" },
  });
});

test.each([
  ['{"a":1,"b":2}', "b: 2\na: 1", "[]"],
  [
    '{"a":1}',
    "a: 2",
    '[\n  {\n    "op": "replace",\n    "path": "/a",\n    "value": 2\n  }\n]',
  ],
  [
    '{"old":1}',
    '{"new":2}',
    '[\n  {\n    "op": "remove",\n    "path": "/old"\n  },\n  {\n    "op": "add",\n    "path": "/new",\n    "value": 2\n  }\n]',
  ],
  [
    '{"a/b~c":1}',
    '{"a/b~c":2}',
    '[\n  {\n    "op": "replace",\n    "path": "/a~1b~0c",\n    "value": 2\n  }\n]',
  ],
  [
    "[1,2]",
    "[2,1]",
    '[\n  {\n    "op": "replace",\n    "path": "/0",\n    "value": 2\n  },\n  {\n    "op": "replace",\n    "path": "/1",\n    "value": 1\n  }\n]',
  ],
  [
    "[1,2,3]",
    "[1]",
    '[\n  {\n    "op": "remove",\n    "path": "/2"\n  },\n  {\n    "op": "remove",\n    "path": "/1"\n  }\n]',
  ],
])("[DATA-DIFF] 结构化比较 %s → %s", (before, after, output) => {
  expect(
    executeTool({
      toolId: "diff.compare",
      input: JSON.stringify({ before, after }),
      config: {},
    }),
  ).toMatchObject({ ok: true, output });
});

test.each(["auto", "text"])("[DATA-DIFF] 文本回退和换行 Diff：%s", (mode) => {
  const result = executeTool({
    toolId: "diff.compare",
    input: JSON.stringify({ before: "hello\nold\n", after: "hello\nnew\n" }),
    config: { mode },
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected successful text comparison");
  expect(result.output).toContain(" hello\n-old\n+new\n");
});

test("[DATA-DIFF] 相同文本成功无变化，不误判 YAML 字符串为对象", () => {
  expect(
    executeTool({
      toolId: "diff.compare",
      input: JSON.stringify({ before: "hello", after: "hello" }),
      config: {},
    }),
  ).toMatchObject({ ok: true, output: "" });
});

test.each([
  ["{}", {}],
  [JSON.stringify({ before: 1, after: "{}" }), {}],
  [JSON.stringify({ before: "a: [", after: "{}" }), { mode: "structured" }],
  [JSON.stringify({ before: "hello", after: "world" }), { mode: "structured" }],
])("[DATA-DIFF] 错误输入或显式结构化解析失败不回退", (input, config) => {
  expect(executeTool({ toolId: "diff.compare", input, config })).toMatchObject({
    ok: false,
    error: { code: "INVALID_INPUT" },
  });
});

test.each([null, { mode: "json" }, { extra: true }])(
  "[DATA-DIFF] 配置边界：%j",
  (config) => {
    expect(
      executeTool({ toolId: "diff.compare", input: "{}", config }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_CONFIG" } });
  },
);
