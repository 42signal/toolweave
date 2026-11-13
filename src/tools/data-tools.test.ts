import { expect, test } from "vitest";
import { executeTool } from "./execute-tool";

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
