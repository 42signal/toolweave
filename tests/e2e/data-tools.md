# 时间、结构化数据与 Diff

本批已获用户 `go` 授权：调整 Unit/Component/E2E，先提交测试基线，再实现并停在 review；不提交或推送功能实现。复用 `executeTool`、真实 App、生产 Worker 三个公开验证边界。

## 已确认行为

- 使用通用 `format` / `minify` ID，界面标题为 Format / Minify、格式化 / 压缩。配置 `inputFormat=auto|json|yaml`；格式化另有 `outputFormat=json|yaml`（默认 json）、`indent=0..8`（默认 2）；压缩只接受输入格式，输出紧凑 JSON。YAML 采用 JSON 兼容数据模型，拒绝非字符串键、非有限数、重复 YAML 键、未知标签和循环引用；注释、格式和大整数不保证无损保留。空输入仍报错。
- 时间配置为独立的 `inputFormat=auto|seconds|milliseconds|nanoseconds|date` 和 `outputFormat=seconds|milliseconds|nanoseconds|iso`，默认 auto→seconds。自动识别数字取绝对量级：`>=1e17` 为 ns、`>=1e11` 为 ms，否则 s；这是启发式，不猜微秒，历史/远期时间可手动指定。允许十进制秒（至多 9 位小数）、毫秒（至多 6 位）、整数纳秒，不接受科学计数法。所有单位转换保留纳秒精度，不通过浮点秒换算。
- 日期支持带时区 ISO、RFC 2822、`YYYY-MM-DD` / `YYYY/MM/DD`（可带空格或 T 分隔的小时/分钟、可选秒和 1–9 位小数）。无时区按浏览器本地时区，日历溢出及本地不存在的 DST 时间拒绝；ISO 输出为 UTC。空白输入每次运行取一次 `Date.now()`，实际来源只有毫秒精度。数值范围不超过 Date 的 ±8640000000000000ms，ISO 默认至少三位小数，需要时保留至九位。
- URL query 输出对象，单值为字符串，重复值为字符串数组；空 query 是 `{}`。生成接受该对象以及旧二元组数组，值不隐式转换（不接受数字/null/嵌套对象/空数组）。对象不能保留跨键交错顺序；同键值顺序保留，旧数组完整保序。
- `diff.compare` 保持字符串协议：input 为 JSON envelope `{before:string,after:string}`，config 为 `mode=auto|structured|text`（默认 auto）。UI 提供两个独立输入框，编辑任何输入/配置清除旧输出，运行中禁改，语言切换保留两份输入与结果。
- 自动 Diff 仅在两边均可解析为 JSON/YAML 对象或数组时结构化比较；标量、普通文本或无法解析时逐行文本比较。显式 structured 模式不回退。结构化输出 RFC 6902 add/remove/replace 补丁，JSON Pointer 路径转义，忽略对象键顺序、数组按索引比较；无变化输出 `[]`。文本输出 unified diff，无变化输出空字符串。UI 无变化显示双语友好提示，用户内容只渲染文本。

## 用例

| ID          | 验证                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| DATA-TIME   | 自动单位、手动覆盖、负数、纳秒和大数精度、常见日期、本地时区、空输入时钟、非法配置/日期/范围              |
| DATA-URL    | 单值/多值/空值/特殊键、新旧 query 生成、类型校验；调整原 BT-06 预期                                       |
| DATA-STRUCT | JSON/YAML 转换、输入自动/手动、压缩、缩进、JSON 兼容边界与脱敏错误                                        |
| DATA-DIFF   | 跨格式结构化比较、键顺序、数组、路径转义、增删、文本回退、显式模式与边界校验                              |
| DATA-UI     | 独立时间设置、两份 Diff 输入、清理/禁用/取消、双语状态保留；复用既有 Worker 生命周期回归                  |
| DATA-E01    | 英/中、375px、真实 Worker：YAML↔JSON/压缩、自动时间/空时间、新 query、结构化及文本 Diff、错误恢复、无外联 |

环境、报告与执行流程复用 `docs/testing-plan.md`。浏览器探测使用独立 `tw-data-tools` session，不操作用户页或持久化数据。
