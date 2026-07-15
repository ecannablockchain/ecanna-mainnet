/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL?: string;
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_TESTNET_RPC_URL?: string;
  readonly VITE_TESTNET_API_URL?: string;
  readonly VITE_TESTNET_EXPLORER_URL?: string;
  readonly VITE_TESTNET_CHAIN_ID?: string;
  readonly VITE_TESTNET_CHAIN_NAME?: string;
  readonly VITE_TESTNET_NATIVE_SYMBOL?: string;
  readonly VITE_TESTNET_NATIVE_NAME?: string;
  readonly VITE_TESTNET_FAUCET_URL?: string;
  readonly VITE_CHAIN_NAME?: string;
  readonly VITE_NATIVE_SYMBOL?: string;
  readonly VITE_NATIVE_NAME?: string;
  readonly VITE_WEBSITE_URL?: string;
  readonly VITE_EXPLORER_URL?: string;
  readonly VITE_DASHBOARD_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_DOCS_URL?: string;
  readonly VITE_SOCIAL_X_URL?: string;
  readonly VITE_SOCIAL_DISCORD_URL?: string;
  readonly VITE_SOCIAL_TELEGRAM_URL?: string;
  readonly VITE_SOCIAL_GITHUB_URL?: string;
  readonly VITE_SOCIAL_LINKEDIN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
