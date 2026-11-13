import { useTranslation } from "react-i18next";
import { ToolWorkspace } from "./ToolWorkspace";
import "./i18n";
import { useBrowserLanguage } from "./i18n/use-browser-language";
import { builtinTools } from "./tools/catalog";

export function App() {
  const { t } = useTranslation();
  const language = useBrowserLanguage();
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>
          <span className="prompt" aria-hidden="true">
            &gt;_
          </span>
          Toolweave AI
        </h1>
        <div className="header-actions">
          <span className="workspace-path" aria-hidden="true">
            ~/workspace
          </span>
          <select
            className="language-select"
            aria-label={t("language.label")}
            value={language.preference}
            onChange={(event) =>
              language.setPreference(event.currentTarget.value)
            }
          >
            <option value="auto">{t("language.auto")}</option>
            <option value="en" lang="en">
              English
            </option>
            <option value="zh-CN" lang="zh-CN">
              简体中文
            </option>
          </select>
        </div>
      </header>
      <main aria-labelledby="workspace-heading">
        <div className="workspace-header">
          <h2 id="workspace-heading">{t("workspace.title")}</h2>
          <span className="tool-count">
            {t("workspace.tools", { count: builtinTools.length })}
          </span>
        </div>
        <ToolWorkspace />
      </main>
    </div>
  );
}
