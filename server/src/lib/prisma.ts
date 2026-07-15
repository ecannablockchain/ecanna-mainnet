import { PrismaClient } from "../generated/prisma/index.js";

const logLevels =
  process.env.NODE_ENV === "production"
    ? (["error"] as const)
    : (["warn", "error"] as const);

/**
 * Remote SQL Server + api + indexer sharing one process defaults to a small pool
 * (often ~ num_cpus*2+1). Append pool params when missing so concurrent HTTP + long
 * indexer transactions are less likely to starve readers.
 */
function withSqlServerPoolParams(url: string): string {
  const l = url.toLowerCase();
  const parts: string[] = [];
  if (!l.includes("connection_limit=")) {
    const n = (process.env.PRISMA_CONNECTION_LIMIT || "25").trim() || "25";
    parts.push(`connection_limit=${n}`);
  }
  if (!l.includes("pool_timeout=")) {
    const sec = (process.env.PRISMA_POOL_TIMEOUT_SEC || "60").trim() || "60";
    parts.push(`pool_timeout=${sec}`);
  }
  if (parts.length === 0) return url;
  const sep = url.endsWith(";") ? "" : ";";
  return `${url}${sep}${parts.join(";")}`;
}

const rawUrl = process.env.DATABASE_URL;
const datasourceUrl =
  rawUrl && rawUrl.includes("sqlserver://") ? withSqlServerPoolParams(rawUrl) : rawUrl;

export const prisma = new PrismaClient({
  log: [...logLevels],
  ...(datasourceUrl && datasourceUrl !== rawUrl
    ? { datasources: { db: { url: datasourceUrl } } }
    : {}),
});
