import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

type SupportedLanguage =
  | "en"
  | "it"
  | "de"
  | "fr"
  | "es"
  | "ar";

type LocaleContextState = {
  language: SupportedLanguage;
  timezone: string;
  currency: string;

  setLanguage: (lang: SupportedLanguage) => void;
  setTimezone: (tz: string) => void;
  setCurrency: (currency: string) => void;

  formatPrice: (value: number) => string;
  formatDate: (date: Date) => string;
};

const LocaleContext = createContext<LocaleContextState | null>(null);

const STORAGE_KEY = "olos.locale";

type Props = {
  children: ReactNode;
};

export function LocaleProvider({ children }: Props) {
  const [language, setLanguageState] =
    useState<SupportedLanguage>("en");

  const [timezone, setTimezoneState] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const [currency, setCurrencyState] = useState("USD");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);

      setLanguageState(parsed.language);
      setTimezoneState(parsed.timezone);
      setCurrencyState(parsed.currency);
    }
  }, []);

  const persist = useCallback(
    (
      lang: SupportedLanguage,
      tz: string,
      curr: string
    ) => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          language: lang,
          timezone: tz,
          currency: curr,
        })
      );
    },
    []
  );

  const setLanguage = useCallback(
    (lang: SupportedLanguage) => {
      setLanguageState(lang);
      persist(lang, timezone, currency);
    },
    [persist, timezone, currency]
  );

  const setTimezone = useCallback(
    (tz: string) => {
      setTimezoneState(tz);
      persist(language, tz, currency);
    },
    [persist, language, currency]
  );

  const setCurrency = useCallback(
    (curr: string) => {
      setCurrencyState(curr);
      persist(language, timezone, curr);
    },
    [persist, language, timezone]
  );

  const formatPrice = useCallback(
    (value: number) => {
      return new Intl.NumberFormat(language, {
        style: "currency",
        currency,
      }).format(value);
    },
    [language, currency]
  );

  const formatDate = useCallback(
    (date: Date) => {
      return new Intl.DateTimeFormat(language, {
        timeZone: timezone,
      }).format(date);
    },
    [language, timezone]
  );

  const value = useMemo(
    () => ({
      language,
      timezone,
      currency,
      setLanguage,
      setTimezone,
      setCurrency,
      formatPrice,
      formatDate,
    }),
    [
      language,
      timezone,
      currency,
      setLanguage,
      setTimezone,
      setCurrency,
      formatPrice,
      formatDate,
    ]
  );

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error(
      "useLocale must be used inside LocaleProvider"
    );
  }

  return context;
}