import { useEffect, useState } from "react";
import { BrowserProvider } from "ethers";
import { apiUrl, fetchJson } from "../lib/api";
import { shortAddr } from "../lib/format";

type TokenProfile = {
  logoUrl: string | null;
  websiteUrl: string | null;
  twitterUrl: string | null;
  discordUrl: string | null;
  telegramUrl: string | null;
  description: string | null;
  updatedAt?: string;
};

type ProfileResponse = {
  address: string;
  deployerAddress: string | null;
  canEdit: boolean;
  profile: TokenProfile | null;
};

function LinkRow({ label, href }: { label: string; href: string | null | undefined }) {
  if (!href) {
    return (
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        <span className="text-sm text-slate-400">—</span>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <a href={href} target="_blank" rel="noreferrer" className="max-w-[70%] break-all text-right text-sm text-brand-600 hover:underline">
        {href.replace(/^https?:\/\//, "")}
      </a>
    </div>
  );
}

export function TokenProfileEditor({
  contractAddress,
  onSaved,
  tokenName,
  tokenSymbol,
  decimals,
  totalSupplyLabel,
  transfersLabel,
}: {
  contractAddress: string;
  onSaved?: (profile: TokenProfile) => void;
  tokenName?: string | null;
  tokenSymbol?: string | null;
  decimals?: number | null;
  totalSupplyLabel?: string;
  transfersLabel?: string;
}) {
  const addr = contractAddress.toLowerCase();
  const [meta, setMeta] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    let c = true;
    setLoading(true);
    fetchJson<ProfileResponse>(`/api/v1/contract/${addr}/token-profile`)
      .then((r) => {
        if (!c) return;
        setMeta(r);
        const p = r.profile;
        if (p) {
          setLogoUrl(p.logoUrl ?? "");
          setWebsiteUrl(p.websiteUrl ?? "");
          setTwitterUrl(p.twitterUrl ?? "");
          setDiscordUrl(p.discordUrl ?? "");
          setTelegramUrl(p.telegramUrl ?? "");
          setDescription(p.description ?? "");
        }
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => {
        if (c) setLoading(false);
      });
    return () => {
      c = false;
    };
  }, [addr]);

  const connect = async () => {
    setErr(null);
    if (!window.ethereum?.request) {
      setErr("No wallet found. Install MetaMask.");
      return;
    }
    const provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const a = (await signer.getAddress()).toLowerCase();
    setConnected(a);
    if (meta?.deployerAddress && a === meta.deployerAddress) setEditMode(true);
  };

  const save = async () => {
    setErr(null);
    setOk(null);
    if (!connected) {
      setErr("Connect the deployer wallet first.");
      return;
    }
    if (!meta?.deployerAddress || connected !== meta.deployerAddress) {
      setErr(`Only the deployer wallet (${shortAddr(meta?.deployerAddress ?? "", 8)}) can update this profile.`);
      return;
    }
    setBusy(true);
    try {
      const provider = new BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const { message, timestamp } = await fetchJson<{ message: string; timestamp: number }>(
        `/api/v1/contract/${addr}/token-profile/sign-message`,
      );
      const signature = await signer.signMessage(message);
      const r = await fetch(apiUrl(`/api/v1/contract/${addr}/token-profile`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl: logoUrl.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          twitterUrl: twitterUrl.trim() || null,
          discordUrl: discordUrl.trim() || null,
          telegramUrl: telegramUrl.trim() || null,
          description: description.trim() || null,
          signature,
          signerAddress: connected,
          timestamp,
        }),
      });
      const j = (await r.json()) as { error?: string; profile?: TokenProfile };
      if (!r.ok) throw new Error(j.error || "Save failed");
      if (j.profile) {
        setOk("Profile saved.");
        setEditMode(false);
        onSaved?.(j.profile);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading token info…</p>;

  const isDeployer = Boolean(connected && meta?.deployerAddress && connected === meta.deployerAddress);
  const profile = meta?.profile;

  return (
    <div className="space-y-4">
      {/* Public Info — Etherscan-style */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h3 className="font-display text-sm font-semibold text-slate-900">Token information</h3>
          </div>
          <div className="px-4 py-2">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</span>
              <span className="text-sm font-medium text-slate-900">{tokenName || "—"}</span>
            </div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Symbol</span>
              <span className="font-mono text-sm font-medium text-slate-900">{tokenSymbol || "—"}</span>
            </div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decimals</span>
              <span className="font-mono text-sm text-slate-900">{decimals ?? "—"}</span>
            </div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total supply</span>
              <span className="max-w-[65%] break-all text-right font-mono text-sm text-slate-900">
                {totalSupplyLabel || "—"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transfers</span>
              <span className="font-mono text-sm text-slate-900">{transfersLabel || "—"}</span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h3 className="font-display text-sm font-semibold text-slate-900">Project info</h3>
            {!editMode ? (
              <button
                type="button"
                onClick={() => void (isDeployer ? setEditMode(true) : connect())}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                {isDeployer ? "Edit profile" : "Connect deployer to edit"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            )}
          </div>
          {!editMode ? (
            <div className="px-4 py-2">
              {profile?.logoUrl ? (
                <div className="mb-3 flex items-center gap-3 border-b border-slate-100 pb-3">
                  <img src={profile.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover shadow-sm" />
                  <p className="text-sm text-slate-700">{profile.description || "No description yet."}</p>
                </div>
              ) : (
                <p className="border-b border-slate-100 py-2.5 text-sm text-slate-600">
                  {profile?.description || "No project description yet. Deployer can add branding & links."}
                </p>
              )}
              <LinkRow label="Website" href={profile?.websiteUrl} />
              <LinkRow label="Twitter / X" href={profile?.twitterUrl} />
              <LinkRow label="Discord" href={profile?.discordUrl} />
              <LinkRow label="Telegram" href={profile?.telegramUrl} />
              {meta?.deployerAddress ? (
                <div className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                  Deployer: <span className="font-mono">{meta.deployerAddress}</span>
                </div>
              ) : (
                <p className="mt-2 text-xs text-amber-800">Deployer not indexed yet — wait for indexer.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3 px-4 py-4">
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                <strong>Editable mode</strong> — connected as deployer. Changes require a wallet signature (no new chain
                tx).
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-800">Logo URL</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-800">Website</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Twitter / X</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Discord</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={discordUrl}
                    onChange={(e) => setDiscordUrl(e.target.value)}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-800">Telegram</span>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={telegramUrl}
                    onChange={(e) => setTelegramUrl(e.target.value)}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-slate-800">Description</span>
                  <textarea
                    className="mt-1 h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save profile (sign message)"}
              </button>
            </div>
          )}
        </div>
      </div>

      {connected && !isDeployer ? (
        <p className="text-xs text-amber-800">
          Connected {shortAddr(connected, 10)} is not the deployer — view-only.
        </p>
      ) : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
    </div>
  );
}

export type { TokenProfile };
