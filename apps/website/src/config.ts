function t(v: string | undefined): string {
  return (v ?? "").trim();
}

/** Public service URLs (production defaults — override with VITE_* in `.env`). */
const PUBLIC_HOST = "ecnascan.com";
const ORIGIN = `https://${PUBLIC_HOST}`;

export const site = {
  chainName: t(import.meta.env.VITE_CHAIN_NAME) || "E Canna Mainnet",
  nativeSymbol: t(import.meta.env.VITE_NATIVE_SYMBOL) || "ECNA",
  nativeName: t(import.meta.env.VITE_NATIVE_NAME) || "E Canna",
  tagline:
    t(import.meta.env.VITE_TAGLINE) ||
    "EVM chain with public explorer, SQL-backed indexer, and standard JSON-RPC.",
  /** Marketing site (this page) — default root on your server. */
  websiteUrl: t(import.meta.env.VITE_WEBSITE_URL) || ORIGIN,
  explorerUrl: t(import.meta.env.VITE_EXPLORER_URL) || `https://explorer.${PUBLIC_HOST}`,
  dashboardUrl: t(import.meta.env.VITE_DASHBOARD_URL) || `https://dashboard.${PUBLIC_HOST}`,
  /** ECNASCAN API — register/login and on-chain index. */
  apiUrl: t(import.meta.env.VITE_API_URL) || `https://api.${PUBLIC_HOST}`,
  docsUrl: t(import.meta.env.VITE_DOCS_URL),
  /** Footer social icons (optional). Set any combination of `VITE_SOCIAL_*` in `.env`. */
  social: {
    x: t(import.meta.env.VITE_SOCIAL_X_URL),
    discord: t(import.meta.env.VITE_SOCIAL_DISCORD_URL),
    telegram: t(import.meta.env.VITE_SOCIAL_TELEGRAM_URL),
    github: t(import.meta.env.VITE_SOCIAL_GITHUB_URL),
    linkedin: t(import.meta.env.VITE_SOCIAL_LINKEDIN_URL),
  },
};
