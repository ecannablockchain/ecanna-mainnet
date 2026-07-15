import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeContext";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { TxsPage } from "./pages/TxsPage";
import { BlocksPage } from "./pages/BlocksPage";
import { BlockPage } from "./pages/BlockPage";
import { TxPage } from "./pages/TxPage";
import { AddressPage } from "./pages/AddressPage";
import { TransfersPage } from "./pages/TransfersPage";
import { VerifyPage } from "./pages/VerifyPage";
import { VerifiedContractsPage } from "./pages/VerifiedContractsPage";
import { ApiDocsPage } from "./pages/ApiDocsPage";
import { FaucetPage } from "./pages/FaucetPage";

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="txs" element={<TxsPage />} />
          <Route path="blocks" element={<BlocksPage />} />
          <Route path="block/:num" element={<BlockPage />} />
          <Route path="tx/:hash" element={<TxPage />} />
          <Route path="address/:addr" element={<AddressPage />} />
          <Route path="token-transfers" element={<TransfersPage />} />
          <Route path="verified-contracts" element={<VerifiedContractsPage />} />
          <Route path="verify" element={<VerifyPage />} />
          <Route path="faucet" element={<FaucetPage />} />
          <Route path="api-docs" element={<ApiDocsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
