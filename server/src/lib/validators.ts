/** Comma-separated Clique signer addresses from env (genesis / explorer config). */
export function parseValidatorAddresses(): string[] {
  const raw =
    process.env.ECNA_VALIDATORS?.trim() ||
    process.env.CLIQUE_SIGNERS?.trim() ||
    process.env.CLIQUE_SIGNER_ADDRESS?.trim() ||
    process.env.ECNA_PRIMARY_ADDRESS?.trim() ||
    "";
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^0x[a-f0-9]{40}$/.test(s));
}
