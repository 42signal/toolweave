# TypeScript 插件安装、加载、权限与执行方案

## 状态

Pending approval

## 目标

实现完整 TypeScript 插件运行链路，并以内置插件 `dev-basic` 验证：

- 一个插件可以提供 N 个工具。
- 工具可以分类。
- 工具有权限声明。
- 执行前可以检查并提醒权限。
- 插件源码支持 TypeScript。
- TypeScript 插件被编译为 ESM JS 后执行。
- 执行在 Web Worker 中完成。

本阶段只做底层 runtime，不做完整主界面。

验证工具：

- URL 解析
- JSON 格式化

## 技术选型新增

新增：

- esbuild-wasm
- Web Worker runtime
- zod schema validation

原则：

- 首屏不加载 esbuild-wasm。
- 只有安装、导入、AI 生成或源码变化时才编译。
- 执行工具时优先使用 IndexedDB / 内存中的编译缓存。

## 插件模型

### PluginManifest

```ts
export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  tools: ToolManifest[];
  permissions?: PluginPermission[];
};
```

### ToolManifest

```ts
export type ToolManifest = {
  id: string;
  name: string;
  description?: string;
  category: string;
  entry: string;
  inputType: "text" | "json" | "binary";
  outputType: "text" | "json" | "binary";
  permissions?: PluginPermission[];
};
```

### Permission

```ts
export type PluginPermission =
  | { type: "clipboard-read" }
  | { type: "clipboard-write" }
  | { type: "network"; origins: string[] }
  | { type: "storage" };
```

MVP 内置工具权限为空数组：

```ts
permissions: []
```

## 插件 SDK

新增 `core/plugin-sdk`，提供插件作者使用的类型：

```ts
export type ToolRunContext = {
  input: unknown;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
};

export type ToolRunResult = {
  output: unknown;
  meta?: Record<string, unknown>;
};
```

插件工具入口必须导出：

```ts
export async function run(ctx: ToolRunContext): Promise<ToolRunResult>;
```

## 内置插件结构

```txt
src/builtins/dev-basic/
  manifest.json
  src/
    tools/
      url-parse.ts
      json-format.ts
```

## manifest.json

```json
{
  "id": "dev-basic",
  "name": "Developer Basic Tools",
  "version": "0.1.0",
  "description": "Basic developer tools for validating plugin runtime",
  "tools": [
    {
      "id": "url.parse",
      "name": "URL Parse",
      "category": "URL",
      "entry": "src/tools/url-parse.ts",
      "inputType": "text",
      "outputType": "json",
      "permissions": []
    },
    {
      "id": "json.format",
      "name": "JSON Format",
      "category": "JSON",
      "entry": "src/tools/json-format.ts",
      "inputType": "text",
      "outputType": "text",
      "permissions": []
    }
  ]
}
```

## 编译方案

使用 `esbuild-wasm`：

```txt
TS source files
→ virtual fs plugin
→ bundle as ESM
→ save PluginBuild
→ execute compiled JS in Worker
```

### 编译缓存

```ts
export type PluginSource = {
  pluginId: string;
  files: Record<string, string>;
  updatedAt: number;
};

export type PluginBuild = {
  pluginId: string;
  toolId: string;
  entry: string;
  code: string;
  sourcemap?: string;
  hash: string;
  builtAt: number;
};
```

## 安全限制

MVP 静态扫描拒绝：

- `eval(`
- `new Function`
- `document.`
- `window.`
- `localStorage`
- `sessionStorage`
- `indexedDB`
- 未声明 network 权限时使用 `fetch(`
- `XMLHttpRequest`
- `WebSocket`
- 动态 `import(`

说明：静态扫描不是最终安全边界，但可以作为 MVP 的基础限制。后续加强 CSP、iframe sandbox、权限代理。

## 实现计划

新增模块：

```txt
core/plugin-sdk/types.ts
core/plugin/types.ts
core/plugin/schema.ts
core/plugin/registry.ts
core/plugin/loader.ts
core/plugin/security-scan.ts
core/compiler/esbuild.ts
core/compiler/virtual-fs-plugin.ts
core/tool/runner.ts
core/permissions/check.ts
workers/plugin-worker.ts
builtins/dev-basic/manifest.json
builtins/dev-basic/src/tools/url-parse.ts
builtins/dev-basic/src/tools/json-format.ts
```

执行流程：

```txt
load plugin source
→ validate manifest
→ security scan source
→ compile each tool entry
→ save/register build
→ run compiled JS in Worker
→ return output/error
```

## 测试 spec

### Manifest

1. 合法 manifest 可以通过校验。
2. 缺少 `id` 应失败。
3. 缺少 `tools` 应失败。
4. tool 缺少 `entry` 应失败。
5. tool category 可以被读取。
6. 一个插件可以包含多个工具。

### Compiler

1. 可以编译单文件 TS 工具。
2. 可以编译多文件 TS 工具。
3. 可以解析相对 import。
4. 可以处理 `import type`。
5. 可以识别 `@devtool/plugin-sdk` 类型导入。
6. 编译失败时返回清晰错误。
7. 编译产物可以被 dynamic import。

### Security

1. `eval(` 被拒绝。
2. `new Function` 被拒绝。
3. `window.` 被拒绝。
4. `document.` 被拒绝。
5. 未声明 network 权限时 `fetch(` 被拒绝。
6. 声明 network 权限时需要产生权限提醒。

### Tool Runner

1. URL Parse 输入 `https://example.com/path?a=1&payload=%7B%22x%22%3A1%7D#top`，输出结构化 URL。
2. JSON Format 输入 `{"a":1}`，输出缩进 JSON。
3. JSON Format 输入非法 JSON，返回清晰错误。
4. Worker 执行异常能返回错误而不崩溃页面。

### Permission

1. 无权限工具可直接执行。
2. 有权限工具执行前需要权限确认状态。
3. 用户拒绝权限时工具不能执行。

## 验证 / 调整测试

执行：

```bash
pnpm test core/plugin
pnpm test core/compiler
pnpm test core/tool
pnpm test core/permissions
pnpm typecheck
pnpm build
```

## 提交

分支：

```txt
feat/ts-plugin-runtime
```

提交信息：

```txt
feat: add typescript plugin runtime
```

## 机器 review

必须检查：

- manifest schema tests
- compiler tests
- security scan tests
- worker runtime tests
- permission tests
- typecheck
- build

## 人工 review checklist

- [ ] TypeScript 插件源码能完整编译。
- [ ] 一个插件能提供多个工具。
- [ ] 工具分类模型清晰。
- [ ] 权限模型可扩展。
- [ ] Worker 执行与主线程解耦。
- [ ] esbuild-wasm 没有进入首屏关键路径。
- [ ] 安全扫描规则明确且有测试。
