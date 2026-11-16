# Toolweave AI

Web-first、local-first 的开发者工具箱。已有 13 个内置工具，均在本地 Web Worker 执行，支持取消、错误恢复、耗时与英中界面。切换工具保留输入、清除旧输出/错误/耗时，手动运行中禁止切换，Cron 实时预览允许编辑/切换并取消旧任务；输入与结果不上传、不持久化。工作流、PWA、主题切换及 AI 尚未实现。

| 工具                    | 规则                                                                             |
| ----------------------- | -------------------------------------------------------------------------------- |
| 格式化 / 压缩           | 通用 `format` / `minify`，当前支持 JSON/YAML；压缩输出紧凑 JSON                  |
| Base64 编码 / 解码      | UTF-8、严格标准 Base64，支持空字符串；不接受缺失填充、空白或 Base64URL           |
| URL 编码 / 解码         | URI component 语义，解码时 `+` 保持不变                                          |
| JWT 解码                | 显示 header / payload；不验证签名或有效期                                        |
| UUID                    | 安全随机 UUID v4，忽略输入                                                       |
| Unix 时间转换           | 自动识别秒/毫秒/纳秒及常见日期；独立输入/输出格式，空输入取当前时间              |
| URL → JSON / JSON → URL | 绝对 HTTP/HTTPS，无凭据；query 单值字符串、重复值数组，兼容旧数组输入            |
| Diff                    | 双输入 JSON/YAML 结构化比较（JSON Patch），否则 unified 文本 Diff                |
| Cron                    | 自定义编辑器、五/六段自动识别、联动说明列表、Copy/Random，双语解释与秒级执行预览 |

URL JSON 使用 `{ "protocol": "https:", "host": "example.com:8080", "pathname": "/search", "query": { "q": "hello world", "tag": ["a", "b"] }, "hash": "#results" }`。只转换文本，不访问网址；query 自动编码，空格用 `+`，对象不保留不同键交错顺序，旧二元组数组仍可生成 URL。完整行为见[工具协议](docs/contracts.md#本批已确认时间结构化数据与-diff)。

结构化工具只处理 JSON 兼容数据，不保证无损保留大整数、重复 JSON 键、YAML 注释或原始排版。时间用 BigInt 保留纳秒精度；自动单位仅按量级猜测（绝对值 ≥1e17 为 ns，≥1e11 为 ms，其余 s），历史/远期时间请手动选单位。无时区日期使用浏览器本地时区，ISO 输出 UTC；不猜歧义的日/月顺序。

## 界面语言

默认/兜底英文；按浏览器 `navigator.languages` 顺序选择首个支持语言，`en-*` 使用英文，`zh-*` 统一使用简体中文。右上角可选择跟随浏览器 / English / 简体中文，仅当前页面生效，刷新恢复跟随。自动模式响应浏览器 `languagechange`；手动模式不被浏览器变更覆盖，选回跟随立即采用最新偏好。切换同步 `html.lang`，不清空输入/配置/输出或中断任务。不保存语言偏好，不提供繁体翻译。

使用 i18next + react-i18next，英中词典位于 `src/i18n/locales/`，随应用打包、不请求远程资源；新增文案先加英文键并补齐同类型中文词典。内置工具以稳定 ID 查翻译，用户输入不翻译；Worker 保留英文诊断，UI 按错误码显示友好提示，不展示错误码或底层诊断。验收与限制见 [国际化验证记录](docs/verification/i18n.md)。

## 开发

使用 `.node-version` 中的 Node 和 `package.json` 中固定的 pnpm 版本：

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium firefox webkit
pnpm dev
```

Linux/CI 安装浏览器时使用 `pnpm exec playwright install --with-deps chromium firefox webkit`。

## 验证

```bash
pnpm verify
pnpm verify:release
```

`verify` 包含类型、lint、格式、组件测试/coverage、生产构建和 Chromium；`verify:release` 同时运行 Firefox/WebKit，不发布。`pnpm e2e` 总是先构建当前代码，Playwright 自行启动/关闭本地静态服务，端口 4173 被占用时明确失败。

定向测试：

```bash
pnpm test -t '\[APP-00\]'
pnpm e2e --project=chromium --grep '\[E-00\]'
```

零匹配、失败和 focused/skipped 测试不作为通过。报告见 `test-results/`、`coverage/` 和 `playwright-report/`，均不提交；CI 保留 7 天。仅使用合成数据，不向真实 AI 发请求。

本机最新验证与 Firefox 启动限制见 [Cron 编辑器验证记录](docs/verification/cron-editor.md)，历史记录见 [Cron 首版](docs/verification/cron.md)、[结构化工具](docs/verification/data-tools.md)、[整批工具](docs/verification/builtin-tools.md)、[JSON 格式化](docs/verification/json-format.md)与[压缩](docs/verification/json-minify.md)；发布矩阵尚未全绿，CI 配置尚未远程运行。

## 文档

- [实施计划](docs/implementation-plan.md)
- [统一协议](docs/contracts.md)
- [测试与验证](docs/testing-plan.md)
- [E-00 场景](tests/e2e/spec.md)
