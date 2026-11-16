import { CronInput, CronOutput } from "../CronWorkspace";
import { DiffWorkspace } from "../DiffWorkspace";
import type { DiffInput } from "../DiffWorkspace";
import {
  DiffControls,
  StructuredControls,
  TimeControls,
} from "../ToolControls";
import type { builtinTools } from "./catalog";
import type { ToolRegistration } from "./ui";

export const toolRegistrations: Partial<
  Record<(typeof builtinTools)[number]["id"], ToolRegistration>
> = {
  format: {
    Controls: StructuredControls,
    defaultConfig: { indent: 2, inputFormat: "auto", outputFormat: "json" },
  },
  minify: {
    Controls: StructuredControls,
    defaultConfig: { inputFormat: "auto" },
  },
  "unix-time.convert": {
    Controls: TimeControls,
    defaultConfig: { inputFormat: "auto", outputFormat: "seconds" },
    note: "timeNote",
  },
  "jwt.decode": { note: "jwtWarning" },
  "uuid.generate": { note: "uuidNote" },
  "url.parse": { note: "urlNote" },
  "url.build": { note: "urlNote" },
  "cron.parse": {
    ui: { kind: "panels", Input: CronInput, Output: CronOutput },
    execution: { kind: "live", debounceMs: 150, localized: true },
    note: "cronNote",
  },
  "diff.compare": {
    ui: { kind: "workspace", Workspace: DiffWorkspace },
    Controls: DiffControls,
    defaultConfig: { mode: "auto" },
    sharedInput: {
      read: (input) => (JSON.parse(input) as DiffInput).before,
      write: (shared, previous) =>
        JSON.stringify({
          before: shared,
          after: previous ? (JSON.parse(previous) as DiffInput).after : "",
        }),
    },
  },
};
