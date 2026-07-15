/**
 * Persistent local EVM node (Foundry Anvil) — no Docker.
 * - Interval empty blocks: default 3s (--block-time); set ANVIL_BLOCK_TIME_SEC=0 for tx-only.
 * - Saves chain to .persistent-chain/anvil-state.json on clean exit (Ctrl+C).
 * - Large / TB-scale: never JSON.parse the whole file in Node (OOM). Above ANVIL_STATE_FULL_PARSE_MAX_MB
 *   (default 512) we use edge + substring checks and binary copy for .bak. Min disk-save interval scales
 *   with file size (ANVIL_STATE_INTERVAL_MAX_CAP_SEC, default 7d). Anvil itself must still handle the file.
 * - If the main state file is corrupt (e.g. crash mid-write), restores from anvil-state.json.bak.
 * - Mirror main → .bak after mtime/size stable (scaled up for huge files) + validity check.
 * - ANVIL_STATE_INTERVAL_SEC default 30 (dev-friendly); clamped upward when state file is large so each write can finish.
 *
 * Install Foundry (includes anvil): https://book.getfoundry.sh/getting-started/installation
 * Reset chain: npm run node:reset-persistent -w contracts
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function getFullReadMaxBytes() {
  const mb = parseInt(process.env.ANVIL_STATE_FULL_PARSE_MAX_MB || "512", 10);
  if (!Number.isFinite(mb) || mb < 1) return 512 * 1024 * 1024;
  return Math.min(mb, 2048) * 1024 * 1024;
}

/** Minimum safe periodic save interval from current on-disk state size (small chain = frequent saves). */
function recommendedMinStateIntervalSec(bytes) {
  const gb = bytes / 1024 ** 3;
  const cap = parseInt(process.env.ANVIL_STATE_INTERVAL_MAX_CAP_SEC || "604800", 10) || 604800;
  if (!Number.isFinite(gb) || gb <= 0) return 15;
  if (gb <= 0.15) return 15;
  const sec = Math.max(60, Math.round(gb * 600));
  return Math.min(cap, sec);
}

function scaleStableWaitMs(fileSizeBytes, baseMs) {
  const gb = fileSizeBytes / 1024 ** 3;
  if (!Number.isFinite(gb) || gb <= 0) return baseMs;
  const extra = Math.min(60_000, Math.floor(gb) * 5_000);
  return baseMs + extra;
}

function resolveAnvilBinary() {
  if (process.env.ANVIL_PATH) {
    const p = process.env.ANVIL_PATH;
    if (fs.existsSync(p)) return p;
    console.warn("[contracts] ANVIL_PATH set but file not found:", p);
  }
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) {
    const candidates = [
      path.join(home, ".foundry", "bin", "anvil.exe"),
      path.join(home, ".foundry", "bin", "anvil"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  }
  return "anvil";
}

/** @returns {object | null} */
function parseStateJson(raw) {
  try {
    const o = JSON.parse(raw);
    if (
      o &&
      typeof o === "object" &&
      o.block &&
      typeof o.block === "object" &&
      o.accounts &&
      typeof o.accounts === "object"
    ) {
      return o;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Structural check without loading TB into RAM (Anvil state shape). */
function isValidStateJsonStructureLarge(filePath) {
  let fd;
  try {
    const st = fs.statSync(filePath);
    const size = st.size;
    if (size < 24) return false;
    fd = fs.openSync(filePath, "r");
    const headLen = Math.min(4 * 1024 * 1024, size);
    const head = Buffer.alloc(headLen);
    fs.readSync(fd, head, 0, headLen, 0);
    let off = 0;
    if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) off = 3;
    if (head[off] !== 0x7b) return false;
    const hs = head.toString("utf8");
    if (!hs.includes('"block"') || !hs.includes('"accounts"')) return false;

    const tailLen = Math.min(8192, size);
    const tail = Buffer.alloc(tailLen);
    fs.readSync(fd, tail, 0, tailLen, size - tailLen);
    let i = tail.length - 1;
    while (i >= 0 && (tail[i] === 10 || tail[i] === 13 || tail[i] === 32 || tail[i] === 9)) i--;
    return i >= 0 && tail[i] === 0x7d;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch (_) {
        /* ignore */
      }
    }
  }
}

/** @returns {boolean} */
function isValidStateJson(filePath) {
  try {
    const st = fs.statSync(filePath);
    const maxBytes = getFullReadMaxBytes();
    if (st.size > maxBytes) return isValidStateJsonStructureLarge(filePath);
    const raw = fs.readFileSync(filePath, "utf8");
    return parseStateJson(raw) !== null;
  } catch {
    return false;
  }
}

function blockTipLabel(o) {
  try {
    const n = o?.block?.number;
    if (typeof n === "string" && /^0x[0-9a-f]+$/i.test(n)) {
      return String(parseInt(n, 16));
    }
  } catch (_) {
    /* ignore */
  }
  return "?";
}

/** Block tip from first ~16MB only (TB-safe). */
function blockTipFromStateFile(filePath) {
  try {
    const st = fs.statSync(filePath);
    const maxBytes = getFullReadMaxBytes();
    if (st.size <= maxBytes) {
      const raw = fs.readFileSync(filePath, "utf8");
      const o = parseStateJson(raw);
      return o ? blockTipLabel(o) : "?";
    }
    const fd = fs.openSync(filePath, "r");
    try {
      const n = Math.min(16 * 1024 * 1024, st.size);
      const buf = Buffer.alloc(n);
      fs.readSync(fd, buf, 0, n, 0);
      const s = buf.toString("utf8");
      const m = /"block"\s*:\s*\{[\s\S]*?"number"\s*:\s*"(0x[0-9a-f]+)"/i.exec(s);
      if (m) return String(parseInt(m[1], 16));
    } finally {
      fs.closeSync(fd);
    }
  } catch (_) {
    /* ignore */
  }
  return "?";
}

/** Replace target with utf8 content atomically (Windows cannot rename over an existing file). */
function writeFileAtomic(targetPath, utf8Content) {
  const tmp = targetPath + ".tmp." + process.pid + "." + Date.now();
  fs.writeFileSync(tmp, utf8Content, "utf8");
  try {
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
  } catch (e) {
    try {
      fs.unlinkSync(tmp);
    } catch (_) {
      /* ignore */
    }
    throw e;
  }
  fs.renameSync(tmp, targetPath);
}

function copyFileAtomic(srcPath, destPath) {
  const tmp = destPath + ".tmp." + process.pid + "." + Date.now();
  fs.copyFileSync(srcPath, tmp);
  try {
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
  } catch (e) {
    try {
      fs.unlinkSync(tmp);
    } catch (_) {
      /* ignore */
    }
    throw e;
  }
  fs.renameSync(tmp, destPath);
}

function logBackupTip(filePath, label) {
  try {
    const tip = blockTipFromStateFile(filePath);
    console.warn(`[contracts] ${label} chain tip ≈ block #${tip}`);
  } catch (_) {
    /* ignore */
  }
}

function mirrorMainToBakIfValid() {
  if (!fs.existsSync(stateFile)) return false;
  const st = fs.statSync(stateFile);
  const maxBytes = getFullReadMaxBytes();
  if (st.size > maxBytes) {
    if (!isValidStateJsonStructureLarge(stateFile)) return false;
    copyFileAtomic(stateFile, bakFile);
    return true;
  }
  const raw = fs.readFileSync(stateFile, "utf8");
  if (!parseStateJson(raw)) return false;
  writeFileAtomic(bakFile, raw);
  return true;
}

const dir = path.join(__dirname, "..", ".persistent-chain");
const stateFile = path.join(dir, "anvil-state.json");
const bakFile = path.join(dir, "anvil-state.json.bak");
fs.mkdirSync(dir, { recursive: true });

if (!fs.existsSync(stateFile) && fs.existsSync(bakFile) && isValidStateJson(bakFile)) {
  fs.copyFileSync(bakFile, stateFile);
  console.warn(
    "[contracts] anvil-state.json was missing; restored from anvil-state.json.bak (resume from last backup)."
  );
}

if (fs.existsSync(stateFile) && !isValidStateJson(stateFile)) {
  const corruptName = `anvil-state.json.corrupt.${Date.now()}`;
  const corruptPath = path.join(dir, corruptName);
  try {
    fs.renameSync(stateFile, corruptPath);
    console.warn(
      "[contracts] Main state file was invalid JSON (often truncated after a crash). Renamed to:",
      corruptName
    );
  } catch (e) {
    try {
      fs.unlinkSync(stateFile);
    } catch (_) {
      /* ignore */
    }
    console.warn("[contracts] Removed unreadable main state file.");
  }
  if (fs.existsSync(bakFile) && isValidStateJson(bakFile)) {
    fs.copyFileSync(bakFile, stateFile);
    console.warn(
      "[contracts] Restored chain from anvil-state.json.bak (mirrored snapshot — see block tip below)."
    );
    logBackupTip(bakFile, "Restored backup");
  } else {
    console.warn(
      "[contracts] No valid backup yet — starting a new chain from genesis. Use periodic state saves + clean exit when possible."
    );
  }
}

const hasValidStateFile = fs.existsSync(stateFile) && isValidStateJson(stateFile);
if (hasValidStateFile) {
  try {
    mirrorMainToBakIfValid();
  } catch (e) {
    console.warn("[contracts] Could not refresh anvil-state.json.bak:", e.message);
  }
  const kb = Math.round(fs.statSync(stateFile).size / 1024);
  const gb = (fs.statSync(stateFile).size / (1024 * 1024 * 1024)).toFixed(2);
  console.log("[contracts] Resuming chain from", stateFile, `(${kb} KB, ${gb} GB). Block height continues from last save.`);
  if (fs.statSync(stateFile).size > getFullReadMaxBytes()) {
    console.warn(
      "[contracts] State larger than ANVIL_STATE_FULL_PARSE_MAX_MB — using structural checks + binary copy only (TB-safe)."
    );
  }
} else {
  console.log("[contracts] No valid saved state — starting from genesis. State will be saved on exit and periodically.");
}

console.warn(
  "[contracts] Stop with Ctrl+C in this window (graceful Anvil shutdown) — do not only close the terminal X, or state may not flush. Saves also run every ANVIL_STATE_INTERVAL_SEC.",
);

const mnemonic =
  process.env.ANVIL_MNEMONIC ||
  "test test test test test test test test test test test junk";

const args = [
  "--chain-id",
  process.env.ANVIL_CHAIN_ID || "4111",
  "--port",
  process.env.ANVIL_PORT || "8545",
  "--host",
  process.env.ANVIL_HOST || "50.28.84.113",
  "--hardfork",
  process.env.ANVIL_HARDFORK || "paris",
  "--mnemonic",
  mnemonic,
  "--state",
  stateFile,
  "--preserve-historical-states",
];

const rawBt = process.env.ANVIL_BLOCK_TIME_SEC;
const blockTime = rawBt === undefined || rawBt === "" ? "3" : rawBt;
if (blockTime !== "0") {
  args.push("--block-time", blockTime);
}

const rawInterval = process.env.ANVIL_STATE_INTERVAL_SEC;
/** Default 30s so short sessions still hit disk before you stop; huge state files get clamped up automatically. */
let stateIntervalSec =
  rawInterval === undefined || rawInterval === "" ? "30" : rawInterval;

if (stateIntervalSec !== "0" && fs.existsSync(stateFile)) {
  let bytes = 0;
  try {
    bytes = fs.statSync(stateFile).size;
  } catch (_) {
    /* ignore */
  }
  const minSec = recommendedMinStateIntervalSec(bytes);
  const want = parseInt(stateIntervalSec, 10);
  if (Number.isFinite(want) && want < minSec) {
    const gb = (bytes / (1024 * 1024 * 1024)).toFixed(2);
    console.warn(
      `[contracts] State ~${gb}GB — ANVIL_STATE_INTERVAL_SEC=${want}s is below safe minimum ${minSec}s (each disk write must finish); clamping.`
    );
    stateIntervalSec = String(minSec);
  }
}

if (stateIntervalSec !== "0") {
  args.push("--state-interval", stateIntervalSec);
  if (rawInterval === undefined || rawInterval === "") {
    console.log(
      "[contracts] State file disk save every",
      stateIntervalSec + "s",
      "(default; override ANVIL_STATE_INTERVAL_SEC). Empty blocks still every",
      blockTime + "s.",
      "Interval scales up with state size (cap ANVIL_STATE_INTERVAL_MAX_CAP_SEC)."
    );
  } else {
    console.log(
      "[contracts] State file disk save every",
      stateIntervalSec + "s — set ANVIL_STATE_INTERVAL_SEC=0 for exit-only saves."
    );
  }
}

const anvilBin = resolveAnvilBinary();
const child = spawn(anvilBin, args, {
  stdio: "inherit",
  shell: false,
});

const bakMirrorTimer = startBakMirrorTimer();

/** Let Anvil handle Ctrl+C so it can flush state; then our "exit" handler runs backup. */
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    try {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill(sig);
      }
    } catch (_) {
      process.exit(1);
    }
  });
}

function snapshotBackupIfValid() {
  try {
    mirrorMainToBakIfValid();
  } catch (_) {
    /* ignore */
  }
}

/**
 * Mirror main → .bak after each complete Anvil write (stable mtime/size, then validity).
 */
function startBakMirrorTimer() {
  const rawDisable = (process.env.ANVIL_BAK_REFRESH_MS ?? "").trim();
  if (rawDisable === "0") {
    console.warn(
      "[contracts] ANVIL_BAK_REFRESH_MS=0: .bak is not mirrored while running — unsafe if you close the terminal without Ctrl+C."
    );
    return null;
  }
  const pollMs = Math.max(
    250,
    Number.parseInt(process.env.ANVIL_BAK_POLL_MS || "500", 10) || 500
  );
  const baseStableMs = Math.max(
    500,
    Number.parseInt(process.env.ANVIL_BAK_STABLE_MS || "4000", 10) || 4000
  );
  console.log(
    "[contracts] Mirroring anvil-state.json → .bak when stable + valid (poll",
    pollMs + "ms;",
    "ANVIL_BAK_STABLE_MS base",
    baseStableMs + "ms, grows with state size; TB uses binary copy)."
  );

  let lastBackedUpKey = "";
  let stableKey = null;
  let stableSince = 0;
  let lastFailLog = 0;

  return setInterval(() => {
    try {
      if (!fs.existsSync(stateFile)) return;
      const st = fs.statSync(stateFile);
      const key = `${st.mtimeMs}-${st.size}`;
      if (key === lastBackedUpKey) return;

      const needStableMs = scaleStableWaitMs(st.size, baseStableMs);

      if (key !== stableKey) {
        stableKey = key;
        stableSince = Date.now();
        return;
      }
      if (Date.now() - stableSince < needStableMs) return;

      const maxBytes = getFullReadMaxBytes();
      let ok = false;
      if (st.size > maxBytes) {
        ok = isValidStateJsonStructureLarge(stateFile);
        if (ok) copyFileAtomic(stateFile, bakFile);
      } else {
        const raw = fs.readFileSync(stateFile, "utf8");
        ok = parseStateJson(raw) !== null;
        if (ok) writeFileAtomic(bakFile, raw);
      }

      if (!ok) {
        const now = Date.now();
        if (now - lastFailLog > 60_000) {
          console.warn(
            "[contracts] State file stable but not valid yet (or corrupt). Increase ANVIL_STATE_INTERVAL_SEC if this repeats (required for huge state files)."
          );
          lastFailLog = now;
        }
        stableSince = Date.now();
        return;
      }
      lastBackedUpKey = key;
      stableKey = null;
      stableSince = 0;
    } catch (_) {
      /* Anvil may be writing */
    }
  }, pollMs);
}

child.on("error", (err) => {
  if (err && err.code === "ENOENT") {
    console.error(
      "\n[contracts] `anvil` not found. Persistent chain needs Foundry (Anvil) on PATH:\n" +
        "  https://book.getfoundry.sh/getting-started/installation\n" +
        "Windows: after install, ensure %USERPROFILE%\\.foundry\\bin is on PATH (new terminal).\n" +
        "Or set ANVIL_PATH=C:\\Users\\YOU\\.foundry\\bin\\anvil.exe\n" +
        "Without Anvil, use: npm run local:node  (Hardhat; chain resets when you stop it)\n" +
        "Then: npm run node:persistent -w contracts\n"
    );
    process.exit(1);
  }
  throw err;
});

child.on("exit", (code, signal) => {
  if (bakMirrorTimer) clearInterval(bakMirrorTimer);
  snapshotBackupIfValid();
  if (signal) process.exit(0);
  process.exit(code ?? 1);
});
