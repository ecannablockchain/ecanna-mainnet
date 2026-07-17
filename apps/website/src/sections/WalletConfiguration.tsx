import { useMemo, useState } from "react";
import { AddToWallet } from "../components/AddToWallet";
import { CopyButton } from "../components/CopyButton";
import { DataRow, InfoPanel } from "../components/InfoPanel";
import { PanelIcon } from "../components/BlockchainIcons";
import { DeployEvmNotice } from "../components/DeployEvmNotice";
import { chainIdDecimal, publicRpcUrl } from "../lib/publicNetwork";
import { site } from "../config";

const chainId = chainIdDecimal();
const rpcUrl = publicRpcUrl();

export function WalletConfiguration() {
  const [jsonCopied, setJsonCopied] = useState(false);

  const metaMaskJson = useMemo(
    () =>
      JSON.stringify(
        {
          chainId: `0x${Number(chainId).toString(16)}`,
          chainName: site.chainName,
          rpcUrls: [rpcUrl],
          nativeCurrency: {
            name: site.nativeSymbol,
            symbol: site.nativeSymbol,
            decimals: 18,
          },
          blockExplorerUrls: [site.explorerUrl],
        },
        null,
        2,
      ),
    [],
  );

  const copyMetaMask = async () => {
    try {
      await navigator.clipboard.writeText(metaMaskJson);
      setJsonCopied(true);
      window.setTimeout(() => setJsonCopied(false), 2500);
    } catch {
      /* denied */
    }
  };

  return (
    <section id="wallet" className="scroll-mt-20 border-b border-[var(--card-border)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="page-section-title sm:text-2xl">Wallet setup</h2>
          <p className="page-section-lead">Chain parameters for MetaMask, Trust Wallet, TokenPocket, or manual entry.</p>
        </div>

        <div className="mt-6">
          <AddToWallet variant="section" />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
          <div>
            <InfoPanel
              title="Network fields"
              icon={<PanelIcon name="wallet" />}
              action={
                <button
                  type="button"
                  onClick={() => void copyMetaMask()}
                  className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                    jsonCopied
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600"
                      : "border-brand-500/40 bg-brand-600/10 text-brand-600 hover:bg-brand-600/20"
                  }`}
                >
                  {jsonCopied ? "JSON copied" : "Copy MetaMask JSON"}
                </button>
              }
            >
              <DataRow label="Network name" value={site.chainName} copyable required mono={false} />
              <DataRow label="RPC URL" value={rpcUrl} copyable required />
              <DataRow label="Chain ID" value={chainId} copyable required />
              <DataRow label="Chain ID (hex)" value={`0x${Number(chainId).toString(16)}`} copyable />
              <DataRow label="Currency symbol" value={site.nativeSymbol} copyable required />
              <DataRow label="Block explorer" value={site.explorerUrl} copyable href={site.explorerUrl} required />
              <DataRow label="Contract EVM" value="london (Remix Advanced settings)" mono={false} />
            </InfoPanel>

            <DeployEvmNotice className="mt-4" />

            <div className="mt-4 rounded-lg border border-[var(--card-border)] bg-[var(--page-bg)] px-4 py-3 text-xs leading-relaxed text-[var(--card-muted)]">
              <strong className="text-[var(--card-heading)]">MetaMask:</strong> Settings → Networks → Add network → Add
              a network manually. <strong className="text-[var(--card-heading)]">Trust Wallet:</strong> Settings →
              Networks → Add custom network.
            </div>
          </div>

          <InfoPanel
            title="MetaMask network JSON"
            subtitle="Paste into advanced import or dev tools"
            icon={<PanelIcon name="rpc" />}
            action={<CopyButton text={metaMaskJson} label="MetaMask JSON" size="md" />}
          >
            <pre className="max-h-[420px] overflow-auto p-4 font-mono text-[11px] leading-relaxed text-[var(--card-muted)]">
              {metaMaskJson}
            </pre>
          </InfoPanel>
        </div>
      </div>
    </section>
  );
}
