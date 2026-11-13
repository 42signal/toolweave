# JSON 格式化纵切验证

日期：2026-11-13。范围：`json.format` 的配置/错误、本地执行服务、Worker、真实 App 与响应式页面；不代表 PR-02～PR-06 全部完成。

## 版本与交付

- 基础提交：`cc0f879`。用户确认范围与测试授权后，先提交测试基线 `dbcdcea`（包括必要类型、可执行失败桩及已确认协议）；当前实现是该提交之上的未提交工作区。
- Node 26.13.0、pnpm 12.3.4、Vitest 4.1.12、Playwright 1.65.0；没有新增生产依赖。
- 实现：`src/tools/execute-tool.ts` / `json-format.ts` 的公开执行入口；`start-tool.ts` 的每次运行独立 Worker 和终态；`tool.worker.ts` 消息入口；`ToolWorkspace.tsx` 页面。
- 默认 2 空格，允许整数 0–8；空/非法输入、非法配置脱敏失败；取消硬终止、迟到响应不覆盖结果，卸载释放；输入/结果仅内存。Worker 不访问网络和存储。

## Red → Green

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| 初始行为 Red | `pnpm test` | exit 1，34 failed / 5 passed；缺少转换、Worker 启动和页面控件，不是导入或构建失败 |
| 页面 Red | `pnpm e2e --project=chromium --grep '\[E-01\]'` | exit 1，2 failed；生产构建成功，页面缺少 JSON 工具标题/输入 |
| 定向 Green | `pnpm test:coverage` | exit 0，随后完整回归复验 |
| 最终回归 | `pnpm verify` | exit 0；typecheck、lint、format、40/40 Unit/Component、生产构建、Chromium 5/5 |
| 最终可启动浏览器 | `pnpm e2e --project=chromium --project=webkit` | exit 0，Chromium 5/5、WebKit 5/5；retries=0 |
| 三浏览器首次矩阵 | `pnpm e2e` | exit 1，9 passed / 6 failed：Firefox 启动失败 5 项，WebKit 键盘焦点失败 1 项 |
| WebKit 根因修复后 | `pnpm e2e --project=webkit --grep '\[E-09\]'` | exit 0，1/1；按钮显式 `tabIndex=0` 后焦点/Enter 路径通过，再做上述完整双浏览器回归 |

初始 Red 记录时共 39 条；提交前在同一已授权范围内修正参数化数组展开，并补充发送失败的 Worker 释放用例，最终共 40 条。没有修改业务预期、跳过用例或增加重试。

## 覆盖与真实行为

- `execute-tool.test.ts`：22 条，BT-01 的配置、错误映射和固定缩进向量；CT-02 未知工具；CT-04 请求校验。没有为标准 JSON API 单独建测试。
- `start-tool.test.ts`：14 条，平台 Worker 替身覆盖结果隔离、取消/迟到、非法响应、异常/消息失败及释放；不是替换内部业务实现。
- `ToolWorkspace.test.tsx`：3 条，运行禁用、成功/错误/取消/重试、配置、编辑清除旧结果和卸载；另复用 APP-00。
- `json-format.spec.ts`：4 条加 E-00；真实构建 Worker 加载、Unicode/数组/null/HTML 文本、缩进 0/2/4/8、脱敏错误恢复、同任务取消再运行、375px 键盘操作；正常工具场景观察到的请求均为本地 GET。
- 最终 coverage：statements 97.64%、branches 96.82%、functions 100%、lines 98.75%。仅排除测试设施、薄浏览器入口 `main.tsx` 和 `tool.worker.ts`；Worker 接线由真实 E2E 覆盖，协议/转换/执行服务/UI 仍在统计内。

agent-browser 0.43.0 / Chrome 157.0.8103.78 使用独立会话访问 `http://127.0.0.1:5173/`。实现前打开/刷新只有空工作区；实现后实际输入/运行/变更缩进、观察非法输入错误并修正、同任务取消、Tab/Enter 再运行。已检查 1440×900、375×812 截图；375px 下 scrollWidth=375，输出与输入保持上下顺序。会话已关闭，用户原有开发服务器保留。

## 证据

- 初始 Red：`test-results/json-format/red/unit-initial.xml`、`test-results/json-format/red/browser/`（失败截图/trace）。
- 最终 Unit：`test-results/unit/junit.xml`；coverage：`coverage/coverage-summary.json`、`coverage/index.html`。
- 最终双浏览器：`test-results/browser/junit.xml`、`playwright-report/index.html`。
- 三浏览器首次失败保留：`test-results/json-format/first-matrix/browser/`，包含 Firefox 启动日志、WebKit 焦点失败截图/trace。
- 实际视觉检查：`test-results/json-format/desktop.png`、`test-results/json-format/mobile.png`。均为合成输入，不提交生成产物。
- 构建：主 JS 224.01 kB / gzip 70.39 kB；CSS 3.93 kB / gzip 1.30 kB；独立 Worker 1.17 kB。这是体积基线，不是性能达标结论。

## 限制与停止点

- Firefox 延续基础阶段环境问题：`Could not find profile folder`，页面没有打开。没有 skip 或放宽断言；本机全浏览器矩阵仍未通过，需在可启动环境补验。CI 未远程运行。
- Worker 平台的崩溃/坏消息以边界替身验证恢复和释放，未在真实浏览器中人为注入 Worker 崩溃；真实浏览器验证正常执行、输入错误和取消。
- JSON 使用浏览器原生解析/序列化，不能无损保留大整数、重复键或数字原始写法。没有增加新的大小/超时预算，也未测量大输入性能；取消可用不代表任意大小输入都不会耗尽内存。
- 主题切换、PWA、工作流、其余工具及 AI 均未实现；不承诺离线冷启动。当前停在本切片 review，测试已按授权提交，应用实现未自动提交/push。
