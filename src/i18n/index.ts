import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { resolveLocale } from "./locale";
import { en } from "./locales/en";
import { zhCN } from "./locales/zh-CN";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
    strictKeyChecks: true;
  }
}

export const i18n = createInstance();

void i18n.use(initReactI18next).init({
  lng: resolveLocale(navigator.languages),
  fallbackLng: "en",
  resources: { en: { translation: en }, "zh-CN": { translation: zhCN } },
  initAsync: false,
  interpolation: { escapeValue: false },
});
