import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { builtinTools, formatManifest } from "./tools/catalog";
import { startTool } from "./tools/start-tool";
import type { ToolResult, ToolRun } from "./tools/protocol";
import { dataInputFormats, dataOutputFormats } from "./tools/formats";

export function ToolWorkspace() {
  const { t, i18n } = useTranslation();
  const [selectedTool, setSelectedTool] =
    useState<(typeof builtinTools)[number]>(formatManifest);
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState("2");
  const [dataInputFormat, setDataInputFormat] = useState("auto");
  const [dataOutputFormat, setDataOutputFormat] = useState("json");
  const [result, setResult] = useState<ToolResult | null>(null);
  const [running, setRunning] = useState(false);
  const activeRun = useRef<ToolRun | null>(null);

  useEffect(
    () => () => {
      activeRun.current?.cancel();
      activeRun.current = null;
    },
    [],
  );

  function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRun.current) return;
    setResult(null);
    setRunning(true);
    const task = startTool({
      toolId: selectedTool.id,
      input,
      config:
        selectedTool.id === "format"
          ? {
              indent: Number(indent),
              inputFormat: dataInputFormat,
              outputFormat: dataOutputFormat,
            }
          : selectedTool.id === "minify"
            ? { inputFormat: dataInputFormat }
            : {},
    });
    activeRun.current = task;
    void task.result.then((nextResult) => {
      if (activeRun.current !== task) return;
      activeRun.current = null;
      setResult(nextResult);
      setRunning(false);
    });
  }

  const cancelled = result?.ok === false && result.error.code === "CANCELLED";
  const structured =
    selectedTool.id === "format" || selectedTool.id === "minify";
  const status = running
    ? t("runner.running")
    : result
      ? t(
          result.ok
            ? "runner.completed"
            : cancelled
              ? "runner.cancelled"
              : "runner.failed",
          {
            duration: new Intl.NumberFormat(i18n.resolvedLanguage, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }).format(result.durationMs),
          },
        )
      : t("runner.ready");

  return (
    <section className="tool-workspace" aria-labelledby="tool-heading">
      <div
        className="tool-switcher"
        role="group"
        aria-label={t("workspace.chooseTool")}
      >
        {builtinTools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            aria-pressed={selectedTool.id === tool.id}
            disabled={running}
            onClick={() => {
              if (selectedTool.id === tool.id) return;
              setSelectedTool(tool);
              setResult(null);
            }}
          >
            {t(`tools.${tool.id}.name`)}
          </button>
        ))}
      </div>
      <div className="tool-heading">
        <div>
          <p className="tool-id">{selectedTool.id}</p>
          <h3 id="tool-heading">{t(`tools.${selectedTool.id}.name`)}</h3>
        </div>
        <span className="execution-location">{t("runner.local")}</span>
      </div>

      <form onSubmit={run}>
        <div className="tool-toolbar">
          {structured && (
            <label className="indent-control">
              {t("runner.inputFormat")}
              <select
                value={dataInputFormat}
                disabled={running}
                onChange={(event) => {
                  setDataInputFormat(event.currentTarget.value);
                  setResult(null);
                }}
              >
                {dataInputFormats.map((format) => (
                  <option key={format} value={format}>
                    {t(`formats.${format}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {selectedTool.id === "format" && (
            <label className="indent-control">
              {t("runner.outputFormat")}
              <select
                value={dataOutputFormat}
                disabled={running}
                onChange={(event) => {
                  setDataOutputFormat(event.currentTarget.value);
                  setResult(null);
                }}
              >
                {dataOutputFormats.map((format) => (
                  <option key={format} value={format}>
                    {t(`formats.${format}`)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {selectedTool.id === "format" && (
            <label className="indent-control">
              {t("runner.indent")}
              <select
                value={indent}
                disabled={running}
                onChange={(event) => {
                  setIndent(event.target.value);
                  setResult(null);
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                  <option key={value} value={value}>
                    {t("runner.spaces", { count: value })}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="run-actions">
            {running && (
              <button
                type="button"
                tabIndex={0}
                aria-label={t("runner.cancelLabel")}
                onClick={() => activeRun.current?.cancel()}
              >
                {t("runner.cancel")}
              </button>
            )}
            <button
              type="submit"
              className="run-button"
              tabIndex={0}
              disabled={running}
            >
              {t("runner.run")}
              <span aria-hidden="true"> ↵</span>
            </button>
          </div>
        </div>
        <div className="editor-grid">
          <div className="editor-pane">
            <label className="editor-label" htmlFor="json-input">
              {t(`tools.${selectedTool.id}.input`)}
            </label>
            <textarea
              id="json-input"
              value={input}
              disabled={running}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              placeholder={t(`tools.${selectedTool.id}.placeholder`)}
              onChange={(event) => {
                setInput(event.target.value);
                setResult(null);
              }}
            />
          </div>

          {
            <div className="editor-pane">
              <label className="editor-label" htmlFor="json-output">
                {selectedTool.id === "format" && dataOutputFormat === "yaml"
                  ? t("runner.yamlOutput")
                  : t(`tools.${selectedTool.id}.output`)}
              </label>
              <textarea
                id="json-output"
                value={result?.ok ? result.output : ""}
                readOnly
                spellCheck={false}
                placeholder={t("runner.outputPlaceholder")}
              />
            </div>
          }
        </div>

        <div className="result-bar">
          <p role="status">{status}</p>
          <span>{t("runner.privacy")}</span>
        </div>
        {result && !result.ok && !cancelled && (
          <p className="tool-error" role="alert">
            {result.error.code === "INVALID_INPUT"
              ? t(`tools.${selectedTool.id}.invalidInput`)
              : result.error.code === "INVALID_CONFIG"
                ? t(`tools.${selectedTool.id}.invalidConfig`)
                : t(`errors.${result.error.code}`)}
          </p>
        )}
      </form>
    </section>
  );
}
