import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Dev proxy: local API on this machine (local:stack). Override with ECNA_API_PROXY or VITE_DEV_API_PROXY. */
function apiProxyTarget(mode: string): string {
  const fromShell = process.env.ECNA_API_PROXY?.trim();
  if (fromShell) return fromShell;
  const env = loadEnv(mode, __dirname, "");
  const fromFile = env.VITE_DEV_API_PROXY?.trim();
  if (fromFile) return fromFile;
  return "http://127.0.0.1:4000";
}

/** Tailwind + Autoprefixer: postcss.config.cjs (Vite loads it automatically). */
export default defineConfig(({ mode }) => {
  const target = apiProxyTarget(mode);
  return {
    plugins: [react()],
    server: {
      port: 5174,
      host: true,
      strictPort: true,
      proxy: {
        "/api": { target, changeOrigin: true },
        "/health": { target, changeOrigin: true },
      },
    },
    preview: { port: 5174, host: true },
  };
});
