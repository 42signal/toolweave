import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { resolveLocale } from "./locale";

export function useBrowserLanguage() {
  const { i18n } = useTranslation();
  const [preference, setPreference] = useState("auto");

  useEffect(() => {
    const updateLanguage = () => {
      void i18n.changeLanguage(
        preference === "auto" ? resolveLocale(navigator.languages) : preference,
      );
    };
    const updateDocument = (language: string) => {
      document.documentElement.lang = language;
    };

    i18n.on("languageChanged", updateDocument);
    if (preference === "auto")
      window.addEventListener("languagechange", updateLanguage);
    updateLanguage();

    return () => {
      window.removeEventListener("languagechange", updateLanguage);
      i18n.off("languageChanged", updateDocument);
    };
  }, [i18n, preference]);

  return { preference, setPreference };
}
