import { useState } from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../auth/AuthContext";
import { site } from "../config";

const links = [
  { href: "#live-stats", label: "Live stats" },
  { href: "#rates", label: "Rates" },
  { href: "#reference", label: "Reference" },
  { href: "#stack", label: "Developers" },
  { href: "#faq", label: "FAQ" },
  { href: "#wallet", label: "Add network" },
];

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout, loading } = useAuth();

  return (
    <header className="site-nav fixed inset-x-0 top-0 z-50 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="font-display text-sm font-semibold text-[var(--card-heading)]">ECNASCAN</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-[var(--card-muted)] transition hover:bg-[var(--page-bg)] hover:text-brand-600"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!loading && user ? (
            <div className="hidden items-center gap-2 md:flex">
              <span className="max-w-[120px] truncate text-xs text-[var(--card-muted)]">{user.displayName || user.email}</span>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--card-heading)] hover:bg-[var(--page-bg)]"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login" className="px-2 py-1.5 text-sm font-medium text-[var(--card-muted)] hover:text-brand-600">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-sm font-medium text-[var(--card-heading)] hover:border-brand-500/50"
              >
                Register
              </Link>
            </div>
          )}
          <a
            href={site.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-500 sm:inline-flex"
          >
            Explorer
          </a>
          <button
            type="button"
            className="rounded-md p-2 text-[var(--card-muted)] md:hidden"
            aria-label="Menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen ? (
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-[var(--nav-border)] bg-[var(--nav-bg)] px-4 py-3 md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                l.href === "#wallet"
                  ? "bg-brand-600/15 font-semibold text-brand-600"
                  : "text-[var(--card-heading)]"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              {l.href === "#wallet" ? "Add network to wallet" : l.label}
            </a>
          ))}
          <a href={site.explorerUrl} target="_blank" rel="noreferrer" className="block px-3 py-2 text-sm font-medium text-brand-600">
            Explorer
          </a>
          {!loading && !user ? (
            <>
              <Link to="/login" className="block px-3 py-2 text-sm" onClick={() => setMenuOpen(false)}>
                Log in
              </Link>
              <Link to="/register" className="block px-3 py-2 text-sm" onClick={() => setMenuOpen(false)}>
                Register
              </Link>
            </>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
