# 拖拽配置工作流与输入输出

## 状态

Pending approval

## 目标

在简单串行工具流基础上，增加可视化拖拽配置能力。

MVP 不做自由画布，只做可排序步骤流：

```txt
可用工具列表
→ 拖入工作流步骤
→ 排序
→ 配置 inputPath
→ 运行
→ 查看每一步输入输出
```

## 技术选型

新增：

- `@dnd-kit/core`
- `@dnd-kit/sortable`

暂不使用：

- React Flow
- 复杂节点画布

## 实现计划

新增：

```txt
features/flows/FlowBuilderPage.tsx
features/flows/ToolPalette.tsx
features/flows/SortableFlowSteps.tsx
features/flows/FlowStepConfig.tsx
features/flows/FlowIOPanel.tsx
core/storage/flow-repository.ts
```

能力：

1. 从工具列表添加 step。
2. 拖拽排序 step。
3. 删除 step。
4. 配置 step 的 `inputPath`。
5. 输入测试数据并运行工具流。
6. 展示每一步 input/output/error。
7. 保存工具流。
8. 加载已保存工具流。

移动端：

- 上方选择工具。
- 下方步骤列表。
- 支持触摸拖拽或移动按钮 fallback。
- 避免软键盘遮挡关键操作。

## 测试 spec

### Unit tests

1. 添加工具到 flow。
2. 删除 step。
3. 调整 step 顺序。
4. 修改 inputPath。
5. 保存 flow。
6. 加载已保存 flow。

### E2E tests

1. 打开 Flow Builder。
2. 添加 URL Parse。
3. 添加 JSON Format。
4. 设置 JSON Format 的 inputPath 为 `query.payload`。
5. 输入测试 URL。
6. 运行工具流。
7. 输出格式化 JSON。
8. 保存工具流。
9. 刷新页面后仍可加载。

### Mobile E2E

1. iPhone viewport 下能添加工具。
2. iPhone viewport 下能调整顺序。
3. inputPath 输入框可用。
4. 输出区可滚动查看。

## 验证 / 调整测试

重点验证：

- 桌面拖拽。
- 移动端触摸拖拽。
- 输入框聚焦。
- 软键盘遮挡。
- 横竖屏。
- 保存 / 加载稳定性。

命令：

```bash
pnpm test features/flows
pnpm e2e
pnpm typecheck
pnpm build
```

## 提交

分支：

```txt
feat/drag-flow-builder
```

提交信息：

```txt
feat: add drag-and-drop sequential flow builder
```

## 机器 review

- unit tests
- e2e tests
- mobile viewport tests
- build size report
- typecheck
- build

## 人工 review checklist

- [ ] 拖拽是否顺滑。
- [ ] 移动端是否可用。
- [ ] inputPath 配置是否明显。
- [ ] 中间输入输出是否容易理解。
- [ ] 保存 / 加载是否稳定。
