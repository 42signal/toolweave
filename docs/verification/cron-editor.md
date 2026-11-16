# Cron 自定义编辑器与六段支持

2026-11-15，基于 `43a5125` 的未提交工作区（包含此前 Cron/UI 注册改造）。Node 26.13.0、pnpm 12.3.4、Playwright 1.65.0；无新依赖，无 commit / push。

## 范围

- 删除普通表达式 input 和下方重复字段输入框，改为 `CronExpressionEditor`：唯一纯文本 contenteditable、原生选区、字段高亮、字段名选择、Tab / Shift+Tab 相邻选择与首尾放行、纯文本粘贴与部分替换。
- 说明统一为联动 list：字段/范围、示例、当前语法、其余语法。Copy / Random / 预设 / 双语 / Worker 取消能力保留。
- 自动识别五段及秒在首位的六段；UI 切换增加秒 0 或移除秒。六段解析返回 `fields.second`，日期/星期 OR 描述保留秒，后续五次执行精确到秒；不扩展 Quartz / 七段 / 真实调度。

## Red → Green

- 已获用户明确授权：公开 executeTool 的六段解析、真实 App 编辑器交互、生产 Worker E2E；测试先于对应实现，不创建测试提交。
- `pnpm test src/tools/cron.test.ts` 初次退出 1：六段每十秒固定向量被旧五段约束拒绝；实现后 35/35 通过。秒上限、步长零、非法名称、分/时偏移、七段/Quartz 拒绝，五段兼容继续覆盖。
- `pnpm test src/CronWorkspace.test.tsx` 初次 6 项失败：旧 input 不支持新内容编辑事件、选区说明 list 和六段切换。实现后 7/7 通过；复用原取消/过期响应/语言测试，新增整段与部分粘贴、HTML 按文本、IME/Enter、Tab 首尾退出。
- 收尾测试复现空六段编辑器切回五段只有四段，定向命令退出 1；修正空表达式切换的默认字段数量后同用例及全量转绿。

## 最终验证

- `pnpm verify` 退出 0：typecheck、lint、prettier、coverage、build、Chromium 26/26。
- Unit/Component：12 文件 283/283；statements 97.38%、branches 94.65%、functions 97.82%、lines 98.30%，未改变原门槛或排除。
- `pnpm e2e --project=chromium --project=webkit` 退出 0：52/52，每浏览器 26；Cron 定向 12 项、其他工具回归 40 项，未重试/跳过。英中 375px、五段原向量、六段真实 Worker、秒级 10000ms 间隔、错误恢复、段数切换、Copy / Random、键盘焦点均覆盖。
- Firefox `CRON-E03 --max-failures=1` 退出 1：首条启动前报 `Could not find profile folder`，另一条未执行；已保留独立 trace，不反复重试或修复无关环境。
- 主 JS 约 307.09 kB、Worker 212.42 kB（未压缩）；未新增性能预算承诺。

## 浏览器探测与产物

- agent-browser 0.43.0，CLI / Chrome 157.0.8103.78 安装检查成功。独立会话 `toolweave-cron-segments-20261115`，真实开发页 `http://127.0.0.1:5173/`。
- 修改前输入六段核实旧字段错位、时间没有秒；修改后输入 `*/10 * * * * *` 自动六段，点击秒、Tab 选择分钟、输入 */5 后形成 `*/10 */5 * * * *`，说明与字段高亮同步，真实输出含秒级计划。再次直接选择秒并替换 */15；桌面/375px 截图已检查，页面错误列表为空；会话已关闭。
- Chromium E2E 使用实际剪贴板 + Meta+V；WebKit 使用携带 DataTransfer 的 paste 事件验证粘贴处理，不声称其系统剪贴板读取已验证。Worker、调度解析与时间均未 mock；只有单元测试固定时钟/平台替身。
- 记录：`test-results/cron-seconds-red.log`、`cron-editor-red.log`、`cron-editor-empty-mode-red.log`、`cron-segments-verify.log`、`cron-segments-browsers.log`、`cron-segments-firefox.log`、`cron-segments-test-list.log`（均在 test-results 下）。
- 报告：`coverage/`、`playwright-report/`；E2E 双语五/六段截图在 `test-results/browser/` 的 `cron-mobile.png` / `cron-six-fields-mobile.png`，Firefox trace 在 `test-results/cron-segments-firefox/`；探测图 `/tmp/toolweave-cron-segments-{desktop,mobile}.png`。均为本地产物，不提交。

## 未验证

Firefox 页面验收受启动环境阻塞；未做真实手机/IME 手工验收（组合输入处理由组件测试覆盖）。Cron 是编辑时快照，不持续倒计时或真正执行任务；PWA、社区/AI 插件不在范围。

## 2026-11-16 字符准入与提交交付

用户 review 后明确授权：不支持的字符不能进入编辑器；非法粘贴整次拒绝、不静默清洗，保留选择；数字/运算符、月/星期缩写及未完成片段可编辑，删除放行。数值越界仍交解析器提示。全部实现及测试按「工具约定」「Cron 工具」两个独立提交推送，不另建测试提交。

- Red：`pnpm test src/CronWorkspace.test.tsx` 退出 1，2 失败 / 6 通过，证明 HTML 粘贴和非法键入未拦截。新增准入并复用编辑器测试后 8/8 通过；宿主测试补足独立 live 生命周期 3/3。
- `pnpm verify` 退出 0：typecheck、lint、format、coverage、build、Chromium 26/26；Unit/Component 12 文件 285/285。Coverage statements 95.36%、branches 93.14%、functions 97.24%、lines 96.52%，未调整门槛或排除。
- `pnpm e2e --project=chromium --project=webkit` 退出 0，52/52（各 26）；E03 双语实际拒绝 `@?#+`、中文插入及混合非法粘贴，选区仍能继续替换；逐字输入 jul / WED 后真实 Worker 给出星期三说明。原五/六段、375px、Copy/Random 与时间向量继续通过，无重试/跳过。
- Firefox 定向 E03 退出 1：`Could not find profile folder`，页面打开前 1 失败、1 未执行；不视为页面测试通过，未修复无关环境。
- agent-browser 0.43.0，Chrome 157.0.8103.78 安装检查成功。独立会话在 `http://127.0.0.1:5173/` 复现 `@` 进入表达式；更新后通过预设恢复合法文本，再键入 `@?#+中文`，表达式保持不变；选择月份逐字输入 jul，结果为 `* * * jul *`。会话已关闭。
- 本轮日志 `/tmp/cron-character-red.log`、`/tmp/cron-character-green.log`、`/tmp/cron-delivery-{verify,browsers,firefox,test-list}.log`；Firefox trace 在 `test-results/cron-delivery-firefox/`。历史记录及限制仍适用。
- 工具约定的独立 12 工具暂存快照另见[宿主验证](tool-host.md)；Cron 提交在此基础上增加工具、依赖、双语、编辑器、测试和文档。
- 拆分完成并同步文档后再次执行 `pnpm verify` 退出 0（285 Unit/Component、Chromium 26）；最终日志 `/tmp/cron-delivery-final-verify.log`。仅新增两个功能提交，不重写既有历史，不创建分支或 worktree。
