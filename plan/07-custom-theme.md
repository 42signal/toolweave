# 07. 自定义样式与主题系统

## 状态

Pending approval

## 目标

支持用户自定义界面样式，并支持导入 / 导出。

MVP 不直接让 AI 任意修改全部 CSS 文件，先实现 token 化主题系统，为后续 AI 调整全部样式打基础。

支持：

- 颜色
- 圆角
- 字体
- 间距密度
- 暗色 / 亮色
- 导入主题 JSON
- 导出主题 JSON
- AI 生成主题 JSON

## Theme 数据结构

```ts
export type Theme = {
  id: string;
  name: string;
  tokens: {
    background: string;
    foreground: string;
    surface: string;
    surfaceHover: string;
    border: string;
    primary: string;
    primaryForeground: string;
    danger: string;
    radius: string;
    fontFamily: string;
    density: "compact" | "comfortable" | "spacious";
  };
};
```

## CSS Variables

```css
:root {
  --color-background: #ffffff;
  --color-foreground: #111111;
  --color-surface: #f6f6f6;
  --color-surface-hover: #eeeeee;
  --color-border: #e5e5e5;
  --color-primary: #2563eb;
  --color-primary-foreground: #ffffff;
  --color-danger: #dc2626;
  --radius: 12px;
  --font-family: system-ui;
  --density-scale: 1;
}
```

## 页面设计

入口：

```txt
Settings → Theme
```

功能：

- 颜色选择。
- 圆角输入。
- 字体输入。
- 密度选择。
- 实时预览。
- 恢复默认主题。
- 导出 JSON。
- 导入 JSON。
- AI 生成主题。

## 实现计划

新增：

```txt
core/theme/types.ts
core/theme/default-theme.ts
core/theme/apply-theme.ts
core/theme/validate-theme.ts
core/storage/theme-repository.ts
features/settings/ThemeSettingsPage.tsx
features/settings/ThemeImportExport.tsx
features/settings/ThemePreview.tsx
features/ai/AiThemeBuilder.tsx
```

流程：

```txt
load theme from IndexedDB
→ validate theme
→ apply CSS variables to document root
→ live preview on change
→ save theme
→ PWA restart restores theme
```

## AI 主题输出格式

```json
{
  "type": "theme",
  "theme": {
    "id": "linear-dark",
    "name": "Linear Dark",
    "tokens": {
      "background": "#09090b",
      "foreground": "#fafafa",
      "surface": "#18181b",
      "surfaceHover": "#27272a",
      "border": "#27272a",
      "primary": "#8b5cf6",
      "primaryForeground": "#ffffff",
      "danger": "#ef4444",
      "radius": "12px",
      "fontFamily": "Inter, system-ui, sans-serif",
      "density": "comfortable"
    }
  }
}
```

## 测试 spec

### Unit tests

1. theme token 可以转换为 CSS variables。
2. 切换主题后 document root 变量更新。
3. 非法颜色值应被拒绝。
4. 非法 radius 应被拒绝。
5. 非法 density 应被拒绝。
6. 导入主题 schema 校验。
7. 导出主题 JSON 可再次导入。

### E2E tests

1. 打开主题设置。
2. 修改 primary 色。
3. 页面按钮颜色变化。
4. 导出主题。
5. 恢复默认主题。
6. 导入主题。
7. 颜色恢复。

### PWA persistence

1. 修改主题。
2. 刷新页面。
3. 主题仍然生效。

## 验证 / 调整测试

重点验证：

- 移动端。
- 暗色模式。
- PWA 重启后主题仍生效。
- 导入异常主题。
- 极端颜色组合。
- 可读性是否过低。

命令：

```bash
pnpm test core/theme
pnpm test features/settings
pnpm e2e
pnpm typecheck
pnpm build
```

## 提交

分支：

```txt
feat/custom-theme
```

提交信息：

```txt
feat: add customizable theme system
```

## 机器 review

- theme validation tests
- storage tests
- e2e theme import/export
- visual smoke test
- typecheck
- build

## 人工 review checklist

- [ ] 主题足够灵活。
- [ ] AI 生成主题可控。
- [ ] 导入导出简单。
- [ ] 样式没有破坏移动端。
- [ ] PWA 重启后主题保留。
- [ ] 为后续 AI 调整全部样式留出扩展空间。
