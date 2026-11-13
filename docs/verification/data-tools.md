# 时间、结构化数据与 Diff 验证

日期：2026-11-13 22:07 CST。测试基线 `784ce96`，验证对象为该提交加当前未提交工作区（包括上一批工具实现），不是仅 HEAD。用户已授权测试先行；只提交了测试基线，没有提交/push 功能、创建 PR、部署或推进下一工作包。

## 范围

- 共 12 项静态内置工具；保留 `json.format` / `json.minify` ID，支持 JSON/YAML 格式化/互转与压缩；共享解析用于结构化 Diff。第三方 `yaml@2.9.1`、`diff@9.0.0`、`date-fns@4.4.0`，解析/转换都在运行时创建的本地 Worker，不进入主 UI bundle、不访问远程 API。
- 时间输入/输出独立，auto 按绝对量级识别 s/ms/ns、支持常见日期和本地时区、空输入取一次 now；BigInt 纳秒换算，保留正负数及大数精度。URL query 单值字符串/多值数组对象，生成兼容原二元组数组。
- Diff 双输入 UI，通过字符串 envelope 维持现有执行协议；auto 仅两边对象/数组时结构化，显式 structured 不回退；结构化输出 JSON Patch，文本 unified diff。无变化、错误恢复、双语、禁用/取消和输入/结果清理保持一致。
- 自有校验/组合在 `executeTool` seam 测试；组件仅替换浏览器 Worker；E2E 使用生产页面和真实 Worker，无网络请求替身。不单独重测标准库/第三方解析算法。

行为与用例明细见 [Spec](../../tests/e2e/data-tools.md)及[协议](../contracts.md#本批已确认时间结构化数据与-diff)。没有加入 TOML/XML、彩色 Diff 编辑器、微秒、自然语言日期、工作流多端口、PWA 或 AI。

## Red → Green

| 阶段               | 命令                                                                                                            | 结果                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Unit/Component Red | `pnpm test`                                                                                                     | exit 1，75 failed / 164 passed；新转换不支持、旧时间配置/query 结构/控件预期不符 |
| 生产页面 Red       | `pnpm e2e --project=chromium --grep '\[DATA-E01\]'`                                                             | exit 1，2 failed；页面尚无输入格式控件，缺功能而非浏览器启动失败                 |
| 测试基线           | `git commit -m "test: define structured data, precise time and diff tools"`                                     | `784ce96`，仅 11 个测试/Spec 文件；原有脏实现未纳入                              |
| 核心逻辑 Green     | `pnpm exec vitest run src/tools/data-tools.test.ts src/tools/url-query.test.ts src/tools/builtin-tools.test.ts` | exit 0，166/166                                                                  |
| 定向浏览器 Green   | `pnpm e2e --project=chromium --grep '\[DATA-E01\]'`                                                             | exit 0，2/2                                                                      |
| 最终完整验证       | `pnpm verify`                                                                                                   | exit 0，typecheck/lint/format、239/239 Unit/Component、构建、Chromium 20/20      |
| 完整浏览器矩阵     | `pnpm e2e`                                                                                                      | exit 1，40 passed；Chromium 20/20、WebKit 20/20，Firefox 20 项启动失败           |
| 最终双浏览器       | `pnpm e2e --project=chromium --project=webkit`                                                                  | exit 0，40/40                                                                    |
| Diff 检查          | `git diff --check`                                                                                              | exit 0                                                                           |

初次 Green 发现旧组件测试遗漏输入标签迁移，补齐为 JSON / YAML；没有改变原成功、错误、取消或状态断言。新增 E2E 的 `getByLabel(..., exact:true)` 对包裹 select 的 label 包含选项文本，改为精确 `getByRole("combobox", {name})`，保留相同功能预期；修复测试 matcher 的 lint 类型问题与格式。上述修正留工作区，未混入功能提交。

`pnpm exec playwright test --list --reporter=list` 发现 60 项（每浏览器 20），retries=0，无 skip。Firefox 仍为已有 `Could not find profile folder`，未加载业务页面；不是产品断言失败，未反复重试或放宽断言。远程 CI 未运行，不能称发布矩阵全绿。

## 实际浏览器探测

- `agent-browser 0.43.0`，`agent-browser install` exit 0，复用 Chrome 157.0.8103.78。独立 session `tw-data-tools`，地址 `http://127.0.0.1:5173/`，只操作合成文本。
- 测试编写前实际操作旧时间转换 `0 → 1970-01-01T00:00:00.000Z`，URL `a=1&a=2&q=x` 观察旧 query 数组；页面快照确认工具按钮、输入/输出及原时间控件。
- 实现后实际运行 YAML → JSON、JSON/YAML Diff（`{"a":1}` 对 `a: 2` 得 `/a` replace），自动 ns → 秒/ISO（`1700000000123456789` 得 `1700000000.123456789` / `2023-11-14T22:13:20.123456789Z`）。375px 与 1440px 截图检查边框、标签、双输入与输出，无水平溢出；完整双语业务断言由生产 E2E 完成。
- 探测会话已关闭；用户开发服务保留。仅截图不作为业务正确性证明，也未操作用户浏览器页。

## 环境与产物

Node 26.13.0、pnpm 12.3.4。最终 coverage：statements **96.05%**、branches **95.14%**、functions **94.18%**、lines **96.90%**，通过原门槛，无新增排除项。

主 JS **295.47 kB / gzip 92.27 kB**，CSS **4.60 / gzip 1.44 kB**，Worker **149.63 kB**。新增解析库在 Worker，只有运行工具才加载，但目前所有工具仍共享该 Worker bundle；这仅为体积记录，不是性能预算或大输入性能已达标的声明。

- 原始命令日志：`test-results/data-tools/red-unit.log`、`red-browser.log`、`verify-final.log`、`matrix.log`、`final-browsers.log`。
- JUnit：`test-results/unit/junit.xml`、`test-results/browser/junit.xml`；HTML：`playwright-report/index.html`；coverage：`coverage/index.html`。后续运行会覆盖通用报告，分阶段日志保留数量与失败原因。
- 视觉：`test-results/data-tools/time-desktop.png`、`diff-desktop.png`、`diff-mobile.png`、`diff-mobile-result.png`。皆为合成数据，本地忽略产物，无真实秘密。

## Review 与限制

- 验证后用户完成 review，授权将功能实现和测试标签修正一起提交，Diff 暂保持当前版本；未授权 push。上文未提交状态为验证时记录。旧时间 `mode` 配置已由确认后的独立配置取代；目前无持久化工作流，无迁移任务。
- 自动单位是启发式，历史/远期值应手动覆盖；now 来源毫秒，不能声称真实纳秒时钟。无时区用本地时区，重复的 DST 时刻沿用平台 Date 选择，不猜歧义日/月格式。
- JSON/YAML 不保证无损大整数/注释/原始格式；query 对象不能保留跨键交错次序。Diff 数组按位置而非智能移动匹配，输出可读文本/补丁，不提供彩色编辑器。
- Firefox、远程 CI、性能负载/长期使用及原生设备未通过或未执行；工作流、PWA、主题切换、AI 仍未实现。
