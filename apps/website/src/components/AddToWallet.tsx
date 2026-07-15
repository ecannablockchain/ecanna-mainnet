import { useCallback, useState } from "react";
import { addNetworkToInjectedWallet, copyNetworkDetails } from "../lib/walletNetwork";
import { site } from "../config";

type Variant = "footer" | "hero" | "section" | "compact";

type AddToWalletProps = {
  variant?: Variant;
  className?: string;
};

export function AddToWallet({ variant = "section", className = "" }: AddToWalletProps) {
  const [status, setStatus] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const flash = useCallback((type: "ok" | "err", text: string) => {
    setStatus({ type, text });
    window.setTimeout(() => setStatus(null), 5000);
  }, []);

  const handleAdd = useCallback(async () => {
    setBusy(true);
    try {
      const r = await addNetworkToInjectedWallet();
      flash(r.ok ? "ok" : "err", r.message);
      if (!r.ok && r.message.includes("copied")) {
        document.getElementById("wallet")?.scrollIntoView({ behavior: "smooth" });
      }
    } finally {
      setBusy(false);
    }
  }, [flash]);

  const handleCopy = useCallback(async () => {
    const ok = await copyNetworkDetails();
    flash(ok ? "ok" : "err", ok ? "Copied." : "Copy failed.");
  }, [flash]);

  if (variant === "hero") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleAdd()}
        className={`hero-btn hero-btn-wallet inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap sm:w-auto ${busy ? "opacity-80" : ""}`}
      >
        <IconWallet className="h-4 w-4 shrink-0" />
        {busy ? "Confirm in wallet…" : "Add to wallet"}
      </button>
    );
  }

  const actions = (
    <div className="wallet-action-row">
      <button type="button" disabled={busy} onClick={() => void handleAdd()} className="wallet-btn-primary">
        {busy ? "Waiting…" : "Add to wallet"}
      </button>
      <button type="button" onClick={() => void handleCopy()} className="wallet-btn-secondary">
        Copy details
      </button>
    </div>
  );

  if (variant === "footer" || variant === "compact") {
    return (
      <div className={className}>
        {actions}
        {status ? (
          <p className={`wallet-status ${status.type === "ok" ? "wallet-status-ok" : "wallet-status-err"}`} role="status">
            {status.text}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className}>
      {actions}
      {status ? (
        <p className={`mt-3 text-xs ${status.type === "ok" ? "text-emerald-600" : "text-amber-700"}`} role="status">
          {status.text}
        </p>
      ) : null}
    </div>
  );
}

function IconWallet({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h18M7 15h1m4 0h1M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"
      />
    </svg>
  );
}
