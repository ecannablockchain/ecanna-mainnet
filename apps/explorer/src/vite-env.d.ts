/// <reference types="vite/client" />

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown }) => Promise<unknown>;
    isMetaMask?: boolean;
  };
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_CHAIN_ID: string;
  readonly VITE_CHAIN_NAME: string;
  readonly VITE_NATIVE_NAME: string;
  readonly VITE_NATIVE_SYMBOL: string;
  readonly VITE_EXPLORER_URL: string;
  readonly VITE_PEER_EXPLORER_URL?: string;
  readonly VITE_PEER_NETWORK_LABEL?: string;
  readonly VITE_NETWORK_KIND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
