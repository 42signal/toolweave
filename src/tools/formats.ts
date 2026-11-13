export const timeInputFormats = [
  "auto",
  "seconds",
  "milliseconds",
  "nanoseconds",
  "date",
] as const;
export const timeOutputFormats = [
  "seconds",
  "milliseconds",
  "nanoseconds",
  "iso",
] as const;
export const dataInputFormats = ["auto", "json", "yaml"] as const;
export const dataOutputFormats = ["json", "yaml"] as const;
export const diffModes = ["auto", "structured", "text"] as const;
