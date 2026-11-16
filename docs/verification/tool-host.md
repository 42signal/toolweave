# 工具界面约定独立交付

2026-11-16，基于 `43a5125`。按用户确认拆为工具约定与 Cron 两个提交；本提交仅包含通用宿主和现有 12 个工具迁移，不依赖 Cron 代码、依赖或语言键。

- `ToolUI`：panels 的 Input / Output 可独立回退，workspace 互斥；manifest 不保存组件。
- `ToolHost`：统一手动/live 执行、防抖、取消、错误和旧响应隔离；通用控件与 Diff workspace 从旧工具页抽出，不改变 Worker 协议。
- UI-REG / UI-HOST 直接验证面板回退、类型约束、run/cancel、150ms 防抖、编辑和卸载取消、旧响应不覆盖。普通工具、Diff、双语与真实 Worker 复用原回归。
- 已有宿主 Red → Green 历史：新增模块前定向测试因模块不存在退出 1，旧实现完成后转绿。拆分后的完整暂存快照单独导出验证，不仅检查最终叠加工作区。

## 独立快照结果

- 将完整暂存 tree 导出到 `/tmp/toolweave-ui-validation-20261116`，不创建分支或 worktree；复用本机已安装依赖，使用快照自身的 package、源码、测试与配置。
- `pnpm verify` 退出 0：类型、lint、格式、coverage、生产构建及 Chromium 20/20；`pnpm e2e --project=webkit` 退出 0，20/20。Unit/Component 10 文件 242/242。
- Coverage statements 97.87%、branches 95.05%、functions 98.00%、lines 98.72%；门槛未调整，无新增排除。
- agent-browser 0.43.0 / Chrome 157.0.8103.78，独立会话在开发页操作 Diff：输入 `{"count":1}` / `{"count":2}`，运行后返回 replace `/count` 为 2，会话已关闭。该探测是最终叠加工作区；独立 12 工具页面由上面的 Playwright 快照回归验收，不混淆两者。
- 日志 `/tmp/tool-ui-standalone-verify.log`、`/tmp/tool-ui-standalone-webkit.log`；快照内 `coverage/`、`test-results/` 和 `playwright-report/` 是本地产物，不提交。

Firefox 既有启动环境限制不视为通过。不开放社区/AI 宿主视图或通用 Schema 表单。
