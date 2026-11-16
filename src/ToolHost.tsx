import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { builtinTools } from "./tools/catalog";
import type { ToolResult, ToolRun } from "./tools/protocol";
import { startTool } from "./tools/start-tool";
import type { ToolConfig, ToolRegistration } from "./tools/ui";

export function ToolHost({
  toolId,
  input,
  config,
  registration,
  onInputChange,
  onConfigChange,
  onBusyChange,
}: {
  toolId: (typeof builtinTools)[number]["id"];
  input: string;
  config: ToolConfig;
  registration: ToolRegistration;
  onInputChange: (input: string) => void;
  onConfigChange: (config: ToolConfig) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState<ToolResult | null>(null);
  const [running, setRunning] = useState(false);
  const activeRun = useRef<ToolRun | null>(null);
  const execution = registration.execution;
  const live = execution?.kind === "live";
  const language = i18n.resolvedLanguage === "zh-CN" ? "zh-CN" : "en";
  const localized = execution?.kind === "live" && execution.localized;
  const executionConfig = useMemo(
    () => (localized ? { ...config, language } : config),
    [config, language, localized],
  );
  const debounceMs = execution?.kind === "live" ? execution.debounceMs : 0;

  const discardRun = useCallback(() => {
    const previous = activeRun.current;
    activeRun.current = null;
    previous?.cancel();
  }, []);

  const run = useCallback(() => {
    if (activeRun.current) return;
    setResult(null);
    setRunning(true);
    if (!live) onBusyChange(true);
    const task = startTool({ toolId, input, config: executionConfig });
    activeRun.current = task;
    void task.result.then((nextResult) => {
      if (activeRun.current !== task) return;
      activeRun.current = null;
      setResult(nextResult);
      setRunning(false);
      if (!live) onBusyChange(false);
    });
  }, [toolId, input, executionConfig, live, onBusyChange]);

  useEffect(() => {
    setResult(null);
    setRunning(false);
    if (!live || !input.trim()) return;
    const timer = window.setTimeout(run, debounceMs);
    return () => {
      window.clearTimeout(timer);
      discardRun();
    };
  }, [input, executionConfig, live, debounceMs, run, discardRun]);

  useEffect(() => discardRun, [discardRun]);

  const cancelled = result?.ok === false && result.error.code === "CANCELLED";
  const status =
    live && !input.trim()
      ? t("runner.ready")
      : live && !result
        ? t("runner.updating")
        : running
          ? t("runner.running")
          : result
            ? t(
                result.ok
                  ? "runner.completed"
                  : cancelled
                    ? "runner.cancelled"
                    : "runner.failed",
                {
                  duration: new Intl.NumberFormat(language, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }).format(result.durationMs),
                },
              )
            : t("runner.ready");
  const inputProps = {
    input,
    config,
    disabled: running && !live,
    onInputChange: (value: string) => {
      discardRun();
      setResult(null);
      setRunning(false);
      onInputChange(value);
    },
    onConfigChange: (value: ToolConfig) => {
      discardRun();
      setResult(null);
      setRunning(false);
      onConfigChange(value);
    },
  };
  const ui = registration.ui;
  const Controls = registration.Controls;
  const Input = ui?.kind === "panels" ? ui.Input : undefined;
  const Output = ui?.kind === "panels" ? ui.Output : undefined;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!live) run();
      }}
    >
      {(Controls || !live) && (
        <div className="tool-toolbar">
          {Controls && <Controls {...inputProps} />}
          {!live && (
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
                tabIndex={0}
                className="run-button"
                disabled={running}
              >
                {t("runner.run")}
                <span aria-hidden="true"> ↵</span>
              </button>
            </div>
          )}
        </div>
      )}
      {ui?.kind === "workspace" ? (
        <ui.Workspace
          {...inputProps}
          result={result}
          running={running}
          run={run}
          cancel={() => activeRun.current?.cancel()}
        />
      ) : (
        <div className={`editor-grid${live ? " live-panels" : ""}`}>
          {Input ? (
            <Input {...inputProps} />
          ) : (
            <div className="editor-pane">
              <label className="editor-label" htmlFor="json-input">
                {t(`tools.${toolId}.input`)}
              </label>
              <textarea
                id="json-input"
                value={input}
                disabled={inputProps.disabled}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                placeholder={t(`tools.${toolId}.placeholder`)}
                onChange={(event) =>
                  inputProps.onInputChange(event.currentTarget.value)
                }
              />
            </div>
          )}
          {Output ? (
            <Output result={result} />
          ) : (
            <div className="editor-pane">
              <label className="editor-label" htmlFor="json-output">
                {config.outputFormat === "yaml"
                  ? t("runner.yamlOutput")
                  : t(`tools.${toolId}.output`)}
              </label>
              <textarea
                id="json-output"
                value={result?.ok ? result.output : ""}
                readOnly
                spellCheck={false}
                placeholder={t("runner.outputPlaceholder")}
              />
            </div>
          )}
        </div>
      )}
      <div className="result-bar">
        <p role="status">{status}</p>
        <span>{t("runner.privacy")}</span>
      </div>
      {result && !result.ok && !cancelled && (
        <p className="tool-error" role="alert">
          {result.error.code === "INVALID_INPUT"
            ? t(`tools.${toolId}.invalidInput`)
            : result.error.code === "INVALID_CONFIG"
              ? t(`tools.${toolId}.invalidConfig`)
              : t(`errors.${result.error.code}`)}
        </p>
      )}
    </form>
  );
}
