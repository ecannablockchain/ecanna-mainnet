import type { Request, Response } from "express";
import { ethers } from "ethers";
import { provider } from "../lib/chain.js";

const FAUCET_ENABLED = process.env.FAUCET_ENABLED === "1";
const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY?.trim() || "";
const FAUCET_AMOUNT_WEI = BigInt(process.env.FAUCET_AMOUNT_WEI || "1000000000000000000000");
const FAUCET_COOLDOWN_MS = parseInt(process.env.FAUCET_COOLDOWN_MS || String(24 * 60 * 60 * 1000), 10);
const FAUCET_MAX_PER_IP_PER_DAY = parseInt(process.env.FAUCET_MAX_PER_IP_PER_DAY || "5", 10);

const lastByAddress = new Map<string, number>();
const ipDaily = new Map<string, { day: string; count: number }>();

function clientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
  return req.socket.remoteAddress || "unknown";
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function faucetWallet(): ethers.Wallet | null {
  if (!FAUCET_PRIVATE_KEY || !/^0x[0-9a-fA-F]{64}$/.test(FAUCET_PRIVATE_KEY)) return null;
  return new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);
}

export function faucetStatusHandler(_req: Request, res: Response) {
  if (!FAUCET_ENABLED) {
    return res.json({ enabled: false, networkKind: process.env.NETWORK_KIND || "mainnet" });
  }
  const wallet = faucetWallet();
  res.json({
    enabled: true,
    networkKind: process.env.NETWORK_KIND || "testnet",
    amountWei: FAUCET_AMOUNT_WEI.toString(),
    amountFormatted: ethers.formatEther(FAUCET_AMOUNT_WEI),
    nativeSymbol: process.env.NATIVE_SYMBOL || "tECNA",
    cooldownMs: FAUCET_COOLDOWN_MS,
    faucetAddress: wallet?.address ?? null,
  });
}

export async function faucetRequestHandler(req: Request, res: Response) {
  if (!FAUCET_ENABLED) {
    return res.status(404).json({ ok: false, error: "Faucet is not enabled on this network" });
  }

  const addressRaw = (req.body?.address || req.body?.to || "").trim();
  if (!ethers.isAddress(addressRaw)) {
    return res.status(400).json({ ok: false, error: "Invalid address" });
  }
  const address = ethers.getAddress(addressRaw).toLowerCase();

  const wallet = faucetWallet();
  if (!wallet) {
    return res.status(503).json({ ok: false, error: "Faucet wallet not configured" });
  }

  const now = Date.now();
  const last = lastByAddress.get(address);
  if (last != null && now - last < FAUCET_COOLDOWN_MS) {
    const waitSec = Math.ceil((FAUCET_COOLDOWN_MS - (now - last)) / 1000);
    return res.status(429).json({
      ok: false,
      error: `Cooldown active — try again in ${waitSec}s`,
      retryAfterSec: waitSec,
    });
  }

  const ip = clientIp(req);
  const day = todayKey();
  const ipRow = ipDaily.get(ip);
  if (ipRow?.day === day && ipRow.count >= FAUCET_MAX_PER_IP_PER_DAY) {
    return res.status(429).json({ ok: false, error: "Daily IP limit reached" });
  }

  try {
    const bal = await provider.getBalance(wallet.address);
    const minGas = ethers.parseEther("0.001");
    if (bal < FAUCET_AMOUNT_WEI + minGas) {
      return res.status(503).json({ ok: false, error: "Faucet balance low — contact operator" });
    }

    const tx = await wallet.sendTransaction({ to: address, value: FAUCET_AMOUNT_WEI });
    const receipt = await tx.wait();
    lastByAddress.set(address, now);
    const nextIp = ipRow?.day === day ? { day, count: ipRow.count + 1 } : { day, count: 1 };
    ipDaily.set(ip, nextIp);

    return res.json({
      ok: true,
      hash: receipt?.hash ?? tx.hash,
      to: address,
      amountWei: FAUCET_AMOUNT_WEI.toString(),
      amountFormatted: ethers.formatEther(FAUCET_AMOUNT_WEI),
      nativeSymbol: process.env.NATIVE_SYMBOL || "tECNA",
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
