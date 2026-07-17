/** Developer notice for https://ecnascan.com — Remix/Hardhat must use London EVM. */
export function DeployEvmNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950 ${className}`}
    >
      <p className="font-semibold">Deploying contracts — set EVM to london</p>
      <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
        E Canna Clique (stock Geth) supports through <strong>London</strong> only. In Remix:{" "}
        <strong>Solidity Compiler → Advanced → EVM Version → london</strong> (not{" "}
        <strong>default</strong> / shanghai / cancun / prague / osaka). Hardhat/Foundry:{" "}
        <code className="rounded bg-amber-100/80 px-1">evmVersion: &quot;london&quot;</code>. Then verify on the
        explorer with EVM <strong>london</strong>.
      </p>
    </div>
  );
}
