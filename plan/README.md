# DevTool 实施计划

目标：构建纯 Web/PWA 的开发者工具平台，先用两个工具验证完整链路：

- URL 解析
- JSON 格式化

固定阶段流程：

1. 明确实现计划
2. 编写测试 spec
3. 实现
4. 验证 / 调整测试
5. 提交
6. 机器 review
7. 人工 review

执行规则：

- `plan/` 下每个阶段一个文件，文件名前缀表示执行顺序。
- 每个阶段必须先完成人工 approve，才能开始实现。
- approve 后按该阶段文件中的流程执行。
- 每个阶段建议独立分支、独立 PR、独立 review。

阶段列表：

1. `01-project-setup-pwa.md`
2. `02-ts-plugin-runtime.md`
3. `03-standalone-tool-runner.md`
4. `04-sequential-flow-runner.md`
5. `05-drag-flow-builder.md`
6. `06-ai-ts-plugin-builder.md`
7. `07-custom-theme.md`
