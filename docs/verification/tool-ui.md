# 工具界面注册与 Cron 交互验证

日期：2026-11-15。工作区基于 `43a5125`，包含此前未提交的 Cron 首版；本轮无 commit / push。环境：Node 26.13.0、pnpm 12.3.4、Playwright 1.65.0。

## 交付范围

- `src/tools/ui.ts`：panels / workspace 互斥、编辑/只读 props、手动/live 策略；`src/tools/ui-registry.ts`：内置工具 UI 接线与默认配置，不混入 JSON manifest。
- `src/ToolHost.tsx`：统一 Worker 执行、防抖、取消、过期结果隔离、错误脱敏、运行状态。Cron Input/Output 不再直接调用执行服务；Diff 使用 workspace 和单字符串 envelope。其余工具沿用标准文本编辑器。
- Cron：大表达式、Copy / Random、光标和字段焦点联动提示、Next / 定时说明 / 后五次执行；保留预设、五字段暂存空值、英中和本地时区。Random 从八条合法样例中选取，可重复。
- 只开放可信内置 React UI，不实现社区/AI 视图加载、沙箱、工作流或通用 Schema 表单。

## 测试与 Red → Green

- 已授权 seam：UI 注册约束/独立回退，真实 App 的宿主执行与 Cron 交互，生产 Worker E2E。复用既有普通工具、Diff、语言与取消用例。
- `pnpm test src/ToolHost.test.tsx` 首次退出 1：宿主模块尚不存在；实现后 2/2 通过，含两侧独立回退、workspace 替代、类型互斥及宿主 run/cancel。
- `pnpm test src/CronWorkspace.test.tsx` 交互扩展首次退出 1：缺少字段联动提示；实现后 5/5 通过，包含防抖、卸载、切换、迟到结果、Copy 原文/失败、随机样例和语言重算。
- E2E 首次暴露剪贴板权限缺失：为 Chromium 测试上下文显式授予剪贴板读写权限，再读取真实剪贴板比对原文。WebKit 暴露 macOS Home 不移动输入光标、按钮默认 Tab 跳过：使用对应系统行首键，并恢复宿主按钮的显式 tabIndex。未放宽断言、跳过用例或增加重试。

## 最终结果

- `pnpm verify`：退出 0，typecheck / lint / prettier / coverage / build / Chromium 全部通过。
- Unit/Component：12 文件，275/275；coverage statements 97.80%、branches 94.87%、functions 97.60%、lines 98.50%，保持原门槛，无新增排除。
- `pnpm e2e --project=chromium --project=webkit`：退出 0，48/48（每浏览器 24），包含真实 Worker、英中、375px、UTC / Asia-Shanghai、Copy / Random / 联动提示；无 mock Worker、无外联或页面错误。
- Firefox 定向启动检查退出 1：`Could not find profile folder`，首条在页面打开前失败，另一条未运行；沿用既有机器限制，未继续重复运行或改环境。
- 生产主 JS 约 304.58 kB、Worker 212.22 kB，均为未压缩体积；未新增性能预算承诺。

## 真实页面探测与证据

- agent-browser 0.43.0；CLI 检查与 Chrome 157.0.8103.78 安装检查成功，使用独立会话 `toolweave-cron-ui-20261115`。
- 实际地址 `http://127.0.0.1:5173/`；启动前页面连接拒绝，随后通过项目 `pnpm dev` 启动。已输入 `*/5 9-17 * * 1-5`，核实中文说明和五次 GMT+8 计划；聚焦小时核实 0–23 / 范围提示；点击 Copy 显示已复制，点击 Random 后真实生成新说明和计划。agent-browser 直接读取剪贴板受读权限限制，实际内容由授权 Chromium E2E 独立验证。
- 已检查桌面/375px 截图；临时探测图 `/tmp/toolweave-cron-desktop.png`、`/tmp/toolweave-cron-mobile.png`；E2E `cron-mobile.png` 位于 `test-results/browser/` 对应双语目录。探测会话在交付前关闭。
- 命令记录：`test-results/ui-registration-verify.log`、`test-results/ui-registration-browsers.log`、`test-results/ui-registration-firefox.log`、`test-results/ui-registration-test-list.log`；coverage HTML 在 `coverage/`，最新 Playwright 报告在 `playwright-report/`。这些是本地产物，不提交。

## 限制

Firefox 未完成页面验收。复制依赖安全上下文和浏览器权限，拒绝时显示手动复制提示；不是离线/PWA 验收。Cron 按编辑后的当前时间快照预览，不执行真实任务或持续倒计时。
