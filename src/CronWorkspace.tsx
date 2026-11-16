import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CronResult } from "./tools/cron";
import type { ToolInputProps, ToolOutputProps } from "./tools/ui";
import { CronExpressionEditor } from "./CronExpressionEditor";

const fields = [
  ["cronSecond", "0–59"],
  ["cronMinute", "0–59"],
  ["cronHour", "0–23"],
  ["cronDayOfMonth", "1–31"],
  ["cronMonth", "1–12 · JAN–DEC"],
  ["cronDayOfWeek", "0–7 · SUN–SAT"],
] as const;

const presets = [
  ["everyMinute", "* * * * *"],
  ["hourly", "0 * * * *"],
  ["daily", "0 0 * * *"],
  ["weekdays", "0 9 * * 1-5"],
  ["monthly", "0 0 1 * *"],
] as const;

const randomExpressions = [
  "*/5 * * * *",
  "15 * * * *",
  "0 9 * * 1-5",
  "0 0 1 * *",
  "30 12 * * *",
  "0 18 * * 5",
  "0 */6 * * *",
  "45 6 * * 0",
] as const;

export function CronInput({ input, onInputChange }: ToolInputProps) {
  const { t } = useTranslation();
  const [sixFields, setSixFields] = useState(false);
  const [activeField, setActiveField] = useState(0);
  const [copy, setCopy] = useState({ input: "", state: "idle" });
  const parts = input.trim() ? input.trim().split(/\s+/) : [];
  const six = parts.length === 6 || (parts.length < 5 && sixFields);
  const visibleFields = six ? fields : fields.slice(1);
  const field = visibleFields[Math.min(activeField, visibleFields.length - 1)]!;
  const value = parts[activeField] ?? "";
  const syntax = value.includes("/")
    ? "step"
    : value.includes(",")
      ? "list"
      : value.includes("-")
        ? "range"
        : value === "*"
          ? "any"
          : "value";

  function changeExpression(value: string) {
    const count = value.trim().split(/\s+/).length;
    if (count === 5 || count === 6) setSixFields(count === 6);
    setCopy({ input: "", state: "idle" });
    onInputChange(value);
  }

  function changeMode(six: boolean) {
    setSixFields(six);
    setActiveField(0);
    const values = parts.length ? parts : Array<string>(six ? 5 : 6).fill("*");
    changeExpression(
      six ? ["0", ...values].join(" ") : values.slice(1).join(" "),
    );
  }

  async function copyExpression() {
    try {
      await navigator.clipboard.writeText(input);
      setCopy({ input, state: "copied" });
    } catch {
      setCopy({ input, state: "failed" });
    }
  }

  return (
    <div className="cron-panel">
      <div className="cron-input-heading">
        <span>{t("tools.cron.parse.input")}</span>
        <div
          className="cron-modes"
          role="group"
          aria-label={t("runner.cronFieldCount")}
        >
          <button
            type="button"
            aria-pressed={!six}
            onClick={() => {
              if (six) changeMode(false);
            }}
          >
            {t("runner.cronFive")}
          </button>
          <button
            type="button"
            aria-pressed={six}
            onClick={() => {
              if (!six) changeMode(true);
            }}
          >
            {t("runner.cronSix")}
          </button>
        </div>
        <button
          type="button"
          tabIndex={0}
          onClick={() =>
            changeExpression(
              (six ? "0 " : "") +
                randomExpressions[
                  Math.floor(Math.random() * randomExpressions.length)
                ]!,
            )
          }
        >
          {t("runner.cronRandom")}
        </button>
      </div>
      <div className="cron-expression-frame">
        <CronExpressionEditor
          input={input}
          fields={visibleFields.map(([label]) => t(`runner.${label}`))}
          activeField={activeField}
          onChange={changeExpression}
          onSelect={setActiveField}
          label={t("tools.cron.parse.input")}
        />
        <button
          type="button"
          tabIndex={0}
          disabled={!input.trim()}
          onClick={() => void copyExpression()}
        >
          {t(
            copy.input === input && copy.state === "copied"
              ? "runner.cronCopied"
              : "runner.cronCopy",
          )}
        </button>
      </div>
      {copy.input === input && copy.state === "failed" && (
        <p className="tool-error" role="alert">
          {t("runner.cronCopyFailed")}
        </p>
      )}
      <ul
        id="cron-help"
        className="cron-help"
        aria-label={t("runner.cronFieldHelp")}
        aria-live="polite"
      >
        <li>
          <strong>{t(`runner.${field[0]}`)}</strong>
          <span>{field[1]}</span>
        </li>
        <li>{t(`cronHints.${field[0]}`)}</li>
        <li className="cron-selection-hint">
          <code>{value || "—"}</code> — {t(`cronHints.${syntax}`)}
        </li>
        {(["any", "list", "range", "step"] as const)
          .filter((kind) => kind !== syntax)
          .map((kind) => (
            <li key={kind} className="cron-syntax">
              <code>
                {{ any: "*", list: ",", range: "-", step: "/" }[kind]}
              </code>{" "}
              — {t(`cronHints.${kind}`)}
            </li>
          ))}
      </ul>
      <div
        className="cron-presets"
        role="group"
        aria-label={t("runner.cronPresets")}
      >
        {presets.map(([name, value]) => (
          <button
            key={name}
            type="button"
            tabIndex={0}
            onClick={() => changeExpression((six ? "0 " : "") + value)}
          >
            {t(`cronPresets.${name}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CronOutput({ result }: ToolOutputProps) {
  const { t, i18n } = useTranslation();
  const schedule = result?.ok
    ? (JSON.parse(result.output) as CronResult)
    : null;
  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "shortOffset",
  });
  return (
    <div className="cron-panel">
      {schedule && (
        <>
          <p
            className="cron-description"
            aria-label={t("runner.cronDescription")}
          >
            {schedule.description}
          </p>
          {schedule.nextRuns[0] && (
            <div className="cron-next">
              <span>{t("runner.cronNext")}</span>
              <time dateTime={schedule.nextRuns[0]}>
                {dateFormat.format(new Date(schedule.nextRuns[0]))}
              </time>
            </div>
          )}
          <div className="cron-schedule-heading">
            <h4>{t("runner.nextRuns")}</h4>
            <span>{schedule.timezone}</span>
          </div>
          <ol className="cron-next-runs" aria-label={t("runner.nextRuns")}>
            {schedule.nextRuns.map((date) => (
              <li key={date}>
                <time dateTime={date}>{dateFormat.format(new Date(date))}</time>
              </li>
            ))}
          </ol>
          {schedule.nextRuns.length === 0 && <p>{t("runner.cronNoRuns")}</p>}
        </>
      )}
      {!schedule && (
        <p className="cron-output-empty">{t("runner.cronOutputEmpty")}</p>
      )}
    </div>
  );
}
