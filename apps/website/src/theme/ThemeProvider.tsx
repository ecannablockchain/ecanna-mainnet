import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type SiteTheme = "dark" | "light";

const STORAGE_KEY = "ecna-site-theme";

const ThemeContext = createContext<{
  theme: SiteTheme;
  setTheme: (t: SiteTheme) => void;
  toggle: () => void;
} | null>(null);

function applyDomTheme(theme: SiteTheme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>(() => {
    if (typeof window === "undefined") return "light";
    const s = localStorage.getItem(STORAGE_KEY) as SiteTheme | null;
    if (s === "light" || s === "dark") return s;
    return "light";
  });

  useEffect(() => {
    applyDomTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: SiteTheme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((x) => (x === "dark" ? "light" : "dark")), []);

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
