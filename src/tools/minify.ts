import { convertData } from "./structured-data";
import type { ToolOutcome } from "./protocol";

export const minify = {
  run(input: string, config: unknown): ToolOutcome {
    return convertData(input, config, true);
  },
};
