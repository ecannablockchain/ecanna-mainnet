import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ExplorerTheme = "light" | "dim" | "dark";

const STORAGE_KEY = "ecnascan-theme";

const ThemeContext = createContext<{
  theme: ExplorerTheme;
  setTheme: (t: ExplorerTheme) => void;
} | null>(null);

function readStoredTheme(): ExplorerTheme {
  if (typeof window === "undefined") return "light";
  const s = localStorage.getItem(STORAGE_KEY);
  return s === "dim" || s === "dark" || s === "light" ? s : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ExplorerTheme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: ExplorerTheme) => setThemeState(t), []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useExplorerTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useExplorerTheme must be used within ThemeProvider");
  return ctx;
}
