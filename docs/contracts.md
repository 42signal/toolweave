# 工具与工作流协议

本文件合并工具与工作流的现有约定；实现顺序见[实施计划](implementation-plan.md)，用例和验证见[测试计划](testing-plan.md)。下列类型是协议草图，不是已实现 API；`JsonSchema` 表示配置 Schema，JSON 配置必须可序列化。

## 1. 工具

统一连接协议为 **`string input + JSON config → string output`**。JSON、Base64、时间等在工具内部解析；运行时实现与可持久化数据分开：

```ts
type ToolManifest = {
  id: string;
  version: string;
  name: string;
  description: string;
  category: string;
  source: "builtin" | "workflow" | "ai-generated";
  configSchema: JsonSchema;
};

type ToolImplementation = {
  run(input: string, config: unknown): string | Promise<string>;
};

type ToolError = {
  code:
    | "UNKNOWN_TOOL"
    | "INVALID_CONFIG"
    | "INVALID_INPUT"
    | "EXECUTION_FAILED"
    | "TIMEOUT"
    | "CANCELLED";
  message: string;
  details?: unknown;
};

type ToolResult =
  | { ok: true; output: string; durationMs: number }
  | { ok: false; error: ToolError; durationMs: number };
```

- ID 稳定且点分隔；版本、名称、描述非空。category 用于筛选，不表示权限。
- 注册 ID 唯一，重复失败而不覆盖；查找失败返回 `UNKNOWN_TOOL`。
- 配置在入口按 Schema 校验；工具不访问 UI、应用状态、存储、DOM、网络、文件或 Cookie。
- 错误明确传播，不以默认值掩盖非法输入；错误详情不包含完整输入、Key 或 AI 请求。
- 从持久化或 AI 读入的数据先校验再注册；只保存 manifest、源码、配置等数据，不保存函数。

| 工具 ID                           | 用途                 | 配置留白                                                                                |
| --------------------------------- | -------------------- | --------------------------------------------------------------------------------------- |
| `format`                          | 格式化/转换          | `inputFormat=auto/json/yaml`、`outputFormat=json/yaml`、`indent=0..8`，默认 auto/json/2 |
| `minify`                          | 压缩                 | `inputFormat=auto/json/yaml`，默认 auto，输出紧凑 JSON                                  |
| `base64.encode` / `base64.decode` | 文本编码/解码        | 已确认：UTF-8、严格标准 Base64、空配置                                                  |
| `url.encode` / `url.decode`       | URL 编码/解码        | 已确认：URI component、空配置                                                           |
| `jwt.decode`                      | Token 解码为 JSON    | 已确认：`{ header, payload }`、不验签、空配置                                           |
| `uuid.generate`                   | 生成 UUID            | 已确认：安全随机 v4、忽略输入、空配置                                                   |
| `unix-time.convert`               | 时间转换             | 独立 `inputFormat` / `outputFormat`，默认 auto / seconds                                |
| `url.parse` / `url.build`         | URL 与 JSON 双向转换 | 五字段，query 对象单值/数组，生成兼容旧二元组；空配置                                   |
| `diff.compare`                    | 结构化/文本 Diff     | `mode=auto/structured/text`，默认 auto；字符串 envelope 双输入                          |

## 2. 线性工作流

工作流是有序步骤数组，不是 DAG。第一步接收用户输入，后续步骤接收前一步字符串输出；全部成功时返回最后一步输出。

```ts
type Workflow = {
  id: string;
  version: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
};

type WorkflowStep = {
  id: string;
  toolId: string;
  config: Record<string, unknown>;
};

type WorkflowStepResult = {
  stepId: string;
  toolId: string;
  input: string;
  output?: string;
  error?: ToolError;
  status: "pending" | "running" | "succeeded" | "failed" | "cancelled";
  durationMs?: number;
};

type WorkflowToolDefinition = {
  toolId: string;
  sourceWorkflowId?: string;
  workflowSnapshot: Workflow;
};
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
  name: string;
  description: string;
  steps: Array<{ toolId: string; config: Record<string, unknown> }>;
};

type GeneratedToolDraft = {
  id: string;
  manifest: ToolManifest;
  source: string;
  tests: GeneratedToolTest[];
  explanation: string;
  status: "draft" | "tested" | "rejected" | "enabled";
};
```

生成工具先存草稿，按 `draft → tested → enabled` 或 `draft/tested → rejected` 推进；测试失败或未确认不能注册。`GeneratedToolTest` 的数据格式待确认。

AI 工具仅做字符串转换，在独立 QuickJS guest 中运行，不授予网络、DOM、storage、文件、模块导入、宿主 Worker 或应用状态能力，也不允许跨运行共享状态。源码/配置/输出和测试都经过大小及结构校验。安全边界和资源终止验证不通过就停止该功能。

## 本批已确认：时间、结构化数据与 Diff

工具 ID 已统一为 `format` / `minify`，界面标题为 Format / Minify、格式化 / 压缩；源码入口为 `src/tools/format.ts` / `src/tools/minify.ts`。当前仍只支持 JSON/YAML，不提前扩展格式。下文历史记录中的 `json.format` / `json.minify` 不再是当前可调用 ID；目前没有持久化工具/工作流，因此不增加旧 ID 别名或迁移。

此节与[本批 Spec](../tests/e2e/data-tools.md)取代下文历史 JSON/时间/query 规则，其余 Worker 生命周期、隐私、切换与国际化约定保持不变。沿用 12 项静态工具目录，`string input + JSON config → string output` 不变。

- **结构化数据**：输入 auto 先尝试 JSON，语法不匹配再尝试 YAML；显式 json 不回退。输出 JSON 或 YAML（格式化），压缩固定紧凑 JSON。只接受 JSON 兼容数据，YAML 使用 core schema；日期字符串不隐式转日期。拒绝空输入、重复 YAML 键、非字符串键、非有限数、未知标签、多文档及循环引用。普通 YAML 字符串可格式化为 JSON 字符串，但不会因此自动成为结构化 Diff。YAML 不保留注释/原始排版，JSON 数字沿用原生精度；YAML 缩进 0 按最小合法的 1 空格输出。
- **时间**：输入 auto/seconds/milliseconds/nanoseconds/date；输出 seconds/milliseconds/nanoseconds/iso，默认 auto→seconds。auto 数字绝对值 `>=1e17` 按 ns、`>=1e11` 按 ms，其余按 s；不猜微秒，歧义使用显式单位。十进制秒至多 9 位小数、毫秒至多 6 位、纳秒整数，不接受科学计数法。BigInt 精确换算，范围不超过 Date 的 ±8640000000000000ms；ISO UTC 输出至少三位小数，必要时保留到九位。
- **日期与 now**：ISO 8601、RFC 2822（英文月份、数字偏移/GMT/UTC）、`YYYY-MM-DD` / `YYYY/MM/DD`，可带小时/分钟、秒、小数秒。无时区按浏览器本地时区，不猜日/月顺序；拒绝日历溢出和本地不存在的 DST 时间。空白输入每次执行取一次当前时间，来源仅毫秒精度，不持续更新。
- **URL**：仍只支持绝对 HTTP(S) 无凭据 URL，不访问网络。其余五字段不变；`query` 输出为 `Record<string, string | string[]>`，空 query 为 `{}`，单值字符串，重复值按同键出现顺序组成数组。生成接受该对象或旧字符串二元组数组，拒绝非字符串值、空数组及非法结构。对象不承诺跨键交错/数字键顺序，旧数组保留全部参数顺序；URL 规范化规则不变。
- **Diff**：input 是 JSON 字符串 `{ "before": "原始内容", "after": "修改内容" }`，只接受这两项字符串字段，UI 为双输入框，未增加通用多端口工作流。auto 两边均为可解析 JSON/YAML 对象或数组时结构化比较，否则文本回退；显式 structured 解析失败报错。结构化结果为 RFC 6902 add/remove/replace 数组，JSON Pointer 转义，忽略对象键顺序，数组逐索引比较；删除数组项从后往前，无变化 `[]`。文本为 unified diff，无变化空字符串。UI 显示双语“没有差异”，结果只按文本呈现。

URL 新结构示例：

```json
{
  "protocol": "https:",
  "host": "example.com:8080",
  "pathname": "/search",
  "query": { "q": "hello world", "tag": ["a", "b"] },
  "hash": "#results"
}
```

## 待确认决策与历史确认

### 首个工具已确认行为

`json.format` 的请求为 `{ toolId, input, config }`，返回上文的 `ToolResult`。`config` 必须为仅含可选 `indent` 的对象，不隐式转换类型；未知字段和非法缩进返回 `INVALID_CONFIG`。合法 JSON 对象、数组和标量均支持；空白/空输入及非法 JSON 返回 `INVALID_INPUT`，错误消息不回显输入或原始解析异常。遵循浏览器 `JSON.parse`/`JSON.stringify` 语义，不保证无损保留大整数、重复键或原始数字写法。

每次运行使用独立本地 Worker；完成、失败、取消或页面卸载均终止该 Worker。取消返回 `CANCELLED`，迟到响应不能改变终态。编辑输入或配置会清除旧结果；运行中禁用编辑和重复运行，取消后可以再运行。输入和结果仅在内存中，刷新不保留。耗时是可观察的非负毫秒值，不作为性能预算承诺。

当前仅实现 12 项静态内置目录与分发；不接受外部 manifest 或任意 Schema，因此不提前实现通用 Zod/Ajv 注册流程。下述历史行为由本批规则覆盖的部分不再适用。

### JSON 压缩与工具切换已确认行为

`json.minify` 使用同一请求/结果协议，`config` 必须为空对象，缺失、非对象或任何配置字段（含 `indent`）返回 `INVALID_CONFIG`。使用已有 JSON 解析/错误映射与零缩进输出，支持对象/数组/标量，保留字符串内容中的空白；空/空白/非法 JSON 返回 `INVALID_INPUT`，UI 仅显示友好说明。与格式化相同，不保证无损保留大整数、重复键或原始数字写法。

默认选中格式化，工具按钮显示当前选中状态；切换保留当前输入，清除输出、错误与耗时并恢复待运行，点击当前工具不清除结果。压缩隐藏缩进控件、提交空配置。运行中工具按钮禁用，取消/完成后恢复；切换语言不改变选中工具或运行状态。输入、选择与结果均不持久化，刷新回到格式化。

### 已确认国际化行为

- `en` 为默认/兜底，`zh-CN` 为唯一中文词典。按 `navigator.languages` 顺序查找首个 `en`/`en-*` 或 `zh`/`zh-*`，大小写不敏感，所有中文变体使用简体；未知或缺少语言信息回退英文。
- UI、placeholder、无障碍名称及运行状态使用相同语言；`html.lang` 与选择结果一致。右上角选择跟随浏览器 / English / 简体中文；默认自动，手动选择仅当前页面生效，刷新恢复自动。手动模式不被浏览器 `languagechange` 覆盖，选回跟随立即应用最新浏览器偏好；所有切换均保留输入、缩进、结果及正在运行的 Worker。
- 工具 ID 和用户输入/输出不翻译。内置工具名称以 ID 查词典；Worker/执行服务只返回英文诊断，错误码仍为内部稳定协议。UI 仅按码显示当前语言的友好说明，不展示错误码或任意底层异常文本。
- 两份词典随应用打包，无远程翻译请求；不增加偏好存储、繁体翻译或 URL 语言路由。

### 整批内置工具已确认行为

用户确认原定 9 个工具整批实现，另增加 `url.parse` / `url.build`，共 11 项；沿用执行入口、真实 App 和生产 Worker 验证边界。无配置工具只接受空对象，不隐式转换或忽略字段。新增标签、placeholder、错误、配置及提示均英中双语，错误不显示技术码或原始输入。

- Base64：UTF-8 编解码，空字符串成功。编码不替换不完整 Unicode；解码只接受规范标准字母表和必要填充，拒绝空白、Base64URL、缺失/错误填充、非零填充位和非法 UTF-8，不静默修复。
- URL 编解码：`encodeURIComponent` / `decodeURIComponent` 语义，空输入成功；解码 `+` 保持 `+`，坏百分号/UTF-8 或编码时不完整 Unicode 为输入错误。
- JWT：三段 compact JWS，header/payload 必须是 JSON 对象；两段严格无填充 Base64URL，签名段为无填充 Base64URL（可空），只检查格式，不验证签名、算法或过期时间。输出两空格 JSON `{ header, payload }`，始终显示未验签提示，不称 token 有效。
- UUID：浏览器 `crypto.randomUUID()` 安全随机 v4，输入忽略，UI 标明，不测具体随机值或两次不同。
- 时间：配置仅可选 `mode`，默认 `seconds-to-iso`，另有 `milliseconds-to-iso`、`iso-to-seconds`、`iso-to-milliseconds`。时间戳接受带符号十进制（秒最多三位小数、毫秒整数），不猜单位、不接受空/科学计数；范围为 JavaScript Date 可表示的整毫秒。ISO 输入为带 `Z` 或 `±HH:mm` 时区的完整日期时间，秒必填、可选 1–3 位毫秒，拒绝日历溢出和无时区。输出 ISO 为 UTC；秒输出保留毫秒对应的小数，不取整。

URL 双向转换首版只处理绝对 HTTP/HTTPS，不访问网络；不接受凭据 URL 或未定义字段，避免静默丢弃。JSON 必须且仅包含：

```json
{
  "protocol": "https:",
  "host": "example.com:8080",
  "pathname": "/search",
  "query": [
    ["q", "hello world"],
    ["tag", "a"],
    ["tag", "b"]
  ],
  "hash": "#results"
}
```

`protocol` 为 `http:`/`https:`，`host` 为非空主机及可选端口（含 IPv6）；`pathname` 以 `/` 开头，`hash` 为空或以 `#` 开头，`query` 为字符串二元组数组，允许空键/值、重复键并保序。解析保留编码后的 path/hash，query 解码且 `+` 表示空格（与 URI component 工具不同）；拼接通过 URL/URLSearchParams 编码。非法结构、编码或不支持协议报输入错误。遵循 WHATWG URL 规范化（主机大小写/默认端口/路径归一化、query 空格转 `+`），承诺结构语义而非原始 URL 字节完全一致，空 `?`/`#` 不单独保留。

以下是**建议，不是已获批的协议变更**。对应工作包前 review 确认并更新本文件，再写正式测试；本轮精简不代替确认。

| 决策         | 建议                                                                                                                       | 确认时间       |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 配置/JSON    | JSON 格式化规则已确认，见上文；通用 Schema 子集仍待 review                                                                 | 本切片 / PR-02 |
| 取消/终态    | 硬终止当前 Worker，忽略迟到结果；失败整体 `failed`，取消整体 `cancelled`                                                   | PR-04 / PR-07  |
| 快照依赖     | 步骤和配置固定，依赖按当前本地启用版本解析；缺依赖阻止运行并提示                                                           | PR-10          |
| AI 代码/测试 | 脚本声明 `function run(input, config)`，无 import/export，返回字符串；测试仅 `{ input, config, expectedOutput }`，宿主断言 | PR-14 / PR-15  |
| AI 审查      | 新建看完整源码、更新看 Diff；改源码/Schema/测试后通过状态与确认失效                                                        | PR-15          |
| 导入信任     | AI 工具导入后重新为草稿，不信任文件的 tested/enabled；Key 不持久化、不导出                                                 | PR-16          |
| 资源上限     | 版本化常量统一限制源码/输入/输出 UTF-8 字节、步骤/展开次数、嵌套、时间和 QuickJS 内存；先确认具体值                        | 各执行器实现前 |

测试资源边界需覆盖上限前/等于上限/超限，并在真实浏览器用默认限制验证终止，不能只模拟超时。
