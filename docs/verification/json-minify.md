# JSON 压缩与工具切换验证

日期：2026-11-13。基线 `d825626`，测试先行提交 `1480152`；验证对象是测试提交加当前工作区实现，功能未提交或 push，等待 review。范围限定 `json.minify`、两个内置工具切换与双语，不扩展动态插件、通用 Schema 表单或其他工具。

## 实现与测试边界

- 压缩复用已有 JSON 解析、错误映射与零缩进输出，只新增空对象配置校验；不重复实现 JSON 转换。不增加依赖。
- 静态目录两项、UI 按目录显示数量；工具按钮显示选中状态，切换保留输入/清除旧结果和终态。运行中禁止切换，取消后恢复。压缩不显示或提交缩进。
- 执行入口复用非法 JSON 脱敏测试，新增无配置约束及分发，成功转换主要固定向量放在真实浏览器；不为标准库创建独立测试。组件只替换 Worker 平台，验证请求、状态和取消；E2E 使用真实 Worker。

## Red → Green

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| 定向 Red | `pnpm test src/tools/execute-tool.test.ts src/ToolWorkspace.test.tsx src/i18n/App.i18n.test.tsx --reporter=default --reporter=junit --outputFile=test-results/json-minify/red/unit.xml` | exit 1，14 failed / 31 passed；压缩未知工具、无切换及数量为 1，不是导入/基础设施失败 |
| 页面 Red | `pnpm e2e tests/e2e/json-minify.spec.ts --project=chromium --output=test-results/json-minify/red/browser` | exit 1，4 failed；数量不符/无压缩工具按钮 |
| 定向 Green | 上述三个组件/执行测试文件、`pnpm e2e tests/e2e/json-minify.spec.ts --project=chromium` | exit 0，45/45 Unit/Component、4/4 Chromium |
| 最终回归 | `pnpm verify` | exit 0；typecheck/lint/format、70/70 Unit/Component、构建、Chromium 14/14 |
| 全矩阵 | `pnpm e2e` | exit 1；Chromium 14/14、WebKit 14/14；Firefox 14 项启动失败，未进入页面 |

所有运行 retries=0，无跳过/弱化断言。发现测试：`pnpm exec playwright test --list --reporter=list` 为 42 项。Firefox 延续已知 `Could not find profile folder` 启动错误，保留首次证据，不重复运行或修无关环境问题；不能声称发布矩阵全绿。

Node 26.13.0 / pnpm 12.3.4。coverage：statements 98.43%、branches 97.67%、functions 100%、lines 99.16%；新压缩校验与切换分支已覆盖，无新增排除。主 JS 282.38 kB / gzip 89.14 kB，CSS 4.28 / gzip 1.38 kB，Worker 1.38 kB；这是体积记录，不是性能预算结论。

## 实际页面验证与证据

- agent-browser 0.43.0 / Chrome 157.0.8103.78 安装检查成功；独立 `tw-json-minify` 会话访问 `http://127.0.0.1:5173/`。实现前真实格式化确认只有一个工具；实现后格式化 Unicode JSON、切压缩清输出保输入、运行并检查字符串双空格保留、切英中保选择/输出、错误重译与切回格式化清错误；页面 errors 为空。
- 已查看 1440×900 桌面与 375×812 实际截图，375px 无横向溢出；窄屏工具按钮可达，编辑器上下堆叠。探测会话已关闭，原开发服务器保留。键盘与同主线程任务中禁用/取消由正式 Playwright 验证，不以截图代替断言。
- Red：`test-results/json-minify/red/unit.xml`、`unit.log`、`e2e.log`、`browser.xml`、`browser/` 下 trace/截图。
- 最终：`test-results/json-minify/verify.log`、`green-targeted.log`、`discovery.log`、`matrix.log`、`matrix.xml`、`matrix/browser/`；JUnit `test-results/unit/junit.xml` 与 `test-results/browser/junit.xml`，HTML `playwright-report/index.html`；coverage `coverage/coverage-summary.json`。
- 页面：`test-results/json-minify/probe/` 下 `before.txt`、`switch-cleared.txt`、`zh-success.txt`、`en-error.txt`、`zh-error.txt`、`format-cleared.txt`、`en-desktop.png`、`en-mobile.png`、`zh-mobile-error.png`。均为合成文本，无凭据或真实用户数据。

## 限制与停止点

- Firefox 页面行为及远程 CI 未验证；没有新增性能预算、PWA 离线冷启动或持久化承诺。
- JSON 原生数值/重复键语义与格式化一致，不适合必须逐字节保留的输入。
- 测试基线已提交但未 push；实现留工作区 review，不自动提交、push 或进入下个工具。
