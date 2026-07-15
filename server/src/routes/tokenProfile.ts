import type { Request, Response } from "express";
import { ethers, verifyMessage } from "ethers";
import { prisma } from "../lib/prisma.js";
import { resolveContractDeployer } from "../lib/verifyBytecode.js";

const PROFILE_MESSAGE_PREFIX = "ECNA Token Profile Update";

export type TokenProfileBody = {
  logoUrl?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  discordUrl?: string;
  telegramUrl?: string;
  description?: string;
  signature?: string;
  signerAddress?: string;
  timestamp?: string | number;
};

function trimUrl(v: unknown, max = 500): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function buildProfileMessage(contractAddress: string, timestamp: number): string {
  return `${PROFILE_MESSAGE_PREFIX}\nContract: ${ethers.getAddress(contractAddress)}\nTimestamp: ${timestamp}`;
}

export async function getTokenProfileHandler(req: Request, res: Response) {
  const addr = String(req.params.addr || "").toLowerCase();
  if (!ethers.isAddress(addr)) return res.status(400).json({ error: "Invalid address" });

  const [profile, deployerAddress] = await Promise.all([
    prisma.contractTokenProfile.findUnique({ where: { address: addr } }),
    resolveContractDeployer(addr),
  ]);

  res.json({
    address: addr,
    deployerAddress,
    canEdit: Boolean(deployerAddress),
    profile: profile
      ? {
          logoUrl: profile.logoUrl,
          websiteUrl: profile.websiteUrl,
          twitterUrl: profile.twitterUrl,
          discordUrl: profile.discordUrl,
          telegramUrl: profile.telegramUrl,
          description: profile.description,
          updatedAt: profile.updatedAt.toISOString(),
        }
      : null,
  });
}

export async function putTokenProfileHandler(req: Request, res: Response) {
  const addr = String(req.params.addr || "").toLowerCase();
  if (!ethers.isAddress(addr)) return res.status(400).json({ error: "Invalid address" });

  const body = req.body as TokenProfileBody;
  const signature = String(body.signature || "").trim();
  const signerAddress = String(body.signerAddress || "").trim().toLowerCase();
  const ts = Number(body.timestamp);

  if (!signature || !signerAddress || !Number.isFinite(ts)) {
    return res.status(400).json({ error: "signature, signerAddress, and timestamp are required" });
  }

  const ageMs = Math.abs(Date.now() - ts);
  if (ageMs > 10 * 60 * 1000) {
    return res.status(400).json({ error: "Signature expired — sign again" });
  }

  const deployer = await resolveContractDeployer(addr);
  if (!deployer) {
    return res.status(400).json({
      error: "Deployer not found in index. Wait for indexer to catch the deployment block, then try again.",
    });
  }

  if (signerAddress !== deployer) {
    return res.status(403).json({
      error: "Only the wallet that deployed this contract can update token profile metadata.",
      deployerAddress: deployer,
    });
  }

  let recovered: string;
  try {
    recovered = verifyMessage(buildProfileMessage(addr, ts), signature).toLowerCase();
  } catch {
    return res.status(400).json({ error: "Invalid signature" });
  }
  if (recovered !== signerAddress) {
    return res.status(403).json({ error: "Signature does not match signerAddress" });
  }

  const data = {
    address: addr,
    deployerAddress: deployer,
    logoUrl: trimUrl(body.logoUrl),
    websiteUrl: trimUrl(body.websiteUrl),
    twitterUrl: trimUrl(body.twitterUrl, 200),
    discordUrl: trimUrl(body.discordUrl, 200),
    telegramUrl: trimUrl(body.telegramUrl, 200),
    description: trimUrl(body.description, 2000),
  };

  const row = await prisma.contractTokenProfile.upsert({
    where: { address: addr },
    create: data,
    update: {
      logoUrl: data.logoUrl,
      websiteUrl: data.websiteUrl,
      twitterUrl: data.twitterUrl,
      discordUrl: data.discordUrl,
      telegramUrl: data.telegramUrl,
      description: data.description,
    },
  });

  res.json({
    ok: true,
    address: addr,
    profile: {
      logoUrl: row.logoUrl,
      websiteUrl: row.websiteUrl,
      twitterUrl: row.twitterUrl,
      discordUrl: row.discordUrl,
      telegramUrl: row.telegramUrl,
      description: row.description,
      updatedAt: row.updatedAt.toISOString(),
    },
  });
}

export async function getProfileSignMessageHandler(req: Request, res: Response) {
  const addr = String(req.params.addr || "").toLowerCase();
  if (!ethers.isAddress(addr)) return res.status(400).json({ error: "Invalid address" });
  const timestamp = Date.now();
  res.json({
    message: buildProfileMessage(addr, timestamp),
    timestamp,
    contractAddress: addr,
  });
}
