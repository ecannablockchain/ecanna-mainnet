import { useState } from "react";
import { BrowserProvider } from "ethers";
import { shortAddr } from "../lib/format";

/**
 * BscScan-style: Connect to Web3 → disclaimer (OK/Cancel) → wallet choice → eth_requestAccounts.
 */
export function Web3ConnectBar() {
  const [connected, setConnected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showWallet, setShowWallet] = useState(false);

  const openConnect = () => {
    setErr(null);
    setShowDisclaimer(true);
  };

  const onDisclaimerOk = () => {
    setShowDisclaimer(false);
    setShowWallet(true);
  };

  const onDisclaimerCancel = () => {
    setShowDisclaimer(false);
  };

  const connectInjected = async () => {
    if (!window.ethereum?.request) {
      setErr("No injected wallet found. Install MetaMask or another Web3 wallet.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setConnected(addr);
      setShowWallet(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => {
    setConnected(null);
    setErr(null);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-red-500"}`}
          title={connected ? "Connected" : "Not connected"}
          aria-hidden
        />
        {connected ? (
          <>
            <span className="text-sm text-slate-700">
              Connected <span className="font-mono font-medium text-slate-900">{shortAddr(connected, 8)}</span>
            </span>
            <button
              type="button"
              onClick={() => disconnect()}
              className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={openConnect}
            className="rounded-md bg-[#0784c3] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#0670a3]"
          >
            Connect to Web3
          </button>
        )}
        {err ? <span className="text-xs text-red-600">{err}</span> : null}
      </div>

      {showDisclaimer ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          onClick={onDisclaimerCancel}
        >
          <div className="max-w-md rounded-lg border border-slate-700 bg-[#2d2d2d] p-5 text-slate-100 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm leading-relaxed">
              <strong className="text-white">ECNASCAN</strong> says: please note this Web3 connection feature is
              provided on an &quot;as is&quot; and &quot;as available&quot; basis. The explorer does not give warranties
              and is not liable for any loss from continued use. Only connect wallets you trust on networks you expect.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onDisclaimerCancel}
                className="rounded-md border border-slate-500 bg-transparent px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDisclaimerOk}
                className="rounded-md bg-[#0784c3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0670a3]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showWallet ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowWallet(false)}
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-slate-900">Connect a Wallet</h3>
            <p className="mt-1 text-xs text-slate-500">Choose how you want to connect (same flow as BscScan).</p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void connectInjected()}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-50"
              >
                <span className="text-2xl" aria-hidden>
                  🦊
                </span>
                <span>
                  MetaMask / Injected wallet
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">
                    Popular
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowWallet(false)}
                className="w-full rounded-md border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
            {err ? <p className="mt-3 text-xs text-red-600">{err}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
