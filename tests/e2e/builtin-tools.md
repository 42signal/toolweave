# 整批内置工具验收

已授权：原定 9 项加 URL → JSON / JSON → URL 共 11 项；行为见[协议](../../docs/contracts.md#整批内置工具已确认行为)。先提交测试，再逐组实现，全部验证后停在 review；不引入工作流、PWA、AI 或持久化。公共要求见[测试计划](../../docs/testing-plan.md)。

匿名本地页面，只有合成文本输入、语言/配置切换、Worker 执行与取消；不访问输入 URL、不上传数据。每例独立浏览器 context，结束关闭。

- ALL-E01：en-US / zh-CN 各一例，375px 下通过按钮选择全部 11 工具；固定向量、动态标签和标题正确，JWT 显示未验签，UUID 符合 v4 结构，时间四模式均接线。Worker 为真实同 origin；页面无异常/外联/非 GET，布局不溢出。JSON 已有细分向量继续复用原测试。
- ALL-E02：英文界面按工具验证 Base64、URL 解码、JWT、时间、URL 解析/构造错误；友好提示不含错误码或原始哨兵，修改后能恢复；Base64/URL 空字符串为成功空输出，而非失败。时间无时区拒绝由 BT-04 覆盖。
- ALL-E03：URL parse 得到五字段 JSON，query 保留重复键/顺序/空值；将固定 JSON 输入 build 得到编码后的 URL，切换保留输入/清输出；语言切换保留选中工具和结果；不请求输入 URL。

Unit：BT-02 UTF-8/规范 Base64，BT-03 JWT 结构组合，BT-04 时间模式/日历/范围，BT-06 URL 结构/参数/校验，CT-03 额外配置拒绝；通过 `executeTool` 公开入口。URL component 与 UUID 纯平台接线不单测，放真实 E2E。组件复用现有生命周期，增加时间配置和空成功结果；数量断言调整为 11，不弱化其余回归。

探测基线：agent-browser 0.43.0、Chrome 157.0.8103.78 安装成功；独立会话访问 `http://127.0.0.1:5173/`，实际格式化后切压缩，确认输入保留/输出清除，再运行成功。快照只有两工具，证据 `test-results/builtin-tools/probe/before.txt`；新工具与标签按确认方案定义，实现后核实。正式测试 `builtin-tools.spec.ts` 用 role/name 与 label/alert/status；不使用快照临时 ref。

实现后独立会话已核实 11 个工具按钮、动态标签和提示：URL 解析有序重复参数，JSON 拼接自动编码；Base64 成功后错误，再中英文切换重译；ISO +08:00 转毫秒为 0；JWT 未验签提示可见。实看 1440×900 / 375×812 截图，窄屏 scrollWidth=375，页面 errors 为空。探测会话已关闭；正式完整矩阵、Firefox 环境限制及产物见[验证记录](../../docs/verification/builtin-tools.md)。
