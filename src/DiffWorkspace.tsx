import { useTranslation } from "react-i18next";
import type { ToolWorkspaceProps } from "./tools/ui";

export type DiffInput = { before: string; after: string };

export function DiffWorkspace(props: ToolWorkspaceProps) {
  const { t } = useTranslation();
  const input = JSON.parse(props.input) as DiffInput;
  return (
    <>
      <div className="editor-grid">
        {(["before", "after"] as const).map((side) => (
          <div className="editor-pane" key={side}>
            <label className="editor-label" htmlFor={`diff-${side}`}>
              {side === "before"
                ? t("tools.diff.compare.input")
                : t("runner.after")}
            </label>
            <textarea
              id={`diff-${side}`}
              value={input[side]}
              disabled={props.disabled}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              placeholder={
                side === "before"
                  ? t("tools.diff.compare.placeholder")
                  : t("runner.afterPlaceholder")
              }
              onChange={(event) =>
                props.onInputChange(
                  JSON.stringify({
                    ...input,
                    [side]: event.currentTarget.value,
                  }),
                )
              }
            />
          </div>
        ))}
      </div>
      <div className="diff-result editor-pane">
        <label className="editor-label" htmlFor="diff-output">
          {t("tools.diff.compare.output")}
        </label>
        <textarea
          id="diff-output"
          value={props.result?.ok ? props.result.output : ""}
          readOnly
          spellCheck={false}
          placeholder={t("runner.outputPlaceholder")}
        />
        {props.result?.ok &&
          (props.result.output === "" || props.result.output === "[]") && (
            <p className="diff-empty">{t("runner.noDifferences")}</p>
          )}
      </div>
    </>
  );
}
