import { dataInputFormats, dataOutputFormats } from "./formats";

export const formatManifest = {
  id: "format",
  version: "1.0.0",
  name: "Format",
  description: "Format and convert JSON and YAML.",
  category: "Structured data",
  source: "builtin",
  configSchema: {
    type: "object",
    properties: {
      indent: { type: "integer", minimum: 0, maximum: 8, default: 2 },
      inputFormat: { type: "string", enum: dataInputFormats, default: "auto" },
      outputFormat: {
        type: "string",
        enum: dataOutputFormats,
        default: "json",
      },
    },
    additionalProperties: false,
  },
} as const;

export const minifyManifest = {
  id: "minify",
  version: "1.0.0",
  name: "Minify",
  description: "Compress JSON or YAML into compact JSON.",
  category: "Structured data",
  source: "builtin",
  configSchema: {
    type: "object",
    properties: {
      inputFormat: { type: "string", enum: dataInputFormats, default: "auto" },
    },
    additionalProperties: false,
  },
} as const;

export const builtinTools = [formatManifest, minifyManifest];
