import { useEffect, useRef, useState } from "react";
import { useExplorerTheme, type ExplorerTheme } from "../theme/ThemeContext";

const items: { id: ExplorerTheme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dim", label: "Dim" },
  { id: "dark", label: "Dark" },
];

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconDim({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" opacity=".85" />
      <path
        d="M19 5l1-1M5 19l-1 1M5 5L4 4M20 20l-1-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function themeIcon(id: ExplorerTheme, cls: string) {
  if (id === "light") return <IconSun className={cls} />;
  if (id === "dim") return <IconDim className={cls} />;
  return <IconMoon className={cls} />;
}

/** BscScan-style theme switcher: Light / Dim / Dark — applies site-wide via `data-theme` on `<html>`. */
export function ThemeMenu() {
  const { theme, setTheme } = useExplorerTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const TriggerIcon = theme === "light" ? IconSun : theme === "dim" ? IconDim : IconMoon;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Site theme"
        onClick={() => setOpen((o) => !o)}
        className="ecna-theme-trigger flex h-9 w-9 items-center justify-center rounded-md border border-[var(--topbar-border)] bg-[var(--topbar-btn-bg)] text-[var(--topbar-text)] transition hover:bg-[var(--topbar-btn-hover)]"
      >
        <TriggerIcon className="h-[18px] w-[18px]" />
      </button>
      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1.5 min-w-[10rem] rounded-lg border border-[var(--dropdown-border)] bg-[var(--dropdown-bg)] py-1 shadow-lg"
        >
          {items.map((it) => (
            <li key={it.id} role="option" aria-selected={theme === it.id}>
              <button
                type="button"
                onClick={() => {
                  setTheme(it.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                  theme === it.id
                    ? "bg-brand-500/15 font-semibold text-brand-500"
                    : "text-[var(--dropdown-text)] hover:bg-[var(--dropdown-hover)]"
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center opacity-90">
                  {themeIcon(it.id, "h-4 w-4")}
                </span>
                {it.label}
                {theme === it.id ? (
                  <span className="ml-auto text-brand-500" aria-hidden>
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
