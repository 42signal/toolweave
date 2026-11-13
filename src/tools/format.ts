import { convertData } from "./structured-data";
import type { ToolOutcome } from "./protocol";

export const format = {
  run(input: string, config: unknown): ToolOutcome {
    return convertData(input, config, false);
  },
};
