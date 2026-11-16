import { useTranslation } from "react-i18next";
import type { ToolInputProps } from "./tools/ui";
import {
  dataInputFormats,
  dataOutputFormats,
  diffModes,
  timeInputFormats,
  timeOutputFormats,
} from "./tools/formats";

export function StructuredControls(props: ToolInputProps) {
  const { t } = useTranslation();
  return (
    <>
      <FormatSelect {...props} name="inputFormat" formats={dataInputFormats} />
      {"outputFormat" in props.config && (
        <>
          <FormatSelect
            {...props}
            name="outputFormat"
            formats={dataOutputFormats}
          />
          <label className="indent-control">
            {t("runner.indent")}
            <select
              value={props.config.indent as number}
              disabled={props.disabled}
              onChange={(event) =>
                props.onConfigChange({
                  ...props.config,
                  indent: Number(event.currentTarget.value),
                })
              }
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                <option key={value} value={value}>
                  {t("runner.spaces", { count: value })}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </>
  );
}

export function TimeControls(props: ToolInputProps) {
  return (
    <>
      <FormatSelect {...props} name="inputFormat" formats={timeInputFormats} />
      <FormatSelect
        {...props}
        name="outputFormat"
        formats={timeOutputFormats}
      />
    </>
  );
}

export function DiffControls(props: ToolInputProps) {
  return <FormatSelect {...props} name="mode" formats={diffModes} />;
}

function FormatSelect(
  props: ToolInputProps & {
    name: "inputFormat" | "outputFormat" | "mode";
    formats: readonly (
      | (typeof dataInputFormats)[number]
      | (typeof dataOutputFormats)[number]
      | (typeof timeInputFormats)[number]
      | (typeof timeOutputFormats)[number]
      | (typeof diffModes)[number]
    )[];
  },
) {
  const { t } = useTranslation();
  return (
    <label className="indent-control">
      {t(props.name === "mode" ? "runner.diffMode" : `runner.${props.name}`)}
      <select
        value={props.config[props.name] as string}
        disabled={props.disabled}
        onChange={(event) =>
          props.onConfigChange({
            ...props.config,
            [props.name]: event.currentTarget.value,
          })
        }
      >
        {props.formats.map((format) => (
          <option key={format} value={format}>
            {t(`formats.${format}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
