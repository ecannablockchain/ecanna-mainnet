import type { PrismaClient } from "../generated/prisma/index.js";

/** Batch-load deployer-published logo URLs for token/contract addresses. */
export async function fetchLogoUrlsByAddress(
  prisma: PrismaClient,
  addresses: string[],
): Promise<Map<string, string | null>> {
  const uniq = [...new Set(addresses.map((a) => a.toLowerCase()).filter(Boolean))];
  const map = new Map<string, string | null>();
  for (const a of uniq) map.set(a, null);
  if (uniq.length === 0) return map;

  const rows = await prisma.contractTokenProfile.findMany({
    where: { address: { in: uniq }, logoUrl: { not: null } },
    select: { address: true, logoUrl: true },
  });
  for (const r of rows) {
    const url = r.logoUrl?.trim() || null;
    if (url) map.set(r.address.toLowerCase(), url);
  }
  return map;
}
