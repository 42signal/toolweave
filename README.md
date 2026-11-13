# Toolweave AI

Web-first、local-first 的开发者工具箱。当前完成 PR-01 工程基础：最小应用壳、测试、检查脚本和 CI；工具、工作流、PWA、AI 尚未实现。

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

本机 Chromium/WebKit 已通过；Firefox 启动报 profile 错误，发布矩阵尚未全绿。详情见 [PR-01 验证记录](docs/verification/pr-01.md)，CI 配置尚未远程运行。

## 文档

- [实施计划](docs/implementation-plan.md)
- [统一协议](docs/contracts.md)
- [测试与验证](docs/testing-plan.md)
- [E-00 场景](tests/e2e/spec.md)
