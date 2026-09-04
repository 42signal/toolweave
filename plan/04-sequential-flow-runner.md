# 简单串行工具流执行

## 状态

Pending approval

## 目标

支持列表式、简单串行工具流执行，用 URL 解析和 JSON 格式化验证跨工具输入输出。

示例：

```txt
Input URL
→ URL Parse
→ 从上一步 output 取 query.payload
→ JSON Format
→ Output
```

## 实现计划

新增：

```txt
core/flow/types.ts
core/flow/engine.ts
core/flow/path.ts
features/flows/FlowRunnerPage.tsx
features/flows/FlowStepList.tsx
features/flows/FlowResultPanel.tsx
```

Flow 模型：

```ts
export type Flow = {
  id: string;
  name: string;
  steps: FlowStep[];
};

export type FlowStep = {
  id: string;
  toolId: string;
  inputPath?: string;
  params?: Record<string, unknown>;
};
```

执行规则：

1. 第一个 step 使用 flow input。
2. 后续 step 默认使用上一个 step 的 output。
3. 如果设置 `inputPath`，则从上一步 output 按点路径取值。
4. 任一步失败，流程停止并返回失败 step、错误和已完成中间结果。
5. 每一步保留 input、output、error、duration。

## 测试 spec

### Flow Engine

1. 单节点工具流可以执行。
2. 多节点工具流可以串行执行。
3. 后一个节点默认接收前一个 output。
4. `inputPath=query.payload` 可以取出上一步字段。
5. `inputPath` 不存在时返回清晰错误。
6. 任一步失败时工具流停止。
7. 每一步中间结果都被保留。

### 示例验收

输入：

```txt
https://example.com/callback?payload=%7B%22a%22%3A1%7D
```

工具流：

```txt
URL Parse
→ inputPath query.payload
→ JSON Format
```

最终输出：

```json
{
  "a": 1
}
```

## 验证 / 调整测试

手动验证：

- query payload 是合法 JSON。
- query payload 是非法 JSON。
- inputPath 不存在。
- 中途报错。
- 重新运行。

命令：

```bash
pnpm test core/flow
pnpm e2e
pnpm typecheck
pnpm build
```

## 提交

分支：

```txt
feat/sequential-flow-runner
```

提交信息：

```txt
feat: add sequential tool flow runner
```

## 机器 review

- flow engine unit tests
- path resolver tests
- e2e flow execution
- typecheck
- build

## 人工 review checklist

- [ ] 工具流模型足够简单。
- [ ] 支持中间结果查看。
- [ ] 错误定位清晰。
- [ ] inputPath 易理解。
- [ ] 为后续拖拽配置留好接口。
