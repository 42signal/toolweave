# 11 个内置工具整批验证

日期：2026-11-13。测试基线 `f2a6170`（父提交为压缩测试 `1480152`），实际验证对象是该提交加工作区实现；JSON 压缩及本次全部工具实现均未提交/push，等待 review。没有创建 PR 或部署。

## 范围与边界

- 原定 9 项加 URL → JSON / JSON → URL，共 11 项，静态目录与本地 Worker 接线；未增加依赖、外部插件或通用 Schema 表单。
- 新增严格 UTF-8/Base64、URI component、JWT 三段结构组合与未验签提示、安全随机 UUID v4、时间四模式和日历校验、HTTP/HTTPS 五字段 URL JSON。query 二元组保序保留重复；输入 URL 不被访问。
- 所有工具使用相应的英中输入/输出标签、placeholder、友好错误及配置；切换保留输入/清旧结果，运行禁切换，语言变化保留选中工具和任务。复用原 Worker 生命周期/取消回归。
- Unit 经 `executeTool` 测自有校验/组合，不独立测试标准库。组件只替换浏览器 Worker 边界；生产 E2E 不 mock Worker。URL component 与 UUID 的成功接线主要由 E2E 验证，UUID 不断言固定值或两次不同。

## Red → Green

| 阶段 | 命令 | 实际结果 |
| --- | --- | --- |
| 定向 Red | `pnpm test src/tools/builtin-tools.test.ts src/ToolWorkspace.test.tsx src/i18n/App.i18n.test.tsx --reporter=default --reporter=junit --outputFile=test-results/builtin-tools/red/unit.xml` | exit 1；91 failed / 10 passed，新工具为 UNKNOWN_TOOL、缺少时间配置/标签、工具数量仍为2 |
| 页面 Red | `pnpm e2e tests/e2e/builtin-tools.spec.ts --project=chromium --output=test-results/builtin-tools/red/browser` | exit 1；4 failed，数量不符或新工具按钮缺失。类型与 lint 问题已修正后才计行为 Red |
| 逻辑 Green | `pnpm test src/tools/builtin-tools.test.ts` | exit 0，87/87 |
| 全 Unit Green | `pnpm test` | exit 0，159/159 |
| 定向 E2E Green | `pnpm e2e tests/e2e/builtin-tools.spec.ts --project=chromium` | exit 0，4/4（英中各全工具、错误恢复、URL 结构切换） |
| 最终回归 | `pnpm verify` | exit 0；typecheck/lint/format、159/159 Unit/Component、生产构建、Chromium 18/18 |
| 全矩阵 | `pnpm e2e` | exit 1；Chromium 18/18、WebKit 18/18，Firefox 18 项启动失败，未打开页面 |
| 最终双浏览器 | `pnpm e2e --project=chromium --project=webkit` | exit 0，36/36；包含后续精度修正与词典清理 |

测试发现 `pnpm exec playwright test --list --reporter=list` 为 54 项。全部 retries=0，无跳过。Firefox 仍为既有 `Could not find profile folder` 启动错误；未修无关环境或反复重跑，不声称三浏览器全绿。远程 CI 未执行。

Node 26.13.0、pnpm 12.3.4。最终 coverage：statements 97.85%、branches 94.57%、functions 97.91%、lines 99.07%，无新增排除项。主 JS 290.95 kB / gzip 91.35 kB，CSS 4.41 / gzip 1.41 kB，Worker 5.99 kB。仅为构建体积记录，不是性能预算结论。

### 十进制时间精度补查

实现自查发现 `4470084885989.317 * 1000` 的浮点结果会偏 1ms。先用未提交临时用例复现：期望 `+143621-05-08T14:06:29.317Z`，实际 `.318Z`，exit 1；改为 BigInt 十进制拆分计算，ISO → 秒也按整数毫秒组装输出。最终临时 3/3 通过（正负大值与 ISO 反向），再完整回归。临时测试只位于忽略目录，没有擅自增加正式测试或将其混入提交。

## 页面与视觉核实

agent-browser 0.43.0 / Chrome 157.0.8103.78 安装检查成功，独立 `tw-builtin-tools` 会话访问 `http://127.0.0.1:5173/`：

- 实现前真实格式化/压缩和切换，只有两工具；保存基线快照。
- 实现后核实 11 按钮和动态 label，解析 `https://example.com:8080/search?q=hello+world&tag=a&tag=b#results`，输出五字段与重复 query；输入固定 JSON 构造 URL，输出自动编码。
- Base64 实际成功后改非法输入，显示英文错误，切中文重译为标准 Base64/UTF-8 提示，没有技术错误码。
- ISO `1970-01-01T08:00:00+08:00` 按 ISO → 毫秒运行得到 0；JWT 未验签提示可见。
- 已查看 1440×900 和 375×812 截图，英中工具按钮可达，窄屏 scrollWidth=375，无横向溢出；页面 errors 为空。窄屏长列表需要滚动，未扩展为搜索/分类侧栏。会话已关闭，原开发服务器保留。

## 产物与复跑

- Spec：`tests/e2e/builtin-tools.md`；正式测试：`src/tools/builtin-tools.test.ts`、现有 App/工作区组件及 `tests/e2e/builtin-tools.spec.ts`。
- 初始 Red：`test-results/builtin-tools/red/unit.xml`、`unit.log`、`e2e.log`、`browser.xml`、`red/browser/` 中 trace/截图。
- 最终日志：`test-results/builtin-tools/verify.log`、`final-browsers.log`、`discovery.log`；全矩阵失败保留 `matrix.log` / `matrix.xml`（其中 Firefox 启动日志）；最终测试报告在 `test-results/unit/junit.xml`、`test-results/browser/junit.xml` 和 `playwright-report/index.html`。
- Coverage：`coverage/coverage-summary.json`、`coverage/index.html`。精度临时用例/配置和 Red/Green 日志在 `test-results/builtin-tools/`。
- 页面证据：`test-results/builtin-tools/probe/` 下 `before.txt`、`parsed.txt`、`built.txt`、`time.txt`、`en-url-desktop.png`、`en-url-mobile.png`、`zh-base64-error.png`、`zh-time-mobile.png`、`zh-jwt-mobile.png`。
- 均为本地合成文本，不使用账号、真实 JWT/凭据、生产数据或真实 AI；截图/trace/日志不提交。

## 限制与停止点

JWT 不验签或检查有效期；Base64 不兼容宽松/URL-safe 输入。URL 仅 HTTP/HTTPS 且无凭据，遵循 WHATWG 规范化，不保证原始字节一致；query 内 `+` 是空格，而 URL 解码工具中 `+` 保持不变。JSON 原生数值/重复键限制沿用，时间单位不推断。

没有 PWA 离线冷启动、工作流、AI、持久化、主题或新增性能承诺。测试基线已提交但未 push；保留之前未提交压缩实现，整批功能留工作区，停止等待 review。
