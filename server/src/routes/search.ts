import type { Request, Response } from "express";
import { ethers } from "ethers";
import { prisma } from "../lib/prisma.js";

export async function searchHandler(req: Request, res: Response) {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Missing q" });

  if (/^\d+$/.test(q)) {
    const b = await prisma.block.findUnique({ where: { number: BigInt(q) } });
    if (b) return res.json({ type: "block", result: { number: b.number.toString(), hash: b.hash } });
  }

  if (ethers.isAddress(q)) {
    const addr = q.toLowerCase();
    const tx = await prisma.transaction.findFirst({
      where: { OR: [{ from: addr }, { to: addr }] },
    });
    if (tx) return res.json({ type: "address", result: { address: addr } });
    const v = await prisma.contractVerification.findUnique({ where: { address: addr } });
    if (v) return res.json({ type: "contract", result: { address: addr } });
    return res.json({ type: "address", result: { address: addr } });
  }

  if (/^0x([A-Fa-f0-9]{64})$/.test(q)) {
    const hash = String(q).toLowerCase();
    const tx = await prisma.transaction.findUnique({ where: { hash } });
    if (tx) return res.json({ type: "tx", result: { hash: tx.hash } });
  }

  res.status(404).json({ error: "No matches" });
}
