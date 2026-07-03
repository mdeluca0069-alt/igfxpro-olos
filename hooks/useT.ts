/**
 * useT — Translation hook
 * Reads the current language from LocaleProvider and returns a t() function.
 *
 * Usage:
 *   const { t, lang, setLang } = useT();
 *   <span>{t("nav.dashboard")}</span>
 */
import { useCallback } from "react";
import { useLocale } from "../app/LocaleProvider";
import { getTranslation, type Lang, type TranslationKey } from "../i18n/translations";

export function useT() {
  const { language, setLanguage } = useLocale();

  const t = useCallback(
    (key: TranslationKey): string => getTranslation(language as Lang, key),
    [language],
  );

  return {
    t,
    lang: language as Lang,
    setLang: setLanguage as (lang: Lang) => void,
  };
}
