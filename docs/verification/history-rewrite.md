# 通用命名与提交整理

## 范围与授权

- 用户确认工具 ID 为 `format` / `minify`，界面标题为 Format / Minify、格式化 / 压缩，已有测试同步改名；不扩展格式或新增行为。源码入口同步为 `src/tools/format.ts` / `src/tools/minify.ts`。
- 用户指定从 `cc0f879f37686e34fa410e3395ab51fcf532bab7`（含）开始整理，保留父提交 `0d9dad94efa4b315850f05e0396e938319bdd725`。实现与对应测试归入同一功能提交，国际化独立，通用基础设施和汇总文档单列。
- 只重写本地历史，不 push 或改远程引用。旧提交保存在 `refs/backup/toolweave-before-rewrite-20261113`，重命名后完整快照保存在 `refs/backup/toolweave-renamed-snapshot-20261113`。旧验证报告中的提交号、当时状态是历史证据，不作为重写后提交号。

## 重命名验证

- `pnpm verify` exit 0：typecheck/lint/format、239/239 Unit/Component、构建、Chromium 20/20。
- `pnpm e2e --project=chromium --project=webkit` exit 0：40/40，无 skip/retry；Firefox 沿用既有 `Could not find profile folder` 限制，本次纯命名变更未重复尝试启动。
- coverage：statements 96.05%、branches 95.14%、functions 94.18%、lines 96.90%，无新排除。
- agent-browser 0.43.0，Chrome 157.0.8103.78 安装检查成功。独立 `tw-rename-tools` 会话实际访问 `http://127.0.0.1:5173/`，改名前后分别运行 YAML `x: 1` 的格式化及压缩，结果为两空格 JSON 与紧凑 JSON；改名后快照确认“格式化”“压缩”。会话已关闭，开发服务保留。
- `src` 和 `tests/e2e` 可执行 TS/TSX 中已无旧 ID/标题/符号；历史 Markdown 与验收文件名保留以维护证据链接。

## 整理约束

共整理为 15 个提交：工程基础、i18n、12 个工具各自实现与测试、汇总文档。全部候选提交逐一通过 `pnpm verify`（类型、lint、格式、coverage、构建及各阶段已有 Chromium E2E），最终 239 项 Unit/Component、Chromium 20 项通过。逐提交检查使用 `git archive` 导出至本次独占的忽略目录，不创建分支/worktree、不操作开发服务。

组合 E2E 随对应工具逐步补入，参数化向量/共享测试保持最终原有断言，不放宽预期；i18n 提交先覆盖语言选择、跟随/手动、刷新和 html.lang，工具状态保留随首个工具接线加入。汇总文档提交只包含 Markdown，没有补漏的功能实现或测试。

最终候选树与重命名后快照一致；旧 `561dbeb` 至快照的改动仅为通用命名及其文档。完整逐提交检查记录保存在本地忽略目录 `test-results/history-rewrite/checks-0-14-verify.json` 及 `stage-*-verify.log`；新增本段验证记录仅调整最后的文档提交，不改已验工具提交。

未新增工具行为、智能 Diff、持久化、PWA、AI 或格式扩展；未推送重写历史。远程后续同步需要明确确认，不能普通 fast-forward。
