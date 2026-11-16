# Cron 解析与组合验证记录

工作区：`/Users/exherb/Git/42signal/42proj`（Node 26.13.0、pnpm 12.3.4、Vite 8.3.8、Playwright 1.65.0）。依赖实际解析为 `croner@11.0.0`、`cronstrue@3.39.0`，package.json 使用兼容版本范围、lockfile 锁定。以下为首版历史结果，后续交互改造见[界面注册验证](tool-ui.md)。

## 范围与用例

- Unit：`src/tools/cron.test.ts` 29 项（CRON-PARSE），覆盖空白规范化、名称映射、OR 描述、20 种非法/不支持语法、5 种配置错误、无匹配日期空列表；时钟固定 `2024-03-01T08:30:00Z`。
- Component：`src/CronWorkspace.test.tsx` 3 项（CRON-UI），覆盖表达式/字段双向同步（含空字段）、编辑与切换取消旧 Worker、错误脱敏、语言切换保留输入并重发请求。
- E2E：`tests/e2e/cron.spec.ts` 4 项（CRON-E01 英中、CRON-E02 UTC/Asia-Shanghai），真实 Worker、375px、无外联、无水平溢出；CRON-E02 用浏览器 Date 独立计算本地午夜 UTC 值。
- 授权：用户在确认范围后授权“先实现一个试试”，包含上述测试；测试先证明缺失行为再实现。本轮未创建测试基线提交或实现提交，工作区保留供 review，不 push。

## 结果

- `pnpm verify` 通过：类型、lint、格式、coverage、构建、Chromium 24/24。
- Unit/Component：11 文件 271/271 通过；coverage statements 96.24%、branches 94.65%、functions 94.44%、lines 96.92%，`src/tools/cron.ts` 97.22/94.44/100/97.05（未覆盖行为错误重抛分支）。
- Chromium：24/24 通过，含 CRON-E01/E02。
- Red：最初 `pnpm exec vitest run src/tools/cron.test.ts` 因工具未注册失败；后续 CRON-UI 因重复表达式输入/缺预设失败，均在实现后转绿。最终 `pnpm verify` 退出码 0；跨浏览器命令退出码 1，仅 Firefox 启动失败。
- WebKit：`pnpm e2e --project=firefox --project=webkit` 中 WebKit 24/24 通过。
- Firefox：24 项均在启动阶段失败，日志为 `Could not find profile folder`，与既有环境限制一致，非本次代码回归；未修复无关环境问题。
- 报告：`test-results/cron-verify.log`、`test-results/cron-other-browsers.log`、`test-results/cron-test-list.log`、`playwright-report/`；窄屏截图见 Playwright 输出 `cron-mobile.png`。

## 人工探测

- agent-browser 0.43.0，CLI 与 Chrome 安装检查成功；独立会话在开发页 `http://127.0.0.1:5173/` 探测：输入 `*/5 9-17 * * 1-5` 后自动预览中文描述与 5 个 GMT+8 后续时间；修改小时字段同步表达式；`60 * * * *` 显示友好错误。会话已关闭；初始探测截图随后被 Playwright 清理。已检查 WebKit 窄屏布局；最终重新执行 verify 后保留的截图位于 `test-results/browser/cron-cron-en-CRON-E01-pars-b6af9-n-locally-in-both-languages-chromium/cron-mobile.png` 及对应中文场景目录。

## 未验证与风险

- Firefox 启动环境未修复；PWA、工作流、AI 等后续工作包未涉及。
- 实时预览按输入防抖 150ms 触发，不承诺后台计时或秒级刷新；DST 语义遵循 Croner。
