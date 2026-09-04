# 03. 主界面单工具执行

## 状态

Pending approval

## 目标

用户可以在主界面发现、打开并单独执行已加载工具。

本阶段只验证两个工具：

- URL 解析
- JSON 格式化

主流程：

```txt
进入首页
→ 查看工具分类
→ 选择工具
→ 输入内容
→ 执行
→ 查看输出或错误
→ 复制结果
```

## 页面设计

### 首页

内容：

- 应用标题
- 工具搜索框
- 工具分类列表
- 工具卡片

分类：

```txt
URL
  - URL Parse

JSON
  - JSON Format
```

### 工具执行页

内容：

- 工具名称
- 工具描述
- 分类
- 权限提示
- 输入区
- 执行按钮
- 输出区
- 错误提示
- 复制按钮

### 移动端要求

- 输入区和输出区上下排列。
- 操作按钮足够大。
- 输入框聚焦不遮挡主要按钮。
- 页面不依赖 hover。

## 实现计划

新增模块：

```txt
features/home/HomePage.tsx
features/tools/ToolList.tsx
features/tools/ToolCard.tsx
features/tools/ToolRunnerPage.tsx
features/tools/ToolInput.tsx
features/tools/ToolOutput.tsx
features/tools/PermissionNotice.tsx
features/tools/CopyButton.tsx
stores/plugin-store.ts
stores/tool-store.ts
```

实现内容：

1. 应用启动时加载内置插件 registry。
2. 将工具按 category 分组。
3. 首页展示工具分类与工具卡片。
4. 点击工具进入执行页。
5. 工具执行页调用 tool runner。
6. 输出 JSON 时格式化展示。
7. 错误时展示清晰错误。
8. 复制输出到剪贴板。
9. 有权限需求时展示权限提醒。

## 测试 spec

### Unit tests

1. `ToolList` 能渲染已加载工具。
2. 工具能按 category 分组。
3. 搜索关键词可以过滤工具。
4. `ToolRunnerPage` 可以接收用户输入。
5. 执行成功后展示 output。
6. 执行失败后展示 error。
7. 权限提示可以渲染。
8. JSON 输出会格式化展示。

### E2E tests

1. 打开首页能看到 `URL Parse` 和 `JSON Format`。
2. 点击 `JSON Format`。
3. 输入 `{"a":1}`。
4. 点击执行。
5. 页面展示格式化结果。
6. 返回首页或切换工具。
7. 点击 `URL Parse`。
8. 输入 `https://example.com/a?x=1#hash`。
9. 点击执行。
10. 页面展示 `hostname: example.com` 和 query `x: 1`。

### Mobile E2E

1. 使用 iPhone viewport 打开首页。
2. 工具卡片可点击。
3. 输入区可编辑。
4. 执行按钮可见且可点击。
5. 输出区可滚动查看。

## 验证 / 调整测试

手动验证：

- 桌面宽屏。
- 移动端窄屏。
- 空输入。
- 非法 URL。
- 非法 JSON。
- 超长 JSON。
- 复制输出。

命令：

```bash
pnpm test features/tools
pnpm e2e
pnpm typecheck
pnpm build
```

## 提交

分支：

```txt
feat/standalone-tool-runner
```

提交信息：

```txt
feat: add standalone tool runner interface
```

## 机器 review

必须检查：

- unit tests
- e2e tests
- mobile viewport tests
- typecheck
- build
- accessibility smoke check

## 人工 review checklist

- [ ] 工具是否容易找到。
- [ ] 工具分类是否清晰。
- [ ] 移动端是否可用。
- [ ] 错误信息是否清楚。
- [ ] 权限提示是否明确但不打扰。
- [ ] URL 解析输出是否结构化。
- [ ] JSON 格式化输出是否便于复制。
