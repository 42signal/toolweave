export type Locale = "en" | "zh-CN";

export function resolveLocale(languages: readonly string[] = []): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0];
    if (base === "zh") return "zh-CN";
    if (base === "en") return "en";
  }
  return "en";
}
