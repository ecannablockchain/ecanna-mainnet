import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExplorerFooter } from "./Footer";
import { ThemeMenu } from "./ThemeMenu";
import { apiUrl, type Dashboard } from "../lib/api";
import { formatLiveGasGwei } from "../lib/format";
import { currentNetworkBadge, isTestnetExplorer, peerExplorerUrl, peerNetworkLabel } from "../lib/networkPeer";
import { fmtUsd, useEthReferencePrice } from "../lib/useEthReferencePrice";
import { NATIVE_SYMBOL } from "../lib/chainBranding";

function IconGasPump({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 22V6a2 2 0 012-2h8a2 2 0 012 2v16M3 22h12M3 22H1M5 12h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 9h2a2 2 0 012 2v3a2 2 0 002 2 2 2 0 002-2v-4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 21V9" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

const DASH_POLL_MS = 15000;

export function Layout() {
  const nav = useNavigate();
  const loc = useLocation();
  const blockchainDetailsRef = useRef<HTMLDetailsElement>(null);
  const [q, setQ] = useState("");
  const [gasGwei, setGasGwei] = useState<number | null>(null);
  const [nativeSymbol, setNativeSymbol] = useState<string>(NATIVE_SYMBOL);
  const ethRef = useEthReferencePrice();

  const refreshDash = useCallback(() => {
    fetch(apiUrl("/api/v1/dashboard"))
      .then((r) => r.json())
      .then((d: Dashboard) => {
        setGasGwei(typeof d.gasGwei === "number" && !Number.isNaN(d.gasGwei) ? d.gasGwei : null);
        if (d.nativeSymbol) setNativeSymbol(d.nativeSymbol);
      })
      .catch(() => setGasGwei(null));
  }, []);

  useEffect(() => {
    refreshDash();
    const id = window.setInterval(refreshDash, DASH_POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshDash]);

  useEffect(() => {
    if (/^\/(txs|blocks|token-transfers|verified-contracts)(\/?|$)/.test(loc.pathname)) {
      blockchainDetailsRef.current?.removeAttribute("open");
    }
  }, [loc.pathname]);

  const search = async () => {
    const t = q.trim();
    if (!t) return;
    if (/^\d+$/.test(t)) {
      nav(`/block/${t}`);
      return;
    }
    if (/^0x[a-fA-F0-9]{64}$/i.test(t)) {
      nav(`/tx/${t.toLowerCase()}`);
      return;
    }
    if (/^0x[a-fA-F0-9]{40}$/i.test(t)) {
      nav(`/address/${t.toLowerCase()}`);
      return;
    }
    try {
      const r = await fetch(apiUrl(`/api/v1/search?q=${encodeURIComponent(t)}`));
      const j = (await r.json()) as { type?: string; result?: { hash?: string; number?: string; address?: string } };
      if (!r.ok) {
        nav(`/txs`);
        return;
      }
      if (j.type === "tx" && j.result?.hash) nav(`/tx/${j.result.hash}`);
      else if (j.type === "block" && j.result?.number) nav(`/block/${j.result.number}`);
      else if (j.type === "address" && j.result?.address) nav(`/address/${j.result.address}`);
      else if (j.type === "contract" && j.result?.address) nav(`/address/${j.result.address}`);
      else nav(`/txs`);
    } catch {
      nav(`/txs`);
    }
  };

  const gasDisplay = gasGwei == null || Number.isNaN(gasGwei) ? "—" : `${formatLiveGasGwei(gasGwei)} Gwei`;
  const peerUrl = peerExplorerUrl();
  const badge = currentNetworkBadge();

  return (
    <div className="ecna-app flex min-h-screen flex-col">
      {/* Row 1 — BscScan-style utility bar */}
      <div
        className="border-b"
        style={{
          background: "var(--topbar-bg)",
          borderColor: "var(--topbar-border)",
          color: "var(--topbar-text)",
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs sm:text-[13px]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="inline-flex flex-wrap items-center gap-2">
              <img src="../logo-thumb.png" alt="" className="ecna-icon-sm ecna-icon-mark" />

              <span className="inline-flex flex-wrap items-baseline gap-1.5">
              <span className="font-semibold" style={{ color: "var(--topbar-heading)" }}>
                {nativeSymbol}
              </span>
              <span>Price (USD ref.):</span>
              {ethRef.loading ? (
                <span className="opacity-75">…</span>
              ) : ethRef.usd != null ? (
                <span className="font-mono font-semibold tabular-nums" style={{ color: "var(--topbar-heading)" }}>
                  {fmtUsd(ethRef.usd)}
                  {ethRef.usd24hChange != null ? (
                    <span
                      className={
                        ethRef.usd24hChange >= 0 ? "ml-1 text-emerald-600" : "ml-1 text-red-600"
                      }
                    >
                      ({ethRef.usd24hChange >= 0 ? "+" : ""}
                      {ethRef.usd24hChange.toFixed(2)}%)
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="opacity-75">—</span>
              )}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconGasPump className="h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden />
              <span>Gas:</span>
              <span className="font-mono font-semibold tabular-nums text-brand-500">{gasDisplay}</span>
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {peerUrl ? (
              <a
                href={peerUrl}
                className="hidden rounded-md border px-3 py-1.5 text-xs font-semibold sm:inline-flex"
                style={{
                  borderColor: "var(--topbar-border)",
                  background: "var(--topbar-btn-bg)",
                  color: "var(--topbar-heading)",
                }}
              >
                → {peerNetworkLabel()}
              </a>
            ) : null}
            <Link
              to="/api-docs"
              className="flex h-9 w-9 items-center justify-center rounded-md border text-[var(--topbar-heading)] transition hover:opacity-80"
              style={{
                borderColor: "var(--topbar-border)",
                background: "var(--topbar-btn-bg)",
              }}
              title="API / settings"
            >
              <IconSettings className="h-[18px] w-[18px]" />
            </Link>
            <ThemeMenu />
            <div
              className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-md border"
              style={{
                borderColor: "var(--topbar-border)",
                background: "var(--topbar-btn-bg)",
              }}
              title={nativeSymbol}
            >
    

              <img src="../logo-thumb.png" alt="" className="h-6 w-6 shrink-0 ecna-icon-mark" />


            </div>
          </div>
        </div>
      </div>

      {/* Row 2 — main nav */}
      <header
        className="border-b"
        style={{
          background: "var(--nav-bg)",
          borderColor: "var(--nav-border)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link to="/" className="inline-flex flex-wrap items-center gap-2.5">
              <img src="../logo-thumb.png" alt="ECNASCAN" className="ecna-wordmark" />
                <span className="font-display text-[22px] font-bold tracking-tight" style={{ color: "var(--nav-text)" }}>
                  ECNA<span className="text-brand-500">SCAN</span>
                </span>
                <span
                  className="rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    borderColor: isTestnetExplorer() ? "#f59e0b" : "var(--nav-border)",
                    background: isTestnetExplorer() ? "rgba(245,158,11,0.15)" : "var(--nav-link-hover-bg)",
                    color: isTestnetExplorer() ? "#b45309" : "var(--topbar-text)",
                  }}
                >
                  {badge}
                </span>
              </Link>
              <p className="mt-0.5 text-[12px] opacity-90" style={{ color: "var(--topbar-text)" }}>
                A Scan-style explorer for your chain
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-x-0.5 gap-y-1" aria-label="Main">
              <Link to="/" className="ecna-nav-link">
                Home
              </Link>
              <details ref={blockchainDetailsRef} className="group relative">
                <summary className="ecna-nav-link cursor-pointer list-none marker:hidden [&::-webkit-details-marker]:hidden">
                  Blockchain
                  <span className="ml-0.5 text-[10px] opacity-70" aria-hidden>
                    ▾
                  </span>
                </summary>
                <div
                  className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-md border py-1 shadow-lg"
                  style={{
                    borderColor: "var(--nav-border)",
                    background: "var(--nav-bg)",
                  }}
                >
                  <NavLink
                    to="/txs"
                    className={({ isActive }) =>
                      `block px-3 py-2 text-sm no-underline ${isActive ? "bg-brand-500/15 font-medium text-brand-600" : ""}`
                    }
                    style={{ color: "var(--nav-text)" }}
                  >
                    Transactions
                  </NavLink>
                  <NavLink
                    to="/blocks"
                    className={({ isActive }) =>
                      `block px-3 py-2 text-sm no-underline ${isActive ? "bg-brand-500/15 font-medium text-brand-600" : ""}`
                    }
                    style={{ color: "var(--nav-text)" }}
                  >
                    Blocks
                  </NavLink>
                  <NavLink
                    to="/token-transfers"
                    className={({ isActive }) =>
                      `block px-3 py-2 text-sm no-underline ${isActive ? "bg-brand-500/15 font-medium text-brand-600" : ""}`
                    }
                    style={{ color: "var(--nav-text)" }}
                  >
                    Token transfers
                  </NavLink>
                  <NavLink
                    to="/verified-contracts"
                    className={({ isActive }) =>
                      `block px-3 py-2 text-sm no-underline ${isActive ? "bg-brand-500/15 font-medium text-brand-600" : ""}`
                    }
                    style={{ color: "var(--nav-text)" }}
                  >
                    Verified contracts
                  </NavLink>
                </div>
              </details>
              <Link to="/verify" className="ecna-nav-link">
                Verify
              </Link>
              {isTestnetExplorer() ? (
                <Link to="/faucet" className="ecna-nav-link">
                  Faucet
                </Link>
              ) : null}
              <Link to="/api-docs" className="ecna-nav-link">
                API
              </Link>
              {peerUrl ? (
                <a href={peerUrl} className="ecna-nav-link">
                  {peerNetworkLabel()}
                </a>
              ) : null}
            </nav>


            
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="es-hero border-b border-black/20">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-9 md:pb-16 md:pt-11">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white md:text-[1.65rem]">
            ECNA Smart Chain Explorer
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Search blocks, transactions, wallet addresses, and token transfers on the ECNA network.
          </p>
          <div className="mt-7 mb-4 flex max-w-3xl flex-col gap-2.5 sm:flex-row sm:items-stretch">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void search()}
              placeholder="Search by Address / Txn Hash / Block / Token"
              className="ecna-hero-input min-h-[44px] flex-1 rounded-md border px-4 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            />
            <button
              type="button"
              onClick={() => void search()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-brand-500 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 active:bg-brand-700 sm:shrink-0 sm:px-8"
            >
              <IconSearch className="h-4 w-4" />
              Search
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 pt-6">
        <Outlet />
      </main>

      <ExplorerFooter />
    </div>
  );
}
