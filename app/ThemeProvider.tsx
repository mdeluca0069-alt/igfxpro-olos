import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

export type ThemeMode =
  | "dark"
  | "light"
  | "institutional"
  | "gold"
  | "high-contrast"
  | "oled";

type ThemeContextState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isLoaded: boolean;
};

const STORAGE_KEY = "olos.theme";

const ThemeContext = createContext<ThemeContextState | null>(null);

const palettes: Record<ThemeMode, Record<string, string>> = {
  dark: {
    "--bg-primary": "#0B0F19",
    "--bg-secondary": "#111827",
    "--text-primary": "#F9FAFB",
    "--accent-primary": "#3B82F6",
  },

  light: {
    "--bg-primary": "#FFFFFF",
    "--bg-secondary": "#F3F4F6",
    "--text-primary": "#111827",
    "--accent-primary": "#2563EB",
  },

  institutional: {
    "--bg-primary": "#05070B",
    "--bg-secondary": "#0E1726",
    "--text-primary": "#E5E7EB",
    "--accent-primary": "#00C2FF",
  },

  gold: {
    "--bg-primary": "#0E0B00",
    "--bg-secondary": "#1B1400",
    "--text-primary": "#FDE68A",
    "--accent-primary": "#D4AF37",
  },

  "high-contrast": {
    "--bg-primary": "#000000",
    "--bg-secondary": "#111111",
    "--text-primary": "#FFFFFF",
    "--accent-primary": "#FFFF00",
  },

  oled: {
    "--bg-primary": "#000000",
    "--bg-secondary": "#050505",
    "--text-primary": "#FFFFFF",
    "--accent-primary": "#22C55E",
  },
};

type Props = {
  children: ReactNode;
};

export function ThemeProvider({ children }: Props) {
  const [theme, setThemeState] = useState<ThemeMode>("institutional");
  const [isLoaded, setIsLoaded] = useState(false);

  const applyTheme = useCallback((nextTheme: ThemeMode) => {
    const root = document.documentElement;

    Object.entries(palettes[nextTheme]).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    root.setAttribute("data-theme", nextTheme);
  }, []);

  const persistTheme = useCallback((value: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, value);
  }, []);

  const restoreTheme = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;

    if (stored && palettes[stored]) {
      return stored;
    }

    return "institutional";
  }, []);

  const setTheme = useCallback(
    (nextTheme: ThemeMode) => {
      setThemeState(nextTheme);
      applyTheme(nextTheme);
      persistTheme(nextTheme);
    },
    [applyTheme, persistTheme]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  useLayoutEffect(() => {
    const restored = restoreTheme();

    setThemeState(restored);
    applyTheme(restored);

    setIsLoaded(true);
  }, [restoreTheme, applyTheme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemTheme = () => {
      const current = localStorage.getItem(STORAGE_KEY);

      if (!current) {
        setTheme(media.matches ? "dark" : "light");
      }
    };

    media.addEventListener("change", handleSystemTheme);

    return () => {
      media.removeEventListener("change", handleSystemTheme);
    };
  }, [setTheme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isLoaded,
    }),
    [theme, setTheme, toggleTheme, isLoaded]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}