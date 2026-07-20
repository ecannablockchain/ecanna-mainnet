import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ContractVerifiedPanel, type VerifiedForPanel } from "./ContractVerifiedPanel";
import { fetchJson } from "../lib/api";
import { TokenProfileEditor, type TokenProfile } from "./TokenProfileEditor";
import { HoldersAnalytics } from "./HoldersAnalytics";
import { token20Label } from "../lib/chainBranding";
import { age, fmtNative, fmtToken, shortAddr, shortHash } from "../lib/format";

type TokenTab = "transfers" | "holders" | "info" | "contract";

export type TokenInfo = {
  address: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
  indexedTransfers: number;
};

type TokenXferApi = {
  txHash: string;
  logIndex: number;
  token: string;
  from: string;
  to: string;
  value: string;
  blockNumber: string;
  timestamp: string;
  action?: string;
};

type HolderRow = {
  rank: number;
  address: string;
  balance: string;
  percentage: number | null;
};

type HoldersRes = {
  items: HolderRow[];
  total: number;
  totalSupply: string | null;
  indexedTransfers: number;
  error?: string;
};

function CopyHashBtn({ hash }: { hash: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      title="Copy transaction hash"
      className="inline-flex shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      onClick={() => {
        void navigator.clipboard.writeText(hash).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        });
      }}
    >
      {ok ? (
        <span className="text-[10px] font-semibold text-emerald-600">✓</span>
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap border-b-2 px-2.5 py-3 text-xs font-semibold transition sm:px-4 sm:text-sm ${
        active
          ? "-mb-px border-brand-600 text-brand-600"
          : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function CopyTokenAddress({ address }: { address: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      title="Copy contract address"
      onClick={() => {
        void navigator.clipboard.writeText(address).then(() => {
          setOk(true);
          window.setTimeout(() => setOk(false), 1200);
        });
      }}
      className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium shadow-sm transition hover:opacity-95"
      style={{
        borderColor: "var(--card-border)",
        background: "var(--card-bg)",
        color: "var(--card-muted)",
      }}
    >
      <span className="break-all font-mono text-[11px]" style={{ color: "var(--card-heading)" }}>
        {address}
      </span>
      {ok ? (
        <span className="shrink-0 text-emerald-600">✓ Copied</span>
      ) : (
        <span className="shrink-0 opacity-70">Copy</span>
      )}
    </button>
  );
}

type Props = {
  tokenAddress: string;
  pethToken: string | null;
  pethDecimals: number;
  verified: VerifiedForPanel | null;
  verifiedLoading: boolean;
  chainInferred: VerifiedForPanel | null;
  chainLoading: boolean;
  verifyHref: string;
  contractVerified: boolean;
  contractName: string | null;
  /** Contract's native coin balance (token contract address). */
  nativeBalanceWei: string;
  nativeSymbol: string;
  /** From RPC / chain-meta while token info API is loading */
  chainNameHint?: string | null;
  chainSymbolHint?: string | null;
};

export function TokenContractTabs({
  tokenAddress,
  pethToken,
  pethDecimals,
  verified,
  verifiedLoading,
  chainInferred,
  chainLoading,
  verifyHref,
  contractVerified,
  contractName,
  nativeBalanceWei,
  nativeSymbol,
  chainNameHint = null,
  chainSymbolHint = null,
}: Props) {
  const [tab, setTab] = useState<TokenTab>("transfers");
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [xfers, setXfers] = useState<TokenXferApi[]>([]);
  const [holders, setHolders] = useState<HoldersRes | null>(null);
  const [holdersErr, setHoldersErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [tokenProfile, setTokenProfile] = useState<TokenProfile | null>(null);

  const dec = info?.decimals ?? pethDecimals;

  useEffect(() => {
    const a = tokenAddress.toLowerCase();
    setLoadErr(null);
    setInfo(null);
    setXfers([]);
    setHolders(null);
    setHoldersErr(null);
    void (async () => {
      const settled = await Promise.allSettled([
        fetchJson<TokenInfo>(`/api/v1/tokens/${a}/info`),
        fetchJson<{ items: TokenXferApi[] }>(
          `/api/v1/tokens/transfers?token=${encodeURIComponent(a)}&limit=50&offset=0`,
        ),
        fetchJson<HoldersRes>(`/api/v1/tokens/${a}/holders?limit=50&offset=0`),
        fetchJson<{ profile: TokenProfile | null }>(`/api/v1/contract/${a}/token-profile`),
      ]);
      const infoR = settled[0];
      const xferR = settled[1];
      const holdR = settled[2];
      const profR = settled[3];
      if (infoR.status === "fulfilled") setInfo(infoR.value);
      else setLoadErr(infoR.reason instanceof Error ? infoR.reason.message : "Token info unavailable");
      if (xferR.status === "fulfilled") setXfers(xferR.value.items ?? []);
      if (holdR.status === "fulfilled") {
        setHolders(holdR.value);
        setHoldersErr(null);
      } else {
        setHoldersErr(holdR.reason instanceof Error ? holdR.reason.message : "Holders unavailable");
      }
      if (profR.status === "fulfilled") setTokenProfile(profR.value.profile ?? null);
    })();
  }, [tokenAddress]);

  const sym =
    info?.symbol ||
    chainSymbolHint ||
    contractName?.slice(0, 6)?.toUpperCase() ||
    "TOKEN";
  const titleLine =
    info?.name && info?.symbol
      ? `${info.name} (${info.symbol})`
      : info?.name
        ? info.name
        : chainNameHint && chainSymbolHint
          ? `${chainNameHint} (${chainSymbolHint})`
          : chainNameHint
            ? chainNameHint
            : contractName
              ? contractName
              : "Token";

  const amountFmt = (raw: string) => {
    const isPeth = pethToken && tokenAddress.toLowerCase() === pethToken.toLowerCase();
    if (isPeth) return fmtToken(raw, dec, sym);
    return fmtToken(raw, dec, sym);
  };

  const avatarLetter = (sym || "T").replace(/[^a-zA-Z0-9]/g, "").slice(0, 1).toUpperCase() || "T";

  return (
    <section
      className="overflow-hidden rounded-xl border shadow-sm"
      style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
    >
      {/* BscScan-style token profile */}
      <div
        className="border-b px-4 py-5 sm:px-6 sm:py-6"
        style={{ borderColor: "var(--card-border)", background: "var(--page-bg)" }}
      >
        <nav className="mb-4 text-xs" style={{ color: "var(--card-muted)" }}>
          <Link to="/" className="hover:text-brand-600 hover:underline">
            Home
          </Link>
          <span className="mx-1.5 opacity-60">/</span>
          <Link to="/token-transfers" className="hover:text-brand-600 hover:underline">
            Token transfers
          </Link>
          <span className="mx-1.5 opacity-60">/</span>
          <span style={{ color: "var(--card-heading)" }} className="font-medium">
            {sym}
          </span>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          {tokenProfile?.logoUrl ? (
            <img
              src={tokenProfile.logoUrl}
              alt={`${sym} logo`}
              className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-md sm:h-[72px] sm:w-[72px]"
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-md sm:h-[72px] sm:w-[72px] sm:text-3xl"
              style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 45%, #115e59 100%)" }}
              aria-hidden
            >
              {avatarLetter}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl" style={{ color: "var(--card-heading)" }}>
                    {titleLine}
                  </h1>
                  <span className="rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                    {token20Label(nativeSymbol)}
                  </span>
                  {contractVerified ? (
                    <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                      Unverified
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm" style={{ color: "var(--card-muted)" }}>
                  {tokenProfile?.description || "Token tracker — contract profile (BscScan-style layout)"}
                </p>
                {tokenProfile?.websiteUrl || tokenProfile?.twitterUrl || tokenProfile?.discordUrl || tokenProfile?.telegramUrl ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {tokenProfile.websiteUrl ? (
                      <a href={tokenProfile.websiteUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                        Website
                      </a>
                    ) : null}
                    {tokenProfile.twitterUrl ? (
                      <a href={tokenProfile.twitterUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                        X / Twitter
                      </a>
                    ) : null}
                    {tokenProfile.discordUrl ? (
                      <a href={tokenProfile.discordUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                        Discord
                      </a>
                    ) : null}
                    {tokenProfile.telegramUrl ? (
                      <a href={tokenProfile.telegramUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                        Telegram
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {!contractVerified ? (
                <Link
                  to={verifyHref}
                  className="shrink-0 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
                >
                  Verify & Publish
                </Link>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase" style={{ color: "var(--card-muted)" }}>
                Contract
              </span>
              <CopyTokenAddress address={tokenAddress} />
            </div>
          </div>
        </div>

        {loadErr && !info ? (
          <p className="mt-4 text-sm text-amber-800">
            Some token stats are temporarily unavailable. Contract tabs below still work.
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {/* Overview — Etherscan-style */}
          <div
            className="rounded-lg border px-4 py-4 shadow-sm"
            style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Overview</div>
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Max Total Supply</div>
                <div className="mt-0.5 break-all font-mono text-sm font-semibold tabular-nums" style={{ color: "var(--card-heading)" }}>
                  {info?.totalSupply != null ? amountFmt(info.totalSupply) : "—"}
                </div>
              </div>
              <div className="border-t pt-3" style={{ borderColor: "var(--card-border)" }}>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Holders</div>
                <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums" style={{ color: "var(--card-heading)" }}>
                  {holdersErr ? "—" : holders ? holders.total.toLocaleString() : "…"}
                </div>
              </div>
              <div className="border-t pt-3" style={{ borderColor: "var(--card-border)" }}>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Transfers</div>
                <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums" style={{ color: "var(--card-heading)" }}>
                  {info ? info.indexedTransfers.toLocaleString() : "…"}
                </div>
              </div>
            </div>
          </div>

          {/* Other Info */}
          <div
            className="rounded-lg border px-4 py-4 shadow-sm"
            style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Other Info</div>
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Token Contract</div>
                <div className="mt-1">
                  <CopyTokenAddress address={tokenAddress} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  WITH <strong>{info?.decimals ?? "—"}</strong> DECIMALS
                </p>
              </div>
              <div className="border-t pt-3" style={{ borderColor: "var(--card-border)" }}>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Contract {nativeSymbol} balance
                </div>
                <div className="mt-0.5 font-mono text-sm font-semibold" style={{ color: "var(--card-heading)" }}>
                  {fmtNative(nativeBalanceWei, nativeSymbol)}
                </div>
              </div>
            </div>
          </div>

          {/* Profile / status */}
          <div
            className="rounded-lg border px-4 py-4 shadow-sm"
            style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
          >
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Token Profile</div>
            <div className="mt-3 space-y-2 text-sm" style={{ color: "var(--card-heading)" }}>
              <div className="flex flex-wrap gap-2">
                <span className="rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-800">
                  {token20Label(nativeSymbol)}
                </span>
                {contractVerified ? (
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                    Source Code
                  </span>
                ) : (
                  <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                    Unverified
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                {tokenProfile?.description ||
                  "On-chain token details from RPC + indexed Transfer events. No off-chain market price feed."}
              </p>
              {tokenProfile?.websiteUrl ? (
                <a href={tokenProfile.websiteUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
                  {tokenProfile.websiteUrl.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-x-1 border-b px-2"
        style={{ borderColor: "var(--card-border)", background: "var(--page-bg)" }}
      >
        <TabButton active={tab === "transfers"} onClick={() => setTab("transfers")}>
          Transfers
        </TabButton>
        <TabButton active={tab === "holders"} onClick={() => setTab("holders")}>
          Holders
        </TabButton>
        <TabButton active={tab === "info"} onClick={() => setTab("info")}>
          Info
        </TabButton>
        <TabButton active={tab === "contract"} onClick={() => setTab("contract")}>
          <span className="inline-flex items-center gap-1.5">
            Contract
            {contractVerified ? (
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800" title="Verified">
                ✓
              </span>
            ) : null}
          </span>
        </TabButton>
      </div>

      <div className="p-3 sm:p-4" style={{ background: "var(--card-bg)" }}>
        {tab === "transfers" ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-600">
              {token20Label(nativeSymbol)} <code className="rounded bg-slate-100 px-1">Transfer</code> events for this token. The{" "}
              <strong>Action</strong> column
              reflects the parent transaction input (e.g. <code className="rounded bg-slate-100 px-1">transfer</code>, selector, or router
              call).
            </p>
            <p className="text-sm font-medium text-slate-700">
              {info ? `${info.indexedTransfers.toLocaleString()} transfers indexed` : null}
              {xfers.length > 0 ? ` — showing latest ${xfers.length}` : null}
            </p>
            <div className="pes-table-wrap">
              <table className="w-full min-w-[920px] border-collapse">
                <thead>
                  <tr>
                    <th className="pes-th">Transaction hash</th>
                    <th className="pes-th">Action</th>
                    <th className="pes-th">Block</th>
                    <th className="pes-th">Age</th>
                    <th className="pes-th">From / To</th>
                    <th className="pes-th text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {xfers.map((r) => (
                    <tr key={`${r.txHash}-${r.logIndex}`}>
                      <td className="pes-td">
                        <div className="flex items-center gap-0.5">
                          <Link to={`/tx/${r.txHash}`} className="pes-link">
                            {shortHash(r.txHash)}
                          </Link>
                          <CopyHashBtn hash={r.txHash} />
                        </div>
                      </td>
                      <td className="pes-td">
                        <span className="pes-pill font-mono text-[11px]">{r.action ?? "Transfer"}</span>
                      </td>
                      <td className="pes-td">
                        <Link to={`/block/${r.blockNumber}`} className="pes-link">
                          {r.blockNumber}
                        </Link>
                      </td>
                      <td className="pes-td text-slate-500">{age(r.timestamp)}</td>
                      <td className="pes-td">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link to={`/address/${r.from}`} className="pes-link">
                            {shortAddr(r.from)}
                          </Link>
                          <span
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-400"
                            aria-hidden
                          >
                            →
                          </span>
                          <Link to={`/address/${r.to}`} className="pes-link">
                            {shortAddr(r.to)}
                          </Link>
                        </div>
                      </td>
                      <td className="pes-td text-right font-mono text-xs">{amountFmt(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {xfers.length === 0 && !loadErr ? (
              <p className="text-sm text-slate-500">No indexed transfers yet for this token.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "holders" ? (
          <div className="space-y-4">
            {holdersErr ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{holdersErr}</div>
            ) : !holders && !holdersErr ? (
              <p className="text-sm text-slate-500">Loading holders…</p>
            ) : holders ? (
              <>
                <HoldersAnalytics items={holders.items} totalHolders={holders.total} />
                <div className="pes-table-wrap">
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead>
                      <tr>
                        <th className="pes-th">Rank</th>
                        <th className="pes-th">Address</th>
                        <th className="pes-th text-right">Quantity</th>
                        <th className="pes-th text-right">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holders.items.map((h) => (
                        <tr key={h.address}>
                          <td className="pes-td font-mono text-xs">{h.rank}</td>
                          <td className="pes-td">
                            <Link to={`/address/${h.address}`} className="pes-link">
                              {h.address}
                            </Link>
                          </td>
                          <td className="pes-td text-right font-mono text-xs">{amountFmt(h.balance)}</td>
                          <td className="pes-td text-right">
                            {h.percentage != null ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="font-mono text-xs">{h.percentage.toFixed(2)}%</span>
                                <div className="h-1 w-24 max-w-full overflow-hidden rounded-full bg-slate-200">
                                  <div
                                    className="h-full rounded-full bg-brand-500"
                                    style={{ width: `${Math.min(100, h.percentage)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {tab === "info" ? (
          <TokenProfileEditor
            contractAddress={tokenAddress}
            onSaved={setTokenProfile}
            tokenName={info?.name ?? chainNameHint ?? contractName}
            tokenSymbol={info?.symbol ?? chainSymbolHint ?? sym}
            decimals={info?.decimals ?? null}
            totalSupplyLabel={info?.totalSupply != null ? amountFmt(info.totalSupply) : undefined}
            transfersLabel={info ? info.indexedTransfers.toLocaleString() : undefined}
          />
        ) : null}

        {tab === "contract" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Verified source unlocks full ABI and NatSpec. Otherwise the explorer can suggest a standard {token20Label(nativeSymbol)}{" "}
                ABI from bytecode.
              </p>
              {!contractVerified ? (
                <Link
                  to={verifyHref}
                  className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
                >
                  Verify & Publish
                </Link>
              ) : (
                <span className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                  Verified (locked)
                </span>
              )}
            </div>
            {verified ? (
              <ContractVerifiedPanel verified={verified} />
            ) : verifiedLoading ? (
              <p className="text-sm text-slate-500">Loading verified source…</p>
            ) : null}
            {!contractVerified && chainLoading ? (
              <p className="text-sm text-slate-500">Loading bytecode hints…</p>
            ) : null}
            {!contractVerified && !chainLoading && chainInferred ? (
              <ContractVerifiedPanel variant="chain-inferred" verified={chainInferred} />
            ) : null}
            {!contractVerified && !chainLoading && !chainInferred ? (
              <p className="text-sm text-slate-500">No on-chain ABI hint — verify the contract to use Read / Write.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
