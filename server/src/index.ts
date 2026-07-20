import "./load-env-deployment.js";
import express from "express";
import { createRateLimiter } from "./lib/rateLimit.js";
import cors from "cors";
import helmet from "helmet";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { ethers } from "ethers";
import { prisma } from "./lib/prisma.js";
import { bytecodeLooksLikeErc20, getTokenExplorerAbiJson } from "./lib/chainContractMeta.js";
import { detectProxy } from "./lib/proxyDetect.js";
import { resolveDisplayMiner } from "./lib/cliqueMiner.js";
import { normalizeStoredAddresses, shouldNormalizeAddressesOnStart } from "./lib/normalize-addresses.js";
import { buildCorsOptions } from "./lib/corsConfig.js";
import { provider, PETH_TOKEN_ADDRESS } from "./lib/chain.js";
import { verifyContractHandler } from "./routes/verify.js";
import {
  getProfileSignMessageHandler,
  getTokenProfileHandler,
  putTokenProfileHandler,
} from "./routes/tokenProfile.js";
import { parseValidatorAddresses } from "./lib/validators.js";
import { faucetRequestHandler, faucetStatusHandler } from "./routes/faucet.js";
import { searchHandler } from "./routes/search.js";
import { attachCookies } from "./lib/cookies.js";
import { loginSiteUser, logoutSiteUser, meSiteUser, registerSiteUser } from "./routes/siteAuth.js";
import { enrichTransactionDetail, fetchTokenMeta } from "./lib/txEnrich.js";
import { fetchLogoUrlsByAddress } from "./lib/tokenLogos.js";
import { getChainTotals } from "./lib/chainStats.js";
import { publicRpcUrl } from "./lib/publicUrls.js";
import {
  fetchBlocksKeyset,
  fetchTransactionsKeyset,
  MAX_LEGACY_OFFSET,
  parseCursorBigInt,
  parseCursorInt,
} from "./lib/dbPagination.js";
import {
  decodeConstructorArgs,
  splitConstructorArgsHex,
} from "./lib/contractBytecodeSections.js";
import type { Prisma } from "./generated/prisma/index.js";

type TxWithBlock = Prisma.TransactionGetPayload<{ include: { block: true } }>;
type TokenTransferRow = Prisma.TokenTransferGetPayload<{
  include: { transaction: { include: { block: true } } };
}>;

const erc20ReadAbi = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const erc20NameAbi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
];

const erc20TokenInfoAbi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

/** Decode tx input into BscScan-style action label (named fn or 4-byte selector). */
function methodLabel(input: string): string {
  if (!input || input === "0x") return "Transfer";
  const sel = input.slice(0, 10).toLowerCase();
  const known: Record<string, string> = {
    "0xa9059cbb": "Transfer",
    "0x23b872dd": "TransferFrom",
    "0x095ea7b3": "Approve",
    "0x39509351": "IncreaseAllowance",
    "0xa457c2d7": "DecreaseAllowance",
    "0x42966c68": "Burn",
    "0xa0712d68": "Mint",
    "0x715018a6": "RenounceOwnership",
    "0xd0e30db0": "Deposit",
    "0x2e1a7d4d": "Withdraw",
  };
  return known[sel] ?? sel;
}

const logger = pino({ level: process.env.LOG_LEVEL || "info" });
const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(buildCorsOptions()));
app.use(
  createRateLimiter(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    parseInt(process.env.RATE_LIMIT_MAX || "300", 10),
  ),
);
app.use(attachCookies);
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true, limit: "4mb" }));
// Production: do not log every successful poll (fills PM2 disks). Errors/4xx still logged.
app.use(
  pinoHttp({
    logger,
    customLogLevel(_req, res, err) {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "silent";
    },
  }),
);

app.get("/", (_req, res) => {
  res.json({
    name: "ECNASCAN API",
    version: "1",
    health: "/health",
    healthApi: "/api/v1/health",
    config: "/api/v1/config",
    auth: {
      register: "POST /api/v1/auth/register",
      login: "POST /api/v1/auth/login",
      logout: "POST /api/v1/auth/logout",
      me: "GET /api/v1/auth/me",
    },
  });
});

app.post("/api/v1/auth/register", registerSiteUser);
app.post("/api/v1/auth/login", loginSiteUser);
app.post("/api/v1/auth/logout", logoutSiteUser);
app.get("/api/v1/auth/me", meSiteUser);

async function healthHandler(_req: express.Request, res: express.Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: "ecnascan-api", database: "up" });
  } catch (e) {
    res.status(503).json({
      ok: false,
      service: "ecnascan-api",
      database: "down",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

app.get("/health", healthHandler);
/** Same as `/health` — useful if you expect all routes under `/api/v1` or test the wrong path. */
app.get("/api/v1/health", healthHandler);

app.get("/api/v1/config", async (_req, res, next) => {
  try {
    const head = await provider.getBlockNumber();
    const networkKind = (process.env.NETWORK_KIND || "mainnet").toLowerCase();
    res.json({
      rpcUrl: publicRpcUrl(),
      chainId: parseInt(process.env.CHAIN_ID || "4111", 10),
      networkKind,
      chainDisplayName:
        process.env.CHAIN_DISPLAY_NAME?.trim() ||
        (networkKind === "testnet" ? "E Canna Testnet" : "E Canna Mainnet"),
      nativeSymbol: process.env.NATIVE_SYMBOL || "ECNA",
      nativeName: process.env.NATIVE_NAME || "E Canna",
      pethToken: process.env.PETH_TOKEN_ADDRESS || null,
      treasuryAddress: process.env.TREASURY_ADDRESS || null,
      explorerUrl: process.env.EXPLORER_PUBLIC_URL || "https://explorer.ecnascan.com",
      peerExplorerUrl: process.env.PEER_EXPLORER_URL?.trim() || null,
      peerNetworkLabel: process.env.PEER_NETWORK_LABEL?.trim() || null,
      dashboardUrl: process.env.DASHBOARD_PUBLIC_URL || "https://dashboard.ecnascan.com",
      faucetEnabled: process.env.FAUCET_ENABLED === "1",
      validators: parseValidatorAddresses(),
      chainHead: head,
    });
  } catch (e) {
    next(e);
  }
});

app.get("/api/v1/faucet", faucetStatusHandler);
app.post("/api/v1/faucet", faucetRequestHandler);

app.get("/api/v1/stats", async (_req, res, next) => {
  try {
    const [latest, totals, head] = await Promise.all([
      prisma.block.findFirst({ orderBy: { number: "desc" }, select: { number: true } }),
      getChainTotals(),
      provider.getBlockNumber(),
    ]);
    res.json({
      indexedLatestBlock: latest?.number?.toString() ?? null,
      chainHead: head,
      indexedTransactions: totals.txCount.toString(),
      indexedBlocks: totals.blockCount.toString(),
      indexedTransfers: totals.transferCount.toString(),
    });
  } catch (e) {
    next(e);
  }
});

/** Home dashboard: network + market-style stats for explorer UI */
app.get("/api/v1/dashboard", async (_req, res, next) => {
  try {
    const [head, feeData] = await Promise.all([
      provider.getBlockNumber(),
      provider.getFeeData(),
    ]);

    const latest = await prisma.block.findFirst({
      orderBy: { number: "desc" },
      select: { number: true, timestamp: true },
    });
    const totals = await getChainTotals();

    const gasPriceWei = feeData.gasPrice ?? feeData.maxFeePerGas;
    const gasGwei = gasPriceWei ? Number(ethers.formatUnits(gasPriceWei, "gwei")) : null;

    let avgBlockTimeSec: number | null = null;
    const recent = await prisma.block.findMany({
      orderBy: { number: "desc" },
      take: 50,
    });
    if (recent.length >= 2) {
      const t0 = recent[0]!.timestamp.getTime();
      const t1 = recent[recent.length - 1]!.timestamp.getTime();
      const n0 = Number(recent[0]!.number);
      const n1 = Number(recent[recent.length - 1]!.number);
      const span = Math.max(1, n0 - n1);
      avgBlockTimeSec = (t0 - t1) / 1000 / span;
    }

    let chainHeadTimestamp: string | null = null;
    let indexerLagBlocks: number | null = null;
    try {
      const headBlock = await provider.getBlock(head);
      if (headBlock?.timestamp != null) {
        chainHeadTimestamp = new Date(Number(headBlock.timestamp) * 1000).toISOString();
      }
      if (latest != null) {
        indexerLagBlocks = Math.max(0, head - Number(latest.number));
      }
    } catch {
      /* RPC hiccup — omit chainHeadTimestamp; UI falls back to indexed */
    }

    res.json({
      chainHead: head,
      indexedLatestBlock: latest?.number?.toString() ?? null,
      indexedTransactions: totals.txCount.toString(),
      indexedBlocks: totals.blockCount.toString(),
      gasGwei,
      latestBlockTimestamp: latest?.timestamp?.toISOString() ?? null,
      /** Live RPC tip block time — use for “last block N secs ago” so UI matches chain, not indexer lag. */
      chainHeadTimestamp,
      /** `chainHead - indexedLatestBlock` when both known; 0 = caught up. */
      indexerLagBlocks,
      avgBlockTimeSec,
      nativeSymbol: process.env.NATIVE_SYMBOL || "ECNA",
    });
  } catch (e) {
    next(e);
  }
});

/** Indexed tx counts per UTC hour — last 48 hours, stable 48 buckets (SQL aggregate + scan fallback). */
app.get("/api/v1/charts/daily-transactions", async (_req, res, next) => {
  try {
    const now = new Date();
    const endBucket = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0, 0),
    );
    const startBucket = new Date(endBucket);
    startBucket.setUTCHours(startBucket.getUTCHours() - 47);

    const map = new Map<string, number>();
    try {
      const rows = await prisma.hourlyTxStats.findMany({
        where: { bucket: { gte: startBucket } },
        orderBy: { bucket: "asc" },
      });
      for (const r of rows) {
        const k = new Date(r.bucket).toISOString().slice(0, 13);
        map.set(k, r.txCount);
      }
    } catch {
      /* rollup table missing — fall through */
    }

    if (map.size === 0) {
      type HourRow = { bucket: Date; cnt: bigint };
      try {
        const rows = await prisma.$queryRaw<HourRow[]>`
          SELECT DATEADD(HOUR, DATEDIFF(HOUR, 0, b.[timestamp]), 0) AS [bucket], COUNT_BIG(*) AS [cnt]
          FROM [dbo].[Transaction] t
          INNER JOIN [dbo].[Block] b ON t.[blockNumber] = b.[number]
          WHERE b.[timestamp] >= ${startBucket}
          GROUP BY DATEADD(HOUR, DATEDIFF(HOUR, 0, b.[timestamp]), 0)
        `;
        for (const r of rows) {
          const k = new Date(r.bucket).toISOString().slice(0, 13);
          map.set(k, Number(r.cnt));
        }
      } catch (sqlErr) {
        logger.warn({ err: sqlErr }, "hourly chart SQL aggregate failed; scanning recent txs");
        const txs = await prisma.transaction.findMany({
          where: { block: { timestamp: { gte: startBucket } } },
          select: { block: { select: { timestamp: true } } },
          take: 100_000,
        });
        for (const t of txs) {
          const d = new Date(t.block.timestamp);
          const utcHour = new Date(
            Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), 0, 0, 0),
          );
          const k = utcHour.toISOString().slice(0, 13);
          map.set(k, (map.get(k) ?? 0) + 1);
        }
      }
    }

    const points: { date: string; count: number }[] = [];
    for (let i = 0; i < 48; i++) {
      const d = new Date(startBucket);
      d.setUTCHours(startBucket.getUTCHours() + i);
      const k = d.toISOString().slice(0, 13);
      points.push({ date: d.toISOString(), count: map.get(k) ?? 0 });
    }

    res.json({ granularity: "hour", windowHours: 48, points });
  } catch (e) {
    next(e);
  }
});

app.get("/api/v1/blocks", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit)) || 25, 100);
    const offset = Math.max(parseInt(String(req.query.offset)) || 0, 0);
    const cursor = parseCursorBigInt(req.query.cursor);

    if (cursor != null || offset === 0) {
      const items = await fetchBlocksKeyset(cursor, limit);
      const totals = await getChainTotals();
      const last = items[items.length - 1];
      res.json({
        items: items.map(serializeBlock),
        total: totals.blockCount.toString(),
        limit,
        offset: cursor != null ? null : offset,
        nextCursor: last ? last.number.toString() : null,
        pagination: "keyset",
      });
      return;
    }

    if (offset > MAX_LEGACY_OFFSET) {
      return res.status(400).json({
        error: `Offset pagination is limited to ${MAX_LEGACY_OFFSET} rows. Use ?cursor=<blockNumber> for deep pages.`,
        maxOffset: MAX_LEGACY_OFFSET,
      });
    }

    const items = await prisma.block.findMany({
      orderBy: { number: "desc" },
      take: limit,
      skip: offset,
    });
    const totals = await getChainTotals();
    res.json({
      items: items.map(serializeBlock),
      total: totals.blockCount.toString(),
      limit,
      offset,
      nextCursor: items.length ? items[items.length - 1]!.number.toString() : null,
      pagination: "offset",
    });
  } catch (e) {
    next(e);
  }
});

app.get("/api/v1/transactions", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit)) || 25, 100);
    const offset = Math.max(parseInt(String(req.query.offset)) || 0, 0);
    const cursorBlock = parseCursorBigInt(req.query.cursorBlock ?? req.query.cursor);
    const cursorTxIndex = parseCursorInt(req.query.cursorTxIndex);

    if (cursorBlock != null || offset === 0) {
      const rows = await fetchTransactionsKeyset(cursorBlock, cursorTxIndex, limit);
      const totals = await getChainTotals();
      const last = rows[rows.length - 1];
      res.json({
        items: rows.map((tx) =>
          serializeTxFull({
            hash: tx.hash,
            blockNumber: tx.blockNumber,
            blockHash: tx.blockHash,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            gasPrice: tx.gasPrice,
            gasUsed: tx.gasUsed,
            status: tx.status,
            input: tx.input,
            nonce: tx.nonce,
            transactionIndex: tx.transactionIndex,
            block: { timestamp: tx.blockTimestamp },
          }),
        ),
        total: totals.txCount.toString(),
        limit,
        offset: cursorBlock != null ? null : offset,
        nextCursorBlock: last ? last.blockNumber.toString() : null,
        nextCursorTxIndex: last ? last.transactionIndex : null,
        pagination: "keyset",
      });
      return;
    }

    if (offset > MAX_LEGACY_OFFSET) {
      return res.status(400).json({
        error: `Offset pagination is limited to ${MAX_LEGACY_OFFSET} rows. Use cursorBlock + cursorTxIndex for deep pages.`,
        maxOffset: MAX_LEGACY_OFFSET,
      });
    }

    const items = await prisma.transaction.findMany({
      orderBy: [{ blockNumber: "desc" }, { transactionIndex: "desc" }],
      take: limit,
      skip: offset,
      include: { block: true },
    });
    const totals = await getChainTotals();
    const last = items[items.length - 1];
    res.json({
      items: items.map((tx: TxWithBlock) => serializeTxFull(tx)),
      total: totals.txCount.toString(),
      limit,
      offset,
      nextCursorBlock: last ? last.blockNumber.toString() : null,
      nextCursorTxIndex: last ? last.transactionIndex : null,
      pagination: "offset",
    });
  } catch (e) {
    next(e);
  }
});

app.get("/api/v1/address/:addr/summary", async (req, res, next) => {
  try {
    const addr = req.params.addr.toLowerCase();
    if (!ethers.isAddress(addr)) return res.status(400).json({ error: "Invalid address" });
    const [balance, txCount, tokenXferCount, asTokenTransferCount, bytecode, verification] = await Promise.all([
      provider.getBalance(addr),
      prisma.transaction.count({
        where: { OR: [{ from: addr }, { to: addr }] },
      }),
      prisma.tokenTransfer.count({
        where: { OR: [{ from: addr }, { to: addr }] },
      }),
      prisma.tokenTransfer.count({ where: { token: addr } }),
      provider.getCode(addr),
      prisma.contractVerification.findUnique({ where: { address: addr } }),
    ]);
    const isContract = Boolean(bytecode && bytecode !== "0x");

    let pethToken: string | null = PETH_TOKEN_ADDRESS || null;
    let pethBalance: string | null = null;
    let pethDecimals = 18;
    if (PETH_TOKEN_ADDRESS) {
      try {
        const c = new ethers.Contract(PETH_TOKEN_ADDRESS, erc20ReadAbi, provider);
        const [bal, dec] = await Promise.all([c.balanceOf(addr), c.decimals()]);
        pethBalance = bal.toString();
        pethDecimals = Number(dec);
      } catch {
        pethBalance = null;
      }
    }

    res.json({
      address: addr,
      balanceWei: balance.toString(),
      indexedTxCount: txCount,
      indexedErc20TransferCount: tokenXferCount,
      /** Indexed ERC-20 Transfer events where this contract is the token (`token` field). */
      asTokenTransferCount,
      nativeSymbol: process.env.NATIVE_SYMBOL || "ECNA",
      pethToken,
      pethBalance,
      pethDecimals,
      isContract,
      contractVerified: Boolean(verification),
      contractName: verification?.contractName ?? null,
      compilerVersion: verification?.compilerVersion ?? null,
    });
  } catch (e) {
    next(e);
  }
});

/** PETH / ERC-20 transfers involving this address (from indexed logs — not the same as “Transactions” list). */
app.get("/api/v1/address/:addr/erc20-transfers", async (req, res, next) => {
  try {
    const addr = req.params.addr.toLowerCase();
    if (!ethers.isAddress(addr)) return res.status(400).json({ error: "Invalid address" });
    const take = Math.min(parseInt(String(req.query.limit)) || 25, 100);
    const tokenFilter = (req.query.token as string | undefined)?.toLowerCase();
    const where: Prisma.TokenTransferWhereInput = {
      OR: [{ from: addr }, { to: addr }],
      ...(tokenFilter ? { token: tokenFilter } : {}),
    };
    const rows = await prisma.tokenTransfer.findMany({
      where,
      include: { transaction: { include: { block: true } } },
      orderBy: [{ transaction: { blockNumber: "desc" } }, { logIndex: "desc" }],
      take,
    });
    const uniqueTokens = [...new Set(rows.map((r) => r.token.toLowerCase()))];
    const metaByToken = new Map<string, { decimals: number; symbol: string }>();
    await Promise.all(
      uniqueTokens.map(async (t) => {
        metaByToken.set(t, await fetchTokenMeta(provider, t));
      }),
    );
    const logos = await fetchLogoUrlsByAddress(prisma, uniqueTokens);
    const items = rows.map((r: TokenTransferRow) => {
      const m = metaByToken.get(r.token.toLowerCase()) ?? { decimals: 18, symbol: "" };
      return {
        txHash: r.txHash,
        logIndex: r.logIndex,
        token: r.token,
        from: r.from,
        to: r.to,
        value: r.value,
        blockNumber: r.transaction.blockNumber.toString(),
        timestamp: r.transaction.block.timestamp.toISOString(),
        action: methodLabel(r.transaction.input),
        tokenDecimals: m.decimals,
        tokenSymbol: m.symbol || null,
        logoUrl: logos.get(r.token.toLowerCase()) ?? null,
      };
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

/** Wallet-style token balances from indexed Transfer logs + live balanceOf for configured PETH token. */
app.get("/api/v1/address/:addr/token-holdings", async (req, res, next) => {
  try {
    const addr = req.params.addr.toLowerCase();
    if (!ethers.isAddress(addr)) return res.status(400).json({ error: "Invalid address" });
    const maxRows = 100_000;
    const xferCount = await prisma.tokenTransfer.count({
      where: { OR: [{ from: addr }, { to: addr }] },
    });
    if (xferCount > maxRows) {
      return res.status(413).json({
        error: `Too many indexed transfer rows (${xferCount}) to aggregate holdings; max ${maxRows}.`,
      });
    }
    const rows = await prisma.tokenTransfer.findMany({
      where: { OR: [{ from: addr }, { to: addr }] },
      select: { token: true, from: true, to: true, value: true },
    });
    const balanceByToken = new Map<string, bigint>();
    for (const r of rows) {
      const v = BigInt(r.value);
      const tok = r.token.toLowerCase();
      const from = r.from.toLowerCase();
      const to = r.to.toLowerCase();
      if (from === addr) {
        balanceByToken.set(tok, (balanceByToken.get(tok) ?? 0n) - v);
      }
      if (to === addr) {
        balanceByToken.set(tok, (balanceByToken.get(tok) ?? 0n) + v);
      }
    }
    for (const [t, bal] of [...balanceByToken.entries()]) {
      if (bal <= 0n) balanceByToken.delete(t);
    }
    if (PETH_TOKEN_ADDRESS) {
      try {
        const c = new ethers.Contract(PETH_TOKEN_ADDRESS, erc20ReadAbi, provider);
        const b = await c.balanceOf(addr);
        const bn = BigInt(b.toString());
        if (bn === 0n) balanceByToken.delete(PETH_TOKEN_ADDRESS);
        else balanceByToken.set(PETH_TOKEN_ADDRESS, bn);
      } catch {
        /* optional */
      }
    }
    const sorted = [...balanceByToken.entries()].sort((a, b) => {
      if (a[1] === b[1]) return 0;
      return a[1] < b[1] ? 1 : -1;
    });
    const items = [];
    for (const [token, balance] of sorted) {
      const meta = await fetchTokenMeta(provider, token);
      const sym = meta.symbol?.trim();
      items.push({
        token,
        balance: balance.toString(),
        balanceFormatted: ethers.formatUnits(balance, meta.decimals),
        symbol: sym || `${token.slice(0, 6)}…${token.slice(-4)}`,
        decimals: meta.decimals,
      });
    }
    res.json({ items, tokenCount: items.length, transferRowsScanned: xferCount });
  } catch (e) {
    next(e);
  }
});

/** Token metadata + indexed stats (BscScan-style token page). */
app.get("/api/v1/tokens/:addr/info", async (req, res, next) => {
  try {
    const addr = req.params.addr.toLowerCase();
    if (!ethers.isAddress(addr)) return res.status(400).json({ error: "Invalid address" });
    const indexedTransfers = await prisma.tokenTransfer.count({ where: { token: addr } });
    const c = new ethers.Contract(addr, erc20TokenInfoAbi, provider);
    let name: string | null = null;
    let symbol: string | null = null;
    let decimals: number | null = null;
    let totalSupply: string | null = null;
    try {
      name = await c.name();
    } catch {
      /* not ERC-20 */
    }
    try {
      symbol = await c.symbol();
    } catch {
      /* optional */
    }
    try {
      decimals = Number(await c.decimals());
    } catch {
      /* optional */
    }
    try {
      totalSupply = (await c.totalSupply()).toString();
    } catch {
      /* optional */
    }
    res.json({
      address: addr,
      name,
      symbol,
      decimals,
      totalSupply,
      indexedTransfers,
    });
  } catch (e) {
    next(e);
  }
});

/** Ranked holders from indexed Transfer logs (mint/burn-aware). */
app.get("/api/v1/tokens/:addr/holders", async (req, res, next) => {
  try {
    const token = req.params.addr.toLowerCase();
    if (!ethers.isAddress(token)) return res.status(400).json({ error: "Invalid token address" });
    const limit = Math.min(parseInt(String(req.query.limit)) || 50, 100);
    const offset = Math.max(parseInt(String(req.query.offset)) || 0, 0);
    const indexedTransfers = await prisma.tokenTransfer.count({ where: { token } });
    const maxAgg = 100_000;
    if (indexedTransfers > maxAgg) {
      return res.status(413).json({
        error: `Too many indexed transfers (${indexedTransfers}) to aggregate holders in-process; max ${maxAgg}`,
      });
    }
    const rows = await prisma.tokenTransfer.findMany({
      where: { token },
      select: { from: true, to: true, value: true },
    });
    const balances = new Map<string, bigint>();
    for (const r of rows) {
      const v = BigInt(r.value);
      const from = r.from.toLowerCase();
      const to = r.to.toLowerCase();
      if (from !== ZERO_ADDR) {
        balances.set(from, (balances.get(from) ?? 0n) - v);
      }
      if (to !== ZERO_ADDR) {
        balances.set(to, (balances.get(to) ?? 0n) + v);
      }
    }
    for (const [k, bal] of balances.entries()) {
      if (bal <= 0n) balances.delete(k);
    }
    const sorted = [...balances.entries()].sort((a, b) => {
      if (a[1] === b[1]) return 0;
      return a[1] < b[1] ? 1 : -1;
    });
    const totalHolders = sorted.length;
    let totalSupply: string | null = null;
    try {
      const c = new ethers.Contract(token, ["function totalSupply() view returns (uint256)"], provider);
      totalSupply = (await c.totalSupply()).toString();
    } catch {
      /* optional */
    }
    const ts = totalSupply ? BigInt(totalSupply) : 0n;
    const slice = sorted.slice(offset, offset + limit);
    const items = slice.map(([address, balance], i) => ({
      rank: offset + i + 1,
      address,
      balance: balance.toString(),
      percentage: ts > 0n ? Number((balance * 10000n) / ts) / 100 : null,
    }));
    res.json({
      items,
      total: totalHolders,
      totalSupply,
      limit,
      offset,
      indexedTransfers,
    });
  } catch (e) {
    next(e);
  }
});

app.get("/api/v1/blocks/latest", async (_req, res, next) => {
  try {
    const b = await prisma.block.findFirst({ orderBy: { number: "desc" } });
    if (!b) return res.status(404).json({ error: "No indexed blocks yet" });
    res.json(serializeBlock(b));
  } catch (e) {
    next(e);
  }
});

/**
 * Latest blocks from RPC (not SQL) — for explorer home so "N secs ago" tracks the live tip (~3s spacing)
 * when the indexer is temporarily behind after restarts.
 */
app.get("/api/v1/blocks/rpc-recent", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit)) || 6, 1), 25);
    const head = await provider.getBlockNumber();
    const items: ReturnType<typeof serializeBlock>[] = [];
    for (let i = 0; i < limit; i++) {
      const n = head - i;
      if (n < 0) break;
      const b = await provider.getBlock(n, true);
      if (!b || b.hash == null) break;
      const bn = BigInt(n);
      const rawTx = b.transactions;
      const txCount = Array.isArray(rawTx) ? rawTx.length : 0;
      const miner = (b.miner ?? ethers.ZeroAddress).toString().toLowerCase();
      items.push(
        serializeBlock({
          number: bn,
          hash: b.hash,
          parentHash: b.parentHash,
          timestamp: new Date(Number(b.timestamp) * 1000),
          gasUsed: b.gasUsed.toString(),
          gasLimit: b.gasLimit.toString(),
          miner,
          txCount,
        }),
      );
    }
    res.json({ items, rpcHead: head, source: "rpc" });
  } catch (e) {
    next(e);
  }
});

/** Must be after /blocks/list, /blocks/latest, /blocks/rpc-recent so :num does not eat those paths */
app.get("/api/v1/blocks/:num", async (req, res, next) => {
  try {
    const num = BigInt(req.params.num);
    const b = await prisma.block.findUnique({ where: { number: num } });
    if (!b) return res.status(404).json({ error: "Block not found" });
    const txs = await prisma.transaction.findMany({
      where: { blockNumber: num },
      orderBy: { transactionIndex: "asc" },
      include: { block: true },
    });
    res.json({ ...serializeBlock(b), transactions: txs.map((tx: TxWithBlock) => serializeTxFull(tx)) });
  } catch (e) {
    next(e);
  }
});

app.get("/api/v1/tx/:hash", async (req, res, next) => {
  try {
    const hash = req.params.hash.toLowerCase();
    const row = await prisma.transaction.findUnique({
      where: { hash },
      include: { block: true },
    });
    let payload: Record<string, unknown>;
    if (row) {
      payload = {
        ...serializeTxFull({
          hash: row.hash,
          blockNumber: row.blockNumber,
          blockHash: row.blockHash,
          from: row.from,
          to: row.to,
          value: row.value,
          gasPrice: row.gasPrice,
          gasUsed: row.gasUsed,
          status: row.status,
          input: row.input,
          nonce: row.nonce,
          transactionIndex: row.transactionIndex,
          block: row.block,
        }),
        indexed: true,
        pending: false,
      };
    } else {
      const live = await loadTxFromRpc(hash);
      if (!live) return res.status(404).json({ error: "Transaction not found on this RPC" });
      payload = live;
    }
    const enriched = await enrichTransactionDetail(prisma, provider, hash, payload);
    res.json(enriched);
  } catch (e) {
    next(e);
  }
});

/** Bytecode from RPC + optional standard ERC-20 ABI when bytecode matches common patterns (explorer-style auto data). */
app.get("/api/v1/contract/:addr/chain-meta", async (req, res, next) => {
  try {
    const addr = req.params.addr.toLowerCase();
    if (!ethers.isAddress(addr)) return res.status(400).json({ error: "Invalid address" });
    const code = await provider.getCode(addr);
    if (!code || code === "0x") {
      return res.json({
        isContract: false,
        bytecode: null,
        bytecodeLength: 0,
        contractName: null,
        symbol: null,
        isErc20Like: false,
        suggestedAbi: null,
      });
    }
    const erc20LikeBytecode = bytecodeLooksLikeErc20(code);
    const c = new ethers.Contract(addr, erc20NameAbi, provider);
    let contractName: string | null = null;
    let symbol: string | null = null;
    try {
      contractName = await c.name();
    } catch {
      /* not ERC-20 */
    }
    try {
      symbol = await c.symbol();
    } catch {
      /* optional */
    }
    let decimalsRespond = false;
    try {
      const cDec = new ethers.Contract(addr, ["function decimals() view returns (uint8)"], provider);
      await cDec.decimals();
      decimalsRespond = true;
    } catch {
      /* not a token interface at this address */
    }
    /* Proxies often fail the bytecode selector heuristic but still delegate name/symbol/decimals. */
    const erc20LikeRpc = contractName != null || symbol != null || decimalsRespond;
    const erc20Like = erc20LikeBytecode || erc20LikeRpc;
    const suggestedAbi = erc20Like ? getTokenExplorerAbiJson() : null;
    res.json({
      isContract: true,
      bytecode: code,
      bytecodeLength: code.length,
      contractName,
      symbol,
      isErc20Like: erc20Like,
      suggestedAbi,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Detect EIP-1967 / EIP-1167 / beacon / implementation() proxies (Etherscan / BscScan style).
 * Used by explorer for “Read as Proxy” / “Write as Proxy” tabs.
 */
app.get("/api/v1/contract/:addr/proxy", async (req, res, next) => {
  try {
    const addr = req.params.addr.toLowerCase();
    if (!ethers.isAddress(addr)) return res.status(400).json({ error: "Invalid address" });
    const info = await detectProxy(provider, addr);
    let implementationVerified = false;
    let implementationName: string | null = null;
    if (info.implementation) {
      const row = await prisma.contractVerification.findUnique({
        where: { address: info.implementation },
        select: { contractName: true },
      });
      if (row) {
        implementationVerified = true;
        implementationName = row.contractName;
      }
    }
    res.json({
      ...info,
      implementationVerified,
      implementationName,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Indexed deployment tx for an address (receipt.contractAddress). Used to auto-fill verify form creation input.
 * Re-index from deployment block if missing (factory-only deploys may not populate contractAddress on all nodes).
 */
app.get("/api/v1/contract/:addr/deploy-meta", async (req, res, next) => {
  try {
    const addr = req.params.addr.toLowerCase();
    if (!ethers.isAddress(addr)) return res.status(400).json({ error: "Invalid address" });
    const row = await prisma.transaction.findFirst({
      where: { deployedContractAddress: addr },
      orderBy: [{ blockNumber: "asc" }, { transactionIndex: "asc" }],
      select: { input: true, hash: true, blockNumber: true, from: true },
    });
    if (!row?.input || row.input === "0x") {
      return res.json({
        found: false,
        deployerAddress: row?.from?.toLowerCase() ?? null,
        message:
          "No indexed deployment transaction for this address. Run the indexer from the deployment block, or paste creation input manually. (Factory / CREATE2 deploys are often absent from receipt.contractAddress — manual paste is required.)",
      });
    }
    res.json({
      found: true,
      creationTxInput: row.input,
      deployTxHash: row.hash,
      blockNumber: row.blockNumber.toString(),
      deployerAddress: row.from.toLowerCase(),
      source: "indexer",
    });
  } catch (e) {
    next(e);
  }
});

/** Guess contract label for verify form: ERC-20 name() / symbol() via eth_call (like explorers auto-filling token name). */
app.get("/api/v1/contract/:addr/autofill", async (req, res, next) => {
  try {
    const addr = req.params.addr.toLowerCase();
    if (!ethers.isAddress(addr)) return res.status(400).json({ error: "Invalid address" });
    const code = await provider.getCode(addr);
    if (!code || code === "0x") {
      return res.json({ contractName: null, symbol: null, isContract: false });
    }
    const c = new ethers.Contract(addr, erc20NameAbi, provider);
    let contractName: string | null = null;
    let symbol: string | null = null;
    try {
      contractName = await c.name();
    } catch {
      /* not ERC-20 or reverts */
    }
    try {
      symbol = await c.symbol();
    } catch {
      /* optional */
    }
    res.json({ contractName, symbol, isContract: true });
  } catch (e) {
    next(e);
  }
});

/** Paginated list of verified contracts (BscScan-style directory). */
app.get("/api/v1/verified-contracts", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit)) || 25, 100);
    const offset = Math.max(parseInt(String(req.query.offset)) || 0, 0);
    const rawQ = String(req.query.q || "").trim();
    const q = rawQ.toLowerCase();

    let where: Prisma.ContractVerificationWhereInput = {};
    if (q) {
      if (/^0x[a-f0-9]{40}$/i.test(rawQ)) {
        where = { address: q };
      } else if (/^[a-f0-9]{40}$/i.test(rawQ)) {
        where = { address: `0x${q}` };
      } else {
        where = {
          OR: [
            { address: { contains: q.replace(/^0x/, "") } },
            { contractName: { contains: rawQ } },
          ],
        };
      }
    }

    const dayAgo = new Date(Date.now() - 86400000);
    const [items, total, verifiedTotal, verified24h, contractsDeployed] = await Promise.all([
      prisma.contractVerification.findMany({
        where,
        orderBy: { verifiedAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          address: true,
          contractName: true,
          compilerKind: true,
          compilerVersion: true,
          optimization: true,
          runs: true,
          openSourceLicense: true,
          verifiedAt: true,
        },
      }),
      prisma.contractVerification.count({ where }),
      prisma.contractVerification.count(),
      prisma.contractVerification.count({ where: { verifiedAt: { gte: dayAgo } } }),
      prisma.transaction.count({ where: { to: null } }),
    ]);

    const nativeSymbol = process.env.NATIVE_SYMBOL || "ECNA";
    const logos = await fetchLogoUrlsByAddress(
      prisma,
      items.map((r) => r.address),
    );
    const enriched = await Promise.all(
      items.map(async (row) => {
        let balanceWei = "0";
        try {
          balanceWei = (await provider.getBalance(row.address)).toString();
        } catch {
          /* RPC hiccup */
        }
        const txCount = await prisma.transaction.count({
          where: { OR: [{ from: row.address }, { to: row.address }] },
        });
        return {
          ...row,
          balanceWei,
          txCount,
          verifiedAt: row.verifiedAt.toISOString(),
          logoUrl: logos.get(row.address.toLowerCase()) ?? null,
        };
      }),
    );

    res.json({
      items: enriched,
      total,
      limit,
      offset,
      nativeSymbol,
      stats: {
        contractsDeployed,
        verifiedTotal,
        verified24h,
      },
    });
  } catch (e) {
    next(e);
  }
});

app.get("/api/v1/contract/:addr/verified", async (req, res, next) => {
  try {
    const addr = req.params.addr.toLowerCase();
    if (!ethers.isAddress(addr)) return res.status(400).json({ error: "Invalid address" });
    const row = await prisma.contractVerification.findUnique({ where: { address: addr } });
    if (!row) return res.status(404).json({ error: "Contract source not verified" });
    const deployedBytecodeRaw = await provider.getCode(addr);
    const deployedBytecode =
      deployedBytecodeRaw && deployedBytecodeRaw !== "0x" ? deployedBytecodeRaw.toLowerCase() : null;

    const contractCreationCode = row.creationTxInput?.trim() || null;
    const compilerCreationBytecode = row.compilerCreationBytecode?.trim() || null;

    let constructorArgsHex: string | null = null;
    let constructorArgsSplitOk: boolean | null = null;
    if (contractCreationCode && compilerCreationBytecode) {
      const split = splitConstructorArgsHex(contractCreationCode, compilerCreationBytecode);
      if (split != null) {
        constructorArgsHex = split;
        constructorArgsSplitOk = true;
      } else {
        constructorArgsSplitOk = false;
      }
    }

    const decodeResult =
      constructorArgsHex && constructorArgsHex !== "0x" ? decodeConstructorArgs(row.abi, constructorArgsHex) : null;

    let constructorArgsDecoded: { name: string; type: string; value: string }[] | null = null;
    let constructorDecodeNote: string | null = null;
    if (decodeResult?.kind === "decoded") {
      constructorArgsDecoded = decodeResult.rows;
    } else if (decodeResult?.kind === "failed") {
      constructorDecodeNote = "Could not ABI-decode constructor tail — check that compiler bytecode matches the start of the creation transaction.";
    } else if (decodeResult?.kind === "no-constructor") {
      if (constructorArgsHex && constructorArgsHex !== "0x") {
        constructorDecodeNote =
          "The ABI has no constructor parameters (e.g. upgradeable pattern). Trailing bytes are shown as raw hex only.";
      }
    }

    res.json({
      address: row.address,
      contractName: row.contractName,
      compilerKind: row.compilerKind,
      compilerVersion: row.compilerVersion,
      optimization: row.optimization,
      runs: row.runs,
      evmVersion: row.evmVersion,
      exactBytecodeMatch: row.exactBytecodeMatch,
      openSourceLicense: row.openSourceLicense,
      sourceCode: row.sourceCode,
      abi: row.abi,
      deployedBytecode,
      contractCreationCode,
      compilerCreationBytecode,
      constructorArgsHex,
      constructorArgsSplitOk,
      constructorArgsDecoded,
      constructorDecodeNote,
    });
  } catch (e) {
    next(e);
  }
});

app.get("/api/v1/address/:addr/transactions", async (req, res, next) => {
  try {
    const addr = req.params.addr.toLowerCase();
    const take = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const txs = await prisma.transaction.findMany({
      where: { OR: [{ from: addr }, { to: addr }] },
      orderBy: [{ blockNumber: "desc" }, { transactionIndex: "desc" }],
      take,
      include: { block: true },
    });
    res.json({ items: txs.map((tx: TxWithBlock) => serializeTxFull(tx)) });
  } catch (e) {
    next(e);
  }
});

app.get("/api/v1/tokens/transfers", async (req, res, next) => {
  try {
    const take = Math.min(parseInt(String(req.query.limit)) || 50, 200);
    const skip = Math.max(parseInt(String(req.query.offset)) || 0, 0);
    const token = (req.query.token as string | undefined)?.toLowerCase();
    const where = token ? { token } : {};
    const [rows, total] = await Promise.all([
      prisma.tokenTransfer.findMany({
        where,
        include: {
          transaction: { include: { block: true } },
        },
        orderBy: [{ transaction: { blockNumber: "desc" } }, { logIndex: "desc" }],
        take,
        skip,
      }),
      prisma.tokenTransfer.count({ where }),
    ]);
    const uniq = [...new Set(rows.map((r) => r.token.toLowerCase()))];
    const xferMeta = new Map<string, { decimals: number; symbol: string }>();
    await Promise.all(
      uniq.map(async (t) => {
        xferMeta.set(t, await fetchTokenMeta(provider, t));
      }),
    );
    const logos = await fetchLogoUrlsByAddress(prisma, uniq);
    const items = rows.map((r: TokenTransferRow) => {
      const m = xferMeta.get(r.token.toLowerCase()) ?? { decimals: 18, symbol: "" };
      return {
        txHash: r.txHash,
        logIndex: r.logIndex,
        token: r.token,
        from: r.from,
        to: r.to,
        value: r.value,
        blockNumber: r.transaction.blockNumber.toString(),
        timestamp: r.transaction.block.timestamp.toISOString(),
        gasUsed: r.transaction.gasUsed,
        gasPrice: r.transaction.gasPrice,
        feeWei: txFeeWei(r.transaction.gasUsed, r.transaction.gasPrice),
        action: methodLabel(r.transaction.input),
        tokenDecimals: m.decimals,
        tokenSymbol: m.symbol || null,
        logoUrl: logos.get(r.token.toLowerCase()) ?? null,
      };
    });
    res.json({ items, total, limit: take, offset: skip });
  } catch (e) {
    next(e);
  }
});

app.get("/api/v1/gas", async (_req, res, next) => {
  try {
    const latestBlock = await prisma.block.findFirst({
      orderBy: { number: "desc" },
      select: { number: true, gasUsed: true, timestamp: true },
    });
    const fee = await provider.getFeeData();
    res.json({
      latestIndexed: latestBlock
        ? {
            blockNum: latestBlock.number.toString(),
            gasUsed: latestBlock.gasUsed,
            timestamp: latestBlock.timestamp.toISOString(),
          }
        : null,
      live: {
        gasPrice: fee.gasPrice?.toString() ?? null,
        maxFeePerGas: fee.maxFeePerGas?.toString() ?? null,
        maxPriorityFeePerGas: fee.maxPriorityFeePerGas?.toString() ?? null,
      },
    });
  } catch (e) {
    next(e);
  }
});

app.get("/api/v1/search", searchHandler);

/** Etherscan-compatible contract source (read-only) */
app.get("/api/verify/etherscan", async (req, res, next) => {
  try {
    const mod = req.query.module as string;
    const action = req.query.action as string;
    if (mod === "contract" && action === "getsourcecode") {
      const address = String(req.query.address || "").toLowerCase();
      const row = await prisma.contractVerification.findUnique({ where: { address } });
      if (!row) {
        return res.json({
          status: "0",
          message: "NOTOK",
          result: [{ SourceCode: "", ABI: "Contract source code not verified" }],
        });
      }
      return res.json({
        status: "1",
        message: "OK",
        result: [
          {
            SourceCode: row.sourceCode,
            ABI: row.abi,
            ContractName: row.contractName,
            CompilerVersion: row.compilerVersion,
            OptimizationUsed: row.optimization ? "1" : "0",
            Runs: String(row.runs),
          },
        ],
      });
    }
    res.status(400).json({ error: "Unsupported module/action" });
  } catch (e) {
    next(e);
  }
});

app.get("/api/v1/contract/:addr/token-profile", getTokenProfileHandler);
app.get("/api/v1/contract/:addr/token-profile/sign-message", getProfileSignMessageHandler);
app.put("/api/v1/contract/:addr/token-profile", putTokenProfileHandler);

/** Hardhat verify posts here (multipart or JSON depending on plugin version) */
app.post("/api/verify/etherscan", verifyContractHandler);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err);
  res.status(500).json({ error: err.message });
});

const port = parseInt(process.env.PORT || "4000", 10);
const host = process.env.HOST || "0.0.0.0";

void (async () => {
  if (shouldNormalizeAddressesOnStart()) {
    try {
      await normalizeStoredAddresses(prisma);
      logger.debug("address columns normalized (lowercase)");
    } catch (e) {
      logger.warn({ err: e }, "normalizeStoredAddresses failed");
    }
  }
  app.listen(port, host, () => logger.info({ port, host }, "ECNASCAN API listening"));
})();

function serializeBlock(b: {
  number: bigint;
  hash: string;
  parentHash: string;
  timestamp: Date;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  txCount: number;
}) {
  return {
    number: b.number.toString(),
    hash: b.hash,
    parentHash: b.parentHash,
    timestamp: b.timestamp.toISOString(),
    gasUsed: b.gasUsed,
    gasLimit: b.gasLimit,
    miner: resolveDisplayMiner(b.miner, b.number),
    txCount: b.txCount,
  };
}

function txFeeWei(gasUsed: string | null, gasPrice: string | null): string | null {
  if (!gasUsed || !gasPrice) return null;
  try {
    return (BigInt(gasUsed) * BigInt(gasPrice)).toString();
  } catch {
    return null;
  }
}

function txAction(input: string, value: string): string {
  if (!input || input === "0x") {
    try {
      if (value && BigInt(value) > 0n) return "Transfer";
    } catch {
      /* fall through */
    }
    return "Transfer";
  }
  return methodLabel(input);
}

type TxPayload = {
  hash: string;
  blockNumber: bigint;
  blockHash: string;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string | null;
  gasUsed: string | null;
  status: number;
  input: string;
  nonce: number;
  transactionIndex?: number;
  block?: { timestamp: Date };
};

function serializeTxFull(tx: TxPayload) {
  return {
    hash: tx.hash,
    blockNumber: tx.blockNumber.toString(),
    blockHash: tx.blockHash,
    from: tx.from,
    to: tx.to,
    value: tx.value,
    gasPrice: tx.gasPrice,
    gasUsed: tx.gasUsed,
    status: tx.status,
    input: tx.input,
    nonce: tx.nonce,
    transactionIndex: tx.transactionIndex,
    feeWei: txFeeWei(tx.gasUsed, tx.gasPrice),
    action: txAction(tx.input, tx.value),
    timestamp: tx.block?.timestamp?.toISOString() ?? null,
  };
}

/** When the indexer has not stored this tx yet, read it live from the RPC (same node as deploy / MetaMask). */
async function loadTxFromRpc(hash: string): Promise<Record<string, unknown> | null> {
  const tx = await provider.getTransaction(hash);
  if (!tx) return null;
  const h = (tx.hash ?? hash).toLowerCase();
  const receipt = await provider.getTransactionReceipt(hash);
  if (!receipt) {
    return {
      ...serializeTxFull({
        hash: h,
        blockNumber: 0n,
        blockHash: "",
        from: (tx.from || "").toLowerCase(),
        to: tx.to ? tx.to.toLowerCase() : null,
        value: tx.value.toString(),
        gasPrice: tx.gasPrice?.toString() ?? null,
        gasUsed: null,
        status: 0,
        input: tx.data,
        nonce: Number(tx.nonce),
        transactionIndex: undefined,
      }),
      blockNumber: "pending",
      timestamp: null,
      feeWei: null,
      indexed: false,
      pending: true,
    };
  }
  const block = await provider.getBlock(receipt.blockNumber);
  return {
    ...serializeTxFull({
      hash: receipt.hash.toLowerCase(),
      blockNumber: BigInt(receipt.blockNumber),
      blockHash: receipt.blockHash,
      from: receipt.from.toLowerCase(),
      to: receipt.to ? receipt.to.toLowerCase() : null,
      value: tx.value.toString(),
      gasPrice: tx.gasPrice?.toString() ?? null,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status ?? 0,
      input: tx.data,
      nonce: Number(tx.nonce),
      transactionIndex: Number(receipt.index),
      block: block ? { timestamp: new Date(Number(block.timestamp) * 1000) } : undefined,
    }),
    indexed: false,
    pending: false,
  };
}
