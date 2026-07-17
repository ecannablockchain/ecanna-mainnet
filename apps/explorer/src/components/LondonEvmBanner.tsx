import { Link } from "react-router-dom";

/** Persistent developer note: Clique + stock Geth = London EVM only. */
export function LondonEvmBanner({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
        <strong>Remix / Solidity:</strong> set <strong>EVM version → london</strong> (not default / shanghai / cancun).{" "}
        <Link to="/verify" className="font-medium underline">
          Verify guide
        </Link>
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">Deploying contracts on E Canna — set EVM to london</p>
      <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
        This Clique chain (stock Geth) supports through <strong>London</strong> only. Remix{" "}
        <strong>default</strong> and <strong>shanghai / cancun / prague / osaka</strong> can fail gas estimate or
        deploy. In Remix: <strong>Solidity Compiler → Advanced → EVM Version → london</strong>, then Compile → Deploy.
        Hardhat/Foundry: set <code className="rounded bg-amber-100/80 px-1">evmVersion: &quot;london&quot;</code>. Then{" "}
        <Link to="/verify" className="font-medium underline">
          Verify &amp; Publish
        </Link>{" "}
        with EVM <strong>london</strong>.
      </p>
    </div>
  );
}
