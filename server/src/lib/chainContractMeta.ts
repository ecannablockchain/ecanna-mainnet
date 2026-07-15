import { Interface } from "ethers";

/** Common ERC-20 function selectors (first 4 bytes) often embedded in runtime bytecode. */
const ERC20_SELECTOR_HITS = [
  "70a08231", // balanceOf(address)
  "a9059cbb", // transfer(address,uint256)
  "095ea7b3", // approve(address,uint256)
  "18160ddd", // totalSupply()
  "313ce567", // decimals()
  "06fdde03", // name()
  "95d89b41", // symbol()
  "dd62ed3e", // allowance(address,address)
  "23b872dd", // transferFrom(address,address,uint256)
];

const MIN_SELECTOR_HITS = 4;

const ERC20_HUMAN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
];

/**
 * ERC-20 plus common OpenZeppelin-style token extras (mint/burn, AccessControl, UUPS).
 * Used for explorer auto-suggested ABI: extra entries simply revert on contracts that do not implement them.
 */
const TOKEN_EXPLORER_EXTRA_ABI = [
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
  "function burnFrom(address account, uint256 amount)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function getRoleAdmin(bytes32 role) view returns (bytes32)",
  "function grantRole(bytes32 role, address account)",
  "function revokeRole(bytes32 role, address account)",
  "function renounceRole(bytes32 role, address callerConfirmation)",
  "function MINTER_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
  "function upgradeToAndCall(address newImplementation, bytes data)",
];

let cachedErc20AbiJson: string | null = null;
let cachedTokenExplorerAbiJson: string | null = null;

export function getStandardErc20AbiJson(): string {
  if (cachedErc20AbiJson) return cachedErc20AbiJson;
  const iface = new Interface(ERC20_HUMAN_ABI);
  cachedErc20AbiJson = iface.formatJson();
  return cachedErc20AbiJson;
}

/** Suggested ABI for verify form + Read/Write when chain looks like a (possibly proxy) OZ-style token. */
export function getTokenExplorerAbiJson(): string {
  if (cachedTokenExplorerAbiJson) return cachedTokenExplorerAbiJson;
  const iface = new Interface([...ERC20_HUMAN_ABI, ...TOKEN_EXPLORER_EXTRA_ABI]);
  cachedTokenExplorerAbiJson = iface.formatJson();
  return cachedTokenExplorerAbiJson;
}

export function bytecodeLooksLikeErc20(bytecode: string): boolean {
  const h = bytecode.toLowerCase().replace(/^0x/, "");
  if (h.length < 100) return false;
  let n = 0;
  for (const s of ERC20_SELECTOR_HITS) {
    if (h.includes(s)) n++;
  }
  return n >= MIN_SELECTOR_HITS;
}
