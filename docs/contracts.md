# 工具与工作流协议

本文件合并工具与工作流的现有约定；实现顺序见[实施计划](implementation-plan.md)，用例和验证见[测试计划](testing-plan.md)。下列类型是协议草图，不是已实现 API；`JsonSchema` 表示配置 Schema，JSON 配置必须可序列化。

## 1. 工具

统一连接协议为 **`string input + JSON config → string output`**。JSON、Base64、时间等在工具内部解析；运行时实现与可持久化数据分开：

```ts
type ToolManifest = {
  id: string
  version: string
  name: string
  description: string
  category: string
  source: "builtin" | "workflow" | "ai-generated"
  configSchema: JsonSchema
}

type ToolImplementation = {
  run(input: string, config: unknown): string | Promise<string>
}

type ToolError = {
  code: "UNKNOWN_TOOL" | "INVALID_CONFIG" | "INVALID_INPUT"
    | "EXECUTION_FAILED" | "TIMEOUT" | "CANCELLED"
  message: string
  details?: unknown
}

type ToolResult =
  | { ok: true; output: string; durationMs: number }
  | { ok: false; error: ToolError; durationMs: number }
```

- ID 稳定且点分隔；版本、名称、描述非空。category 用于筛选，不表示权限。
- 注册 ID 唯一，重复失败而不覆盖；查找失败返回 `UNKNOWN_TOOL`。
- 配置在入口按 Schema 校验；工具不访问 UI、应用状态、存储、DOM、网络、文件或 Cookie。
- 错误明确传播，不以默认值掩盖非法输入；错误详情不包含完整输入、Key 或 AI 请求。
- 从持久化或 AI 读入的数据先校验再注册；只保存 manifest、源码、配置等数据，不保存函数。

| 工具 ID | 用途 | 配置留白 |
| --- | --- | --- |
| `json.format` | JSON 格式化 | 缩进 |
| `json.minify` | JSON 压缩 | 无 |
| `base64.encode` / `base64.decode` | 文本编码/解码 | 编码规则待确认 |
| `url.encode` / `url.decode` | URL 编码/解码 | URI 语义待确认 |
| `jwt.decode` | Token 解码为 JSON | 输出结构待确认 |
| `uuid.generate` | 生成 UUID | 随机源/版本待确认 |
| `unix-time.convert` | 时间转换 | 方向/单位待确认 |

## 2. 线性工作流

工作流是有序步骤数组，不是 DAG。第一步接收用户输入，后续步骤接收前一步字符串输出；全部成功时返回最后一步输出。

```ts
type Workflow = {
  id: string
  version: string
  name: string
  description: string
  steps: WorkflowStep[]
  createdAt: number
  updatedAt: number
}

type WorkflowStep = {
  id: string
  toolId: string
  config: Record<string, unknown>
}

type WorkflowStepResult = {
  stepId: string
  toolId: string
  input: string
  output?: string
  error?: ToolError
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled"
  durationMs?: number
}

type WorkflowToolDefinition = {
  toolId: string
  sourceWorkflowId?: string
  workflowSnapshot: Workflow
}
```

- 工作流 ID 唯一，名称/版本非空；执行前检查非空步骤、步骤 ID、工具存在、配置和数量上限。
- 一步失败即停止，后续保持 `pending`；取消后未开始步骤标记 `cancelled`；超时使用 `TIMEOUT`。整体必须结束 loading，不能把 `pending` 误认为仍在执行。
- 编辑只含添加、删除、上下移动、配置和查看结果；不含分支、循环、并行或多端口。
- 保存为工具复制步骤及配置快照；原工作流修改不影响工具。可再次串联，执行前重新检查依赖；缺依赖明确失败而不删除内容。
- 快照不自动代表锁定依赖工具版本。循环检测、硬取消和具体预算见待确认表；未来升级 DAG 需单独版本迁移，不改变已有语义。

## 3. AI 草稿

AI 返回不可信数据。工作流草稿必须经过 **解析 → Schema → 工具与配置/数量校验 → 预览 → 确认** 才能写入编辑器，不自动执行或覆盖用户修改。

```ts
type WorkflowDraft = {
  name: string
  description: string
  steps: Array<{ toolId: string; config: Record<string, unknown> }>
}

type GeneratedToolDraft = {
  id: string
  manifest: ToolManifest
  source: string
  tests: GeneratedToolTest[]
  explanation: string
  status: "draft" | "tested" | "rejected" | "enabled"
}
```

生成工具先存草稿，按 `draft → tested → enabled` 或 `draft/tested → rejected` 推进；测试失败或未确认不能注册。`GeneratedToolTest` 的数据格式待确认。

AI 工具仅做字符串转换，在独立 QuickJS guest 中运行，不授予网络、DOM、storage、文件、模块导入、宿主 Worker 或应用状态能力，也不允许跨运行共享状态。源码/配置/输出和测试都经过大小及结构校验。安全边界和资源终止验证不通过就停止该功能。

## 待确认决策

以下是**建议，不是已获批的协议变更**。对应工作包前 review 确认并更新本文件，再写正式测试；本轮精简不代替确认。

| 决策 | 建议 | 确认时间 |
| --- | --- | --- |
| 配置/JSON | 仅支持明确列出的 Schema 字段；缩进整数 0–8，默认 2，不隐式转换类型 | PR-02 / PR-03 |
| Base64 | 标准 Base64 + UTF-8；非法字母/填充/UTF-8 返回 `INVALID_INPUT` | PR-03 |
| URL | URI component 语义，`+` 保持不变；坏 `%` 失败 | PR-03 |
| JWT | 仅解码不验签，输出 `{ header, payload }`；坏分段/编码/JSON 失败；界面提示未验签 | PR-03 |
| UUID | v4、忽略输入；平台安全随机源，是确定性纯函数约束的例外 | PR-03 |
| 时间 | 显式 `seconds-to-iso` / `milliseconds-to-iso` / `iso-to-seconds` / `iso-to-milliseconds`；ISO 带时区、输出 UTC，不猜测单位 | PR-03 |
| 取消/终态 | 硬终止当前 Worker，忽略迟到结果；失败整体 `failed`，取消整体 `cancelled` | PR-04 / PR-07 |
| 快照依赖 | 步骤和配置固定，依赖按当前本地启用版本解析；缺依赖阻止运行并提示 | PR-10 |
| AI 代码/测试 | 脚本声明 `function run(input, config)`，无 import/export，返回字符串；测试仅 `{ input, config, expectedOutput }`，宿主断言 | PR-14 / PR-15 |
| AI 审查 | 新建看完整源码、更新看 Diff；改源码/Schema/测试后通过状态与确认失效 | PR-15 |
| 导入信任 | AI 工具导入后重新为草稿，不信任文件的 tested/enabled；Key 不持久化、不导出 | PR-16 |
| 资源上限 | 版本化常量统一限制源码/输入/输出 UTF-8 字节、步骤/展开次数、嵌套、时间和 QuickJS 内存；先确认具体值 | 各执行器实现前 |

测试资源边界需覆盖上限前/等于上限/超限，并在真实浏览器用默认限制验证终止，不能只模拟超时。
