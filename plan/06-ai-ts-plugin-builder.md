# AI 构建 TypeScript 插件

## 状态

Pending approval

## 目标

支持 AI 根据用户描述生成 TypeScript 插件源码，并完成校验、编译、保存、加载、执行、导入导出。

MVP 范围：

- 生成纯函数工具。
- 生成 TypeScript 源码。
- 不支持 npm dependencies。
- 不支持 DOM UI 插件。
- 默认无网络权限。

## AI 输出格式

AI 必须输出结构化 JSON：

```json
{
  "type": "plugin-source",
  "manifest": {
    "id": "text.case",
    "name": "Text Case Tools",
    "version": "0.1.0",
    "tools": [
      {
        "id": "text.uppercase",
        "name": "Uppercase",
        "category": "Text",
        "entry": "src/tools/uppercase.ts",
        "inputType": "text",
        "outputType": "text",
        "permissions": []
      }
    ]
  },
  "files": {
    "src/tools/uppercase.ts": "import type { ToolRunContext, ToolRunResult } from '@devtool/plugin-sdk';\n\nexport async function run(ctx: ToolRunContext): Promise<ToolRunResult> {\n  return { output: String(ctx.input).toUpperCase() };\n}\n"
  }
}
```

## 实现计划

新增：

```txt
features/ai/AiPluginBuilderPage.tsx
core/ai/provider.ts
core/ai/plugin-builder.ts
core/ai/prompts/plugin-builder.ts
core/plugin/validate-generated-plugin.ts
core/plugin/security-scan.ts
core/storage/plugin-repository.ts
features/plugins/PluginImportExport.tsx
features/plugins/PluginSourcePreview.tsx
```

流程：

```txt
user prompt
→ AI structured JSON
→ schema validation
→ security scan
→ esbuild-wasm compile
→ optional smoke run
→ save source + build to IndexedDB
→ register plugin tools
→ run from main tool UI
```

## 安全限制

AI 生成插件第一版拒绝：

- npm dependency import。
- 外部 URL import。
- dynamic import。
- eval。
- new Function。
- DOM API。
- storage API。
- 未声明权限的 fetch。

如果 AI 生成 network 权限：

1. 展示权限提醒。
2. 用户必须明确确认。
3. 运行时仍应限制 origins。

## 导入导出

MVP 使用 JSON，不做 zip。

导出格式：

```json
{
  "type": "plugin-source",
  "manifest": {},
  "files": {}
}
```

导入后执行同样流程：

```txt
schema validation
→ security scan
→ compile
→ save
→ register
```

## 测试 spec

### Schema tests

1. AI 返回合法插件 JSON，可以通过校验。
2. 缺少 `manifest.id` 时校验失败。
3. 缺少 `files` 时校验失败。
4. tool entry 不存在于 files 时校验失败。
5. 权限声明不合法时校验失败。

### Security tests

1. 代码包含 `eval` 应拒绝。
2. 代码包含 `new Function` 应拒绝。
3. 代码访问 `window` 应拒绝。
4. 代码包含外部 import 应拒绝。
5. 未声明 network 权限时使用 fetch 应拒绝。
6. 声明 network 权限时应提示用户确认。

### Runtime tests

1. AI 生成的简单 uppercase 工具可以保存。
2. 保存后工具列表出现新工具。
3. 新工具可以执行。
4. 导出后重新导入仍可执行。
5. 编译错误可以展示给用户。

## 验证 / 调整测试

手动验证：

- 生成字符串转换工具。
- 生成非法插件。
- 生成需要网络权限的插件。
- 保存后刷新页面。
- 导出 / 导入插件。
- 删除插件后重新导入。

命令：

```bash
pnpm test core/ai
pnpm test core/plugin
pnpm test features/plugins
pnpm e2e
pnpm typecheck
pnpm build
```

## 提交

分支：

```txt
feat/ai-ts-plugin-builder
```

提交信息：

```txt
feat: add ai typescript plugin builder
```

## 机器 review

- schema validation tests
- security scan tests
- compiler tests
- plugin runtime tests
- storage tests
- e2e ai plugin save/load
- typecheck
- build

## 人工 review checklist

- [ ] AI 输出被严格校验。
- [ ] TypeScript 插件可以编译并执行。
- [ ] 生成插件默认安全。
- [ ] 权限提醒清楚。
- [ ] 插件能保存到本地 DB。
- [ ] 插件能导入导出。
- [ ] 生成插件能立即加载执行。
