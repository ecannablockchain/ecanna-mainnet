import type { CorsOptions } from "cors";

/** Parse comma-separated origins; empty entries dropped. */
export function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Production: require explicit CORS_ORIGIN (or derive from EXPLORER_PUBLIC_URL).
 * Development: allow all origins when unset.
 */
export function buildCorsOptions(): CorsOptions {
  const isProd = process.env.NODE_ENV === "production";
  let origins = parseCorsOrigins(process.env.CORS_ORIGIN);

  if (origins.length === 0 && process.env.EXPLORER_PUBLIC_URL?.trim()) {
    origins = [process.env.EXPLORER_PUBLIC_URL.trim().replace(/\/$/, "")];
  }

  if (isProd) {
    if (origins.length === 0) {
      throw new Error(
        "CORS_ORIGIN or EXPLORER_PUBLIC_URL is required when NODE_ENV=production",
      );
    }
    return {
      origin(origin, callback) {
        if (!origin || origins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
    };
  }

  return { origin: true, credentials: true };
}
