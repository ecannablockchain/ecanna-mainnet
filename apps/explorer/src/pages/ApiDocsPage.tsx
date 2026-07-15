import { token20Label } from "../lib/chainBranding";

const T20 = token20Label();

const endpoints = [
  ["GET", "/health", "Service health"],
  ["GET", "/api/v1/dashboard", "Network stats for explorer home"],
  ["GET", "/api/v1/charts/daily-transactions", "Daily indexed tx counts"],
  ["GET", "/api/v1/blocks?limit=&offset=", "Paginated blocks"],
  ["GET", "/api/v1/blocks/latest", "Latest indexed block"],
  ["GET", "/api/v1/blocks/rpc-recent?limit=", "Latest blocks from RPC (home feed; accurate ages)"],
  ["GET", "/api/v1/blocks/:num", "Block + transactions"],
  ["GET", "/api/v1/transactions?limit=&offset=", "Paginated transactions"],
  ["GET", "/api/v1/tx/:hash", "Transaction detail"],
  ["GET", "/api/v1/address/:addr/summary", `Native + optional ${T20} balance + indexed counts`],
  ["GET", "/api/v1/address/:addr/erc20-transfers", `${T20} transfers for this address (indexed logs)`],
  ["GET", "/api/v1/address/:addr/token-holdings", `${T20} balances from indexed logs + configured token balanceOf`],
  ["GET", "/api/v1/address/:addr/transactions", "Layer-1 txs where from/to equals address"],
  ["GET", "/api/v1/tokens/transfers?limit=&offset=&token=", `${T20} transfers (+ parent tx action)`],
  ["GET", "/api/v1/tokens/:addr/info", "Token metadata + indexed transfer count"],
  ["GET", "/api/v1/tokens/:addr/holders?limit=&offset=", "Ranked balances from indexed Transfer logs"],
  ["GET", "/api/v1/gas", "Gas tracker data"],
  ["GET", "/api/v1/search?q=", "Search routing"],
  ["GET/POST", "/api/verify/etherscan", "Contract verification"],
];

export function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Developer API</h1>
      <div className="pes-table-wrap rounded-xl">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-2 font-semibold">Method</th>
              <th className="px-4 py-2 font-semibold">Path</th>
              <th className="px-4 py-2 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map(([m, p, d]) => (
              <tr key={p} className="border-b border-slate-100">
                <td className="px-4 py-2 font-mono text-xs text-brand-700">{m}</td>
                <td className="px-4 py-2 font-mono text-xs">{p}</td>
                <td className="px-4 py-2 text-slate-700">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
