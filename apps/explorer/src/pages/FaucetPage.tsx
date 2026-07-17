import { useCallback, useEffect, useState } from "react";
import { LondonEvmBanner } from "../components/LondonEvmBanner";
import { apiUrl } from "../lib/api";
import { isTestnetExplorer } from "../lib/networkPeer";
import { NATIVE_SYMBOL } from "../lib/chainBranding";

type FaucetStatus = {
  enabled: boolean;
  amountFormatted?: string;
  nativeSymbol?: string;
  cooldownMs?: number;
  faucetAddress?: string | null;
};

export function FaucetPage() {
  const [status, setStatus] = useState<FaucetStatus | null>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(() => {
    fetch(apiUrl("/api/v1/faucet"))
      .then((r) => r.json())
      .then((j: FaucetStatus) => setStatus(j))
      .catch(() => setStatus({ enabled: false }));
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (!isTestnetExplorer()) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Faucet is only available on the ECNA Testnet explorer.
      </div>
    );
  }

  const request = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch(apiUrl("/api/v1/faucet"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string; hash?: string; amountFormatted?: string };
      if (!r.ok || !j.ok) {
        setError(j.error || "Request failed");
        return;
      }
      setMessage(`Sent ${j.amountFormatted ?? "?"} ${status?.nativeSymbol ?? NATIVE_SYMBOL} — tx ${j.hash}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const sym = status?.nativeSymbol ?? NATIVE_SYMBOL;
  const amount = status?.amountFormatted ?? "1000";

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--card-heading)]">Testnet faucet</h1>
        <p className="mt-2 text-sm text-[var(--card-muted)]">
          Get free <strong>{sym}</strong> on ECNA Testnet (chain ID 4112). One request per wallet per 24 hours.
        </p>
      </div>

      <LondonEvmBanner />

      {status && !status.enabled ? (
        <p className="text-sm text-red-600">Faucet is not enabled on this API.</p>
      ) : null}

      <div className="space-y-4 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <p className="text-sm text-[var(--card-muted)]">
          Amount per request: <span className="font-mono font-semibold text-[var(--card-heading)]">{amount} {sym}</span>
        </p>
        <label className="block text-sm font-medium text-[var(--card-heading)]" htmlFor="faucet-addr">
          Your wallet address
        </label>
        <input
          id="faucet-addr"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
          className="w-full rounded-md border border-[var(--card-border)] bg-[var(--page-bg)] px-3 py-2 font-mono text-sm"
        />
        <button
          type="button"
          disabled={loading || !address.trim()}
          onClick={() => void request()}
          className="rounded-md bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? "Sending…" : `Request ${amount} ${sym}`}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="break-all text-sm text-emerald-700">{message}</p> : null}
      </div>
    </div>
  );
}
