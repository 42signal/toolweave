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
