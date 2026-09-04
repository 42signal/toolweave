# 项目配置与 PWA 初始化

## 目标

初始化 `github.com/42signal/devtools` 仓库，建立可持续开发的纯 Web/PWA 项目骨架。

本阶段只完成基础工程能力，不实现完整插件运行时。

## 技术选型

采用最新稳定版本：

- Vite
- React
- TypeScript
- UnoCSS
- Zustand
- Dexie.js
- vite-plugin-pwa
- Vitest
- Playwright
- ESLint
- Prettier
- pnpm

同时预留完整 TypeScript 插件体系所需目录：

- plugin SDK
- plugin runtime
- compiler
- worker
- storage

但本阶段不实现 esbuild-wasm 编译细节。

## 实现计划

### 1. 初始化仓库

仓库目标：

```txt
github.com/42signal/devtools
```

初始化方式：

```bash
pnpm create vite devtool --template react-ts
```

### 2. 安装依赖

基础运行依赖：

```bash
pnpm add zustand dexie zod
```

开发依赖：

```bash
pnpm add -D unocss vite-plugin-pwa vitest @testing-library/react @testing-library/jest-dom jsdom playwright eslint prettier
```

样式配置：

- 使用 `unocss/vite` 集成 Vite，在 `uno.config.ts` 中配置 `presetWind3()`。
- 在应用入口引入 `virtual:uno.css`。
- 保留 CSS Variables 用于运行时主题定制。
- 不再直接安装 Tailwind CSS、PostCSS 和 Autoprefixer；UnoCSS 使用 Vite 插件接入。
- 验证基础原子类、响应式样式在开发和生产构建中均生效。

### 3. 配置 PWA

使用：

```txt
vite-plugin-pwa
```

要求：

- 有 `manifest.webmanifest`
- 有应用图标占位
- 支持 App Shell 缓存
- 支持离线打开基础页面
- 不在首屏缓存 esbuild-wasm

### 4. 按需建立目录结构

第一阶段不一次性创建所有未来目录，只创建当前阶段会被真实引用的目录和少量稳定基础目录。

当前阶段必须创建：

```txt
src/
  app/
    App.tsx

  components/
    Button.tsx

  features/
    home/
      HomePage.tsx

  main.tsx
  index.css
  test-setup.ts

public/
  icons/
  manifest.webmanifest

tests/
  e2e/
```

当前阶段暂不创建，等对应阶段实现时再添加：

```txt
src/core/plugin/
src/core/plugin-sdk/
src/core/compiler/
src/core/tool/
src/core/flow/
src/core/storage/
src/core/permissions/
src/core/theme/
src/features/tools/
src/features/flows/
src/features/plugins/
src/features/ai/
src/features/settings/
src/builtins/dev-basic/
src/workers/
```

原则：

- 目录服务于当前代码，不提前堆空目录。
- 后续阶段按需创建对应目录。
- 如果某个目录只是为了表达架构，不在代码中引用，则先写在计划里，不落到仓库中。
- 保持首阶段骨架轻量。

### 5. 配置脚本

`package.json` 需要提供：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

### 6. 配置 GitHub Actions

CI 至少运行：

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

## 测试 spec

### Unit tests

1. App 可以正常渲染。
2. 首页可以显示应用名称。
3. 基础 Button 组件可以渲染。
4. PWA 配置文件存在。

### E2E tests

1. 打开首页。
2. 页面标题包含 `DevTool`。
3. 页面可见基础欢迎内容。
4. `manifest.webmanifest` 可以访问。

### Build checks

1. `pnpm lint` 通过。
2. `pnpm typecheck` 通过。
3. `pnpm test` 通过。
4. `pnpm build` 通过。
5. `pnpm e2e` 通过。

## 实现

Approve 后执行。

## 验证 / 调整测试

本地验证命令：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

如失败：

1. 优先修复实现问题。
2. 如果测试 spec 与实现目标不一致，调整测试。
3. 保持测试覆盖本阶段目标。

## 提交

分支：

```txt
chore/init-project-pwa
```

提交信息：

```txt
chore: initialize devtool pwa project
```

## 机器 review

GitHub Actions 必须通过：

- lint
- typecheck
- unit tests
- build
- e2e tests

建议启用：

- CodeQL
- Dependabot

## 人工 review checklist

- [ ] 项目能本地启动。
- [ ] 技术栈符合简化方案。
- [ ] PWA 已接入。
- [ ] CI 脚本完整。
- [ ] 目录结构为后续 TS 插件系统预留空间。
- [ ] 首屏没有引入重型编译器依赖。
