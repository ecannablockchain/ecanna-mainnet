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

export function TokenProfileEditor({
  contractAddress,
  onSaved,
}: {
  contractAddress: string;
  onSaved?: (profile: TokenProfile) => void;
}) {
  const addr = contractAddress.toLowerCase();
  const [meta, setMeta] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

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
      setErr("No wallet found. Install MetaMask or connect via WalletConnect.");
      return;
    }
    const provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    setConnected((await signer.getAddress()).toLowerCase());
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
        onSaved?.(j.profile);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Loading token profile…</p>;

  const isDeployer = Boolean(connected && meta?.deployerAddress && connected === meta.deployerAddress);

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <div>
        <h3 className="font-display text-sm font-semibold text-slate-900">Token branding &amp; links</h3>
        <p className="mt-1 text-xs text-slate-600">
          Logo, website, and social links are shown on this token page. Only the wallet that deployed the contract can
          edit them (wallet signature required).
        </p>
        {meta?.deployerAddress ? (
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            Deployer: {meta.deployerAddress}
          </p>
        ) : (
          <p className="mt-1 text-xs text-amber-800">Deployer not indexed yet — wait for the indexer, then connect.</p>
        )}
      </div>

      {!connected ? (
        <button
          type="button"
          onClick={() => void connect()}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Connect deployer wallet
        </button>
      ) : (
        <p className="text-sm text-slate-700">
          Connected: <span className="font-mono font-medium">{shortAddr(connected, 10)}</span>
          {!isDeployer && meta?.deployerAddress ? (
            <span className="ml-2 text-amber-700">(not the deployer)</span>
          ) : null}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-800">Logo URL</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="https://…/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            disabled={!isDeployer}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-800">Website</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="https://…"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            disabled={!isDeployer}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Twitter / X</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="https://x.com/…"
            value={twitterUrl}
            onChange={(e) => setTwitterUrl(e.target.value)}
            disabled={!isDeployer}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Discord</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={discordUrl}
            onChange={(e) => setDiscordUrl(e.target.value)}
            disabled={!isDeployer}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-800">Telegram</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={telegramUrl}
            onChange={(e) => setTelegramUrl(e.target.value)}
            disabled={!isDeployer}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-800">Short description</span>
          <textarea
            className="mt-1 h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isDeployer}
          />
        </label>
      </div>

      {isDeployer ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save profile (sign message)"}
        </button>
      ) : null}

      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
    </div>
  );
}

export type { TokenProfile };
