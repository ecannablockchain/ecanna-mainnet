import { ethers, type Provider } from "ethers";

/** EIP-1967 implementation slot = bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1) */
export const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

/** EIP-1967 admin slot */
export const EIP1967_ADMIN_SLOT =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";

/** EIP-1967 beacon slot */
export const EIP1967_BEACON_SLOT =
  "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";

export type ProxyInfo = {
  isProxy: boolean;
  proxyType: string | null;
  implementation: string | null;
  admin: string | null;
  beacon: string | null;
};

function addressFromWord(word: string): string | null {
  if (!word || word === "0x" || /^0x0+$/i.test(word)) return null;
  const hex = word.replace(/^0x/i, "").padStart(64, "0").slice(-40);
  const addr = ethers.getAddress(`0x${hex}`);
  if (addr === ethers.ZeroAddress) return null;
  return addr.toLowerCase();
}

async function hasCode(provider: Provider, addr: string): Promise<boolean> {
  const code = await provider.getCode(addr);
  return Boolean(code && code !== "0x");
}

/** EIP-1167 minimal proxy: 363d3d373d3d3d363d73XXXXXXXX…5af43d82803e903d91602b57fd5bf3 */
function parseEip1167(bytecode: string): string | null {
  const h = bytecode.toLowerCase().replace(/^0x/, "");
  const prefix = "363d3d373d3d3d363d73";
  const suffix = "5af43d82803e903d91602b57fd5bf3";
  const i = h.indexOf(prefix);
  if (i < 0) return null;
  const start = i + prefix.length;
  const implHex = h.slice(start, start + 40);
  if (implHex.length !== 40) return null;
  const after = h.slice(start + 40, start + 40 + suffix.length);
  if (after !== suffix && !h.includes(suffix)) {
    // Some variants differ slightly after the address; still accept if address parses
    if (!/^[0-9a-f]{40}$/.test(implHex)) return null;
  }
  try {
    return ethers.getAddress(`0x${implHex}`).toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Detect proxy pattern (EIP-1967 / beacon / EIP-1167 / implementation()).
 * Returns implementation address when found.
 */
export async function detectProxy(provider: Provider, address: string): Promise<ProxyInfo> {
  const addr = address.toLowerCase();
  const empty: ProxyInfo = {
    isProxy: false,
    proxyType: null,
    implementation: null,
    admin: null,
    beacon: null,
  };

  if (!ethers.isAddress(addr)) return empty;

  const code = await provider.getCode(addr);
  if (!code || code === "0x") return empty;

  let admin: string | null = null;
  try {
    const adminWord = await provider.getStorage(addr, EIP1967_ADMIN_SLOT);
    admin = addressFromWord(adminWord);
  } catch {
    /* ignore */
  }

  // 1) EIP-1967 implementation slot
  try {
    const word = await provider.getStorage(addr, EIP1967_IMPLEMENTATION_SLOT);
    const impl = addressFromWord(word);
    if (impl && (await hasCode(provider, impl))) {
      return {
        isProxy: true,
        proxyType: "EIP-1967",
        implementation: impl,
        admin,
        beacon: null,
      };
    }
  } catch {
    /* ignore */
  }

  // 2) EIP-1967 beacon → beacon.implementation()
  try {
    const beaconWord = await provider.getStorage(addr, EIP1967_BEACON_SLOT);
    const beacon = addressFromWord(beaconWord);
    if (beacon && (await hasCode(provider, beacon))) {
      try {
        const c = new ethers.Contract(beacon, ["function implementation() view returns (address)"], provider);
        const implRaw = (await c.implementation()) as string;
        const impl = ethers.isAddress(implRaw) ? implRaw.toLowerCase() : null;
        if (impl && (await hasCode(provider, impl))) {
          return {
            isProxy: true,
            proxyType: "EIP-1967 Beacon",
            implementation: impl,
            admin,
            beacon,
          };
        }
      } catch {
        return {
          isProxy: true,
          proxyType: "EIP-1967 Beacon",
          implementation: null,
          admin,
          beacon,
        };
      }
    }
  } catch {
    /* ignore */
  }

  // 3) EIP-1167 minimal proxy
  const minImpl = parseEip1167(code);
  if (minImpl && (await hasCode(provider, minImpl))) {
    return {
      isProxy: true,
      proxyType: "EIP-1167 Minimal Proxy",
      implementation: minImpl,
      admin,
      beacon: null,
    };
  }

  // 4) Public implementation() getter (some custom proxies)
  try {
    const c = new ethers.Contract(addr, ["function implementation() view returns (address)"], provider);
    const implRaw = (await c.implementation()) as string;
    const impl = ethers.isAddress(implRaw) ? implRaw.toLowerCase() : null;
    if (impl && impl !== addr && (await hasCode(provider, impl))) {
      return {
        isProxy: true,
        proxyType: "implementation()",
        implementation: impl,
        admin,
        beacon: null,
      };
    }
  } catch {
    /* not a getter proxy */
  }

  // Admin slot alone is a weak signal — only mark proxy if we already found impl above
  return empty;
}
