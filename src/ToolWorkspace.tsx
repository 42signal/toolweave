import { useState } from "react";
import { useTranslation } from "react-i18next";
import { builtinTools, formatManifest } from "./tools/catalog";
import { toolRegistrations } from "./tools/ui-registry";
import type { ToolConfig, ToolRegistration } from "./tools/ui";
import { ToolHost } from "./ToolHost";

const emptyRegistration: ToolRegistration = {};
const emptyConfig = {};

export function ToolWorkspace() {
  const { t } = useTranslation();
  const [selectedTool, setSelectedTool] =
    useState<(typeof builtinTools)[number]>(formatManifest);
  const [input, setInput] = useState("");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [configs, setConfigs] = useState<Record<string, ToolConfig>>({});
  const [busy, setBusy] = useState(false);
  const registration = toolRegistrations[selectedTool.id] ?? emptyRegistration;

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
            disabled={busy}
            onClick={() => {
              if (selectedTool.id === tool.id) return;
              const sharedInput = toolRegistrations[tool.id]?.sharedInput;
              if (sharedInput)
                setInputs((previous) => ({
                  ...previous,
                  [tool.id]: sharedInput.write(input, previous[tool.id]),
                }));
              setSelectedTool(tool);
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
      {registration.note && (
        <p className="tool-note">{t(`runner.${registration.note}`)}</p>
      )}
      <ToolHost
        key={selectedTool.id}
        toolId={selectedTool.id}
        input={registration.sharedInput ? inputs[selectedTool.id]! : input}
        config={
          configs[selectedTool.id] ?? registration.defaultConfig ?? emptyConfig
        }
        registration={registration}
        onInputChange={(value) => {
          setInput(
            registration.sharedInput
              ? registration.sharedInput.read(value)
              : value,
          );
          if (registration.sharedInput)
            setInputs((previous) => ({
              ...previous,
              [selectedTool.id]: value,
            }));
        }}
        onConfigChange={(value) =>
          setConfigs((previous) => ({ ...previous, [selectedTool.id]: value }))
        }
        onBusyChange={setBusy}
      />
    </section>
  );
}
