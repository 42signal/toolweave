import type { ComponentType } from "react";
import type { ToolResult } from "./protocol";

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type ToolConfig = Readonly<Record<string, JsonValue>>;

export type ToolInputProps = {
  input: string;
  config: ToolConfig;
  disabled: boolean;
  onInputChange: (input: string) => void;
  onConfigChange: (config: ToolConfig) => void;
};

export type ToolOutputProps = { result: ToolResult | null };

export type ToolWorkspaceProps = ToolInputProps &
  ToolOutputProps & {
    running: boolean;
    run: () => void;
    cancel: () => void;
  };

export type ToolUI =
  | {
      kind: "panels";
      Input?: ComponentType<ToolInputProps>;
      Output?: ComponentType<ToolOutputProps>;
      Workspace?: never;
    }
  | {
      kind: "workspace";
      Workspace: ComponentType<ToolWorkspaceProps>;
      Input?: never;
      Output?: never;
    };

export type ToolRegistration = {
  ui?: ToolUI;
  Controls?: ComponentType<ToolInputProps>;
  defaultConfig?: ToolConfig;
  execution?:
    | { kind: "manual" }
    | { kind: "live"; debounceMs: number; localized?: boolean };
  note?: "jwtWarning" | "uuidNote" | "urlNote" | "timeNote" | "cronNote";
  sharedInput?: {
    read: (input: string) => string;
    write: (shared: string, previous: string | undefined) => string;
  };
};
