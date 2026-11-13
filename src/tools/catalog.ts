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

function builtin<const ToolId extends string>(
  id: ToolId,
  name: string,
  category: string,
  description: string,
) {
  return {
    id,
    name,
    category,
    description,
    version: "1.0.0",
    source: "builtin",
    configSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  } as const;
}

export const builtinTools = [
  formatManifest,
  minifyManifest,
  builtin(
    "base64.encode",
    "Base64 Encoder",
    "Encoding",
    "Encode UTF-8 text as standard Base64.",
  ),
  builtin(
    "base64.decode",
    "Base64 Decoder",
    "Encoding",
    "Decode standard Base64 as UTF-8 text.",
  ),
  builtin("url.encode", "URL Encoder", "URL", "Encode a URI component."),
];
