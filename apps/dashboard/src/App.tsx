import { useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { formatUnits, isAddress, parseUnits } from 'viem';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSun,
  faMoon,
  faCircleHalfStroke,
  faShieldAlt,
  faCheck,
  faCopy,
  faCoins,
  faGasPump,
  faPaperPlane,
  faWallet,
  faCode,
  faListUl,
  faTerminal,
  faFileCode,
  faFileSignature,
} from '@fortawesome/free-solid-svg-icons';

import {
  useAccount,
  useBalance,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { erc20Abi } from './erc20';
import { parseAbiFlexible } from './abi';
import { BrandedLoader } from './components/BrandedLoader';
import { token20Label } from './chainBranding';

const apiBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
/** Dev: empty = relative URLs, Vite proxies /api and /health. Prod: set VITE_API_URL. */
function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return apiBase ? `${apiBase}${p}` : p;
}
const ENV_EXPLORER = (
  import.meta.env.VITE_EXPLORER_URL || 'https://explorer.ecnascan.com'
).replace(/\/$/, '');

/** Works with Vite over HTTP (non-secure origin) where Clipboard API may be blocked. */
async function copyToClipboard(text: string): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard?.writeText &&
    typeof window !== 'undefined' &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

type ApiConfig = {
  pethToken: string | null;
  treasuryAddress: string | null;
  explorerUrl?: string;
  rpcUrl?: string;
  chainId?: number;
};

type TxRow = {
  hash: string;
  blockNumber: string;
  from: string;
  to: string | null;
  value: string;
  status: number;
};

export default function App() {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (val: string) => {
    const ok = await copyToClipboard(val);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const native = useBalance({ address });
  const [remoteCfg, setRemoteCfg] = useState<ApiConfig | null>(null);
  const [apiFailed, setApiFailed] = useState(false);
  const [cfgLoading, setCfgLoading] = useState(true);
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [history, setHistory] = useState<TxRow[]>([]);
  const [contractAddr, setContractAddr] = useState('');
  const [abiJson, setAbiJson] = useState('');
  const [fnName, setFnName] = useState('balanceOf');
  const [fnArgs, setFnArgs] = useState(
    '["0x0000000000000000000000000000000000000000"]'
  );
  const [readResult, setReadResult] = useState<string | null>(null);
  const [readErr, setReadErr] = useState<string | null>(null);
  const [metaMaskTokenMsg, setMetaMaskTokenMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(apiUrl('/api/v1/config'))
      .then((r) => {
        if (!r.ok) throw new Error('bad status');
        return r.json();
      })
      .then((j: ApiConfig) => setRemoteCfg(j))
      .catch(() => {
        setRemoteCfg(null);
        setApiFailed(true);
      })
      .finally(() => setCfgLoading(false));
  }, []);

  const pethAddr = useMemo(() => {
    const env = (import.meta.env.VITE_PETH_TOKEN || '').trim();
    if (env && isAddress(env)) return env as `0x${string}`;
    const r = remoteCfg?.pethToken?.trim();
    if (r && isAddress(r)) return r as `0x${string}`;
    return undefined;
  }, [remoteCfg]);

  const treasuryAddr = useMemo(() => {
    const env = (import.meta.env.VITE_TREASURY_ADDRESS || '').trim();
    if (env && isAddress(env)) return env as `0x${string}`;
    const r = remoteCfg?.treasuryAddress?.trim();
    if (r && isAddress(r)) return r as `0x${string}`;
    return undefined;
  }, [remoteCfg]);

  const explorerBase = (remoteCfg?.explorerUrl || ENV_EXPLORER).replace(
    /\/$/,
    ''
  );

  const tokenEnabled = !!pethAddr;

  const decimals = useReadContract({
    address: pethAddr,
    abi: erc20Abi,
    functionName: 'decimals',
    query: { enabled: tokenEnabled },
  });

  const symbol = useReadContract({
    address: pethAddr,
    abi: erc20Abi,
    functionName: 'symbol',
    query: { enabled: tokenEnabled },
  });

  const totalSupply = useReadContract({
    address: pethAddr,
    abi: erc20Abi,
    functionName: 'totalSupply',
    query: { enabled: tokenEnabled },
  });

  const tokenBal = useReadContract({
    address: pethAddr,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: tokenEnabled && !!address },
  });

  const treasuryTokenBal = useReadContract({
    address: pethAddr,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: treasuryAddr ? [treasuryAddr] : undefined,
    query: { enabled: tokenEnabled && !!treasuryAddr },
  });

  const treasuryNative = useBalance({ address: treasuryAddr });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const canSend =
    tokenEnabled &&
    !!pethAddr &&
    address &&
    to &&
    isAddress(to) &&
    amount.length > 0 &&
    decimals.data !== undefined;

  const send = () => {
    if (!canSend || !decimals.data || !pethAddr) return;
    const value = parseUnits(amount, Number(decimals.data));
    writeContract({
      address: pethAddr,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [to as `0x${string}`, value],
    });
  };

  useEffect(() => {
    if (!address) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    fetch(apiUrl(`/api/v1/address/${address}/transactions?limit=25`))
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.items) setHistory(j.items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address, receipt]);

  const customAbi = useMemo(() => parseAbiFlexible(abiJson), [abiJson]);

  const {
    writeContract: writeCustom,
    data: hash2,
    isPending: pending2,
    error: err2,
  } = useWriteContract();
  const receipt2 = useWaitForTransactionReceipt({ hash: hash2 });

  const readCustom = async () => {
    setReadErr(null);
    setReadResult(null);
    if (
      !publicClient ||
      !contractAddr ||
      !isAddress(contractAddr) ||
      !customAbi
    ) {
      setReadErr('Need valid contract and ABI');
      return;
    }
    try {
      const args = JSON.parse(fnArgs) as unknown[];
      const out = await publicClient.readContract({
        address: contractAddr as `0x${string}`,
        abi: customAbi,
        functionName: fnName as never,
        args: args as never,
      });
      setReadResult(String(out));
    } catch (e) {
      setReadErr(e instanceof Error ? e.message : 'Read failed');
    }
  };

  const writeCustomFn = () => {
    if (!contractAddr || !isAddress(contractAddr) || !customAbi) return;
    const args = JSON.parse(fnArgs) as unknown[];
    writeCustom({
      address: contractAddr as `0x${string}`,
      abi: customAbi,
      functionName: fnName,
      args: args as never,
    });
  };

  useEffect(() => {
    if (receipt2) void receipt2;
  }, [receipt2]);

  const isTreasuryWallet =
    address &&
    treasuryAddr &&
    address.toLowerCase() === treasuryAddr.toLowerCase();

  const addPethToMetaMask = async () => {
    setMetaMaskTokenMsg(null);
    if (!pethAddr || decimals.data === undefined) {
      setMetaMaskTokenMsg('Token address or decimals not loaded yet.');
      return;
    }
    const ethereum = (
      window as unknown as {
        ethereum?: {
          request: (args: {
            method: string;
            params?: unknown;
          }) => Promise<unknown>;
        };
      }
    ).ethereum;
    if (!ethereum?.request) {
      setMetaMaskTokenMsg(
        'No browser wallet found. Use MetaMask in Chrome/Brave.'
      );
      return;
    }
    try {
      const ok = await ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: pethAddr,
            symbol: (symbol.data as string) || 'ECNA',
            decimals: Number(decimals.data),
          },
        },
      });
      setMetaMaskTokenMsg(
        ok ? 'Token added — open MetaMask → Assets.' : 'Request finished.'
      );
    } catch (e) {
      setMetaMaskTokenMsg(
        e instanceof Error ? e.message : 'Cancelled or failed'
      );
    }
  };

  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
    document.documentElement.setAttribute(
      'data-bs-theme',
      saved === 'light' ? 'light' : 'dark'
    );
  }, []);

  const changeTheme = (t: string) => {
    setTheme(t);
    localStorage.setItem('theme', t);
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.setAttribute(
      'data-bs-theme',
      t === 'light' ? 'light' : 'dark'
    );
    setOpen(false);
  };

  const statPlaceholder = (
    <span
      className="placeholder placeholder-wave rounded d-inline-block"
      style={{ minWidth: '7rem', minHeight: '1.35rem', verticalAlign: 'middle' }}
    />
  );

  if (cfgLoading) {
    return <BrandedLoader subtitle="Loading dashboard…" />;
  }

  return (
    <div className="shell-div">

 
      {/* <header className="topbar">
        <div className="brand">
          <h1>ECNASCAN</h1>
          <span>ECNA — wallet + treasury + API</span>
        </div>
        <ConnectButton />
      </header> */}

      {/* Navbar Section */}
      <header className="navbar  glass-header">
        <div className="container-fluid header-container">
          <div className="navbar-brand m-0 d-flex align-items-center gap-2">
             <img
               src="/logo.png"
               alt="ECNA"
               className="logo-image"
               draggable={false}
             />
            {/* <span className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>
              ECNASCAN
            </span> */}
          </div>
          <div className="connect-wrp">
           <div className='connect-button'>
             <ConnectButton />
           </div>
            <div className="dropdownlang">
              <button
                onClick={() => setOpen(!open)}
                className="btn btn-theme-toggle rounded-3 shadow-sm border d-flex align-items-center justify-content-center"
                style={{ width: '42px', height: '42px' }}
              >
                <FontAwesomeIcon
                  icon={
                    theme === 'light'
                      ? faSun
                      : theme === 'dim'
                        ? faCircleHalfStroke
                        : faMoon
                  }
                />
              </button>
              {open && (
                <ul className="dropdown-menu dropdown-menu-start  show shadow-lg border mt-2 animate-fade-in">
                  {['light', 'dim', 'dark'].map((t) => (
                    <li key={t}>
                      <button
                        onClick={() => changeTheme(t)}
                        className={`dropdown-item-list ${theme === t ? 'active' : ''}`}
                      >
                        <span>
                          <FontAwesomeIcon
                            icon={
                              t === 'light'
                                ? faSun
                                : t === 'dim'
                                  ? faCircleHalfStroke
                                  : faMoon
                            }
                            className="me-2"
                          />{' '}
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </span>
                        {theme === t && <span>✔</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container-fluid">
        <div className="row">



          
      {apiFailed ? (
        <>
      <div className='col-md-12 mb-4 '>
            <div className="alert alert-warning shadow-sm border-warning rounded-3 mb-0 animate-fade-in">
            <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
            <p className="muted">
              <strong>API offline — balances will not load.</strong> From repo
              root run <code className="mono">npm run local:stack</code> (or
              only <code className="mono">npm run dev -w server</code>). Check{' '}
              <a href={apiUrl('/health')}>{apiBase || '/health (proxied)'}</a> —
              optional <code className="mono">VITE_API_URL</code> in{' '}
              <code className="mono">apps/dashboard/.env</code>.
            </p>
          </div>
      </div>
        </>
      ) : null}




          <motion.div
            className="col-12 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ gridColumn: '1 / -1' }} // पुरानी ग्रिड सेटिंग बरकरार रखी
          >
            <div className="card custom-ux-card border-0  rounded-3 overflow-hidden shadow-lg glass-card p-4 p-md-5">
              <div className="glow-circle top-right"></div>
              <div className="glow-circle bottom-left"></div>

              <div className="position-relative">
                {/* Header Section */}
                <div className="row align-items-center mb-4">
                  <div className="col-md-8">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="badge-live">LIVE</span>
                      <h6 className="text-uppercase tracking-wider text-primary fw-bold m-0 small">
                        Genesis Network
                      </h6>
                    </div>
                    <h2 className="display-6 fw-black ux-gradient-text mb-0">
                      Treasury wallet (genesis ECNA)
                    </h2>
                  </div>
                  <div className="col-md-4 text-md-end mt-3 mt-md-0">
                    <div className="shield-box d-inline-flex align-items-center gap-2 p-2 px-3 rounded-pill bg-success  text-white  border border-success">
                      <FontAwesomeIcon icon={faShieldAlt} />
                      <span className="small fw-bold">Verified Genesis</span>
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <p className="ux-description mb-4 opacity-75">
                  On the{' '}
                  <span className="highlight text-primary fw-bold">
                    ECNA L1 Ledger
                  </span>{' '}
                  (<code className="mono">ecnachain/</code>),
                  <strong> 1 Crore (10,000,000) ECNA</strong> is pre-minted in genesis
                  to this treasury address. Import that key in MetaMask (chain
                  ID <strong>{Number(import.meta.env.VITE_CHAIN_ID || 4111)}</strong>).
                </p>

                {/* Address Bar */}
                <div className="modern-address-bar mb-2 p-3 rounded-3 bg-black bg-opacity-25 border border-white border-opacity-10">
                  <div className="label small fw-bold opacity-50 mb-2">
                    TREASURY ADDRESS
                  </div>
                  <div className="d-flex justify-content-between align-items-center gap-3">
                    <div className="address-text font-monospace text-truncate text-primary">
                      {treasuryAddr
                        ? treasuryAddr
                        : 'Set TREASURY_ADDRESS or deploy with contracts/.env'}
                    </div>
                    <div className="d-flex gap-2">
                      {treasuryAddr && (
                        <button
                          type="button"
                          className={`ux-copy-btn btn ${copied ? 'btn-success' : 'btn-primary'} rounded-3 px-3 fw-bold`}
                          onClick={() => void handleCopy(treasuryAddr)}
                        >
                          <FontAwesomeIcon
                            icon={copied ? faCheck : faCopy}
                            className="me-2"
                          />
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Explorer Link */}
                <div className="mb-4 ps-2">
                  <a
                    href={`${explorerBase}/address/${treasuryAddr ?? ''}`}
                    target="_blank"
                    rel="noreferrer"
                    className="small text-decoration-none opacity-50 hover-opacity-100"
                  >
                    Open in block explorer →
                  </a>
                </div>

                {/* Stats Grid */}
                {tokenEnabled && decimals.data !== undefined ? (
                  <div className="row g-4 mt-2">
                    {[
                      {
                        label: 'Total Supply',
                        val: totalSupply.data,
                        icon: faCoins,
                        color: 'blue',
                        unit: symbol.data ?? 'TOKEN',
                      },
                      {
                        label: 'Treasury Vault',
                        val: treasuryTokenBal.data,
                        icon: faShieldAlt,
                        color: 'purple',
                        unit: symbol.data ?? 'TOKEN',
                      },
                      {
                        label: 'Native Balance',
                        val: treasuryNative.data?.value,
                        icon: faGasPump,
                        color: 'green',
                        isNative: true,
                        unit: 'ECNA',
                      },
                    ].map((item, index) => (
                      <div className="col-12 col-md-4" key={index}>
                        <div
                          className={`ux-stat-card p-3 rounded-3 border-stat-${item.color} glass-card`}
                        >
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className={`stat-icon rounded-3 bg-${item.color}-soft text-${item.color} p-2`}
                              style={{
                                width: '45px',
                                height: '45px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <FontAwesomeIcon icon={item.icon} />
                            </div>
                            <div>
                              <div className="stat-label small opacity-50 fw-bold">
                                {item.label}
                              </div>
                              <div className="stat-value fw-black fs-5 text-truncate">
                                {item.val !== undefined
                                  ? `${formatUnits(item.val, item.isNative ? 18 : Number(decimals.data))} ${item.unit}`
                                  : statPlaceholder}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-3 bg-warning bg-opacity-10 border border-warning border-opacity-25 text-warning small">
                    Deploy token then refresh — API will expose contract
                    address, or set VITE_PETH_TOKEN.
                  </div>
                )}

                {/* Admin Banner */}
                {isTreasuryWallet && (
                  <div className="ux-admin-banner mt-4 p-3 rounded-3 bg-info bg-opacity-10 text-info border border-info border-opacity-25 fw-bold text-center">
                    <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                    Connected as Treasury Administrator — you can transfer
                    tokens and pay gas (ECNA).
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          <motion.div
            className="col-12 col-lg-6 mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="card glass-card border-0 rounded-3 shadow-lg h-100 p-4 p-md-5">
              {/* Header */}
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="bg-primary   rounded-3 text-white p-2 width-span">
                  <FontAwesomeIcon icon={faWallet} />
                </div>
                <h4 className="fw-black m-0">Your Wallet Balances</h4>
              </div>

              {/* Info Text */}
              <p className="muted">
                MetaMask <strong>never</strong> shows random {token20Label()} tokens — you must add the token manually or import via
                contract.
              </p>
              <p className="muted" style={{ marginTop: '0.5rem' }}>
                Network must be <strong>ECNA Chain</strong> (Chain ID{' '}
                <strong>{import.meta.env.VITE_CHAIN_ID || '4111'}</strong>) RPC:{' '}
                <code className="mono">{import.meta.env.VITE_RPC_URL || 'https://rpc.ecnascan.com'}</code>
              </p>

              {/* Balance Cards */}
              <div className="row g-3 mb-4 mt-2">
                {/* Native Balance */}
                <div className="col-12 col-sm-6">
                  <div className="balance-highlight-card p-4 rounded-3 bg-success-soft border border-success border-opacity-10">
                    <div className="d-flex justify-content-between align-items-start">
                      <FontAwesomeIcon
                        icon={faGasPump}
                        className="text-success"
                      />
                      <span className="badge bg-success small">Native Gas</span>
                    </div>
                    <div className="mt-3">
                      <h3 className="fw-black mb-0 text-success">
                        {native.isPending
                          ? statPlaceholder
                          : native.data
                            ? formatUnits(native.data.value, 18)
                            : '—'}
                      </h3>
                      <small className="opacity-50 fw-bold">ECNA</small>
                    </div>
                  </div>
                </div>

                {/* Token Balance */}
                <div className="col-12 col-sm-6">
                  <div className="balance-highlight-card p-4 rounded-3 bg-primary-soft border border-primary border-opacity-10">
                    <div className="d-flex justify-content-between align-items-start">
                      <FontAwesomeIcon
                        icon={faCoins}
                        className="text-primary"
                      />
                      <span className="badge bg-primary small">Token</span>
                    </div>
                    <div className="mt-3">
                      <h3 className="fw-black mb-0 text-primary">
                        {tokenEnabled &&
                        (decimals.isPending || tokenBal.isPending)
                          ? statPlaceholder
                          : tokenBal.data !== undefined &&
                              decimals.data !== undefined
                            ? formatUnits(tokenBal.data, decimals.data)
                            : tokenEnabled
                              ? '—'
                              : 'Waiting...'}
                      </h3>
                      <small className="opacity-50 fw-bold">
                        {symbol.data ?? token20Label()}
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra Info */}
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                Native ECNA is required for gas. Low balance? Fund via your
                local node.
              </p>

              {/* Add Token Button */}
              {tokenEnabled && isConnected && (
                <div className="mt-3 d-flex flex-column gap-2">
                  <button
                    type="button"
                    className="btn btn-primary-gradient w-100 py-3 rounded-3 fw-black shadow-lg"
                    onClick={addPethToMetaMask}
                    disabled={decimals.data === undefined}
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                      width="24"
                      className="me-2"
                    />
                    Add Token to MetaMask
                  </button>

                  {pethAddr && (
                    <span
                      className="muted small"
                      style={{ wordBreak: 'break-all' }}
                    >
                      Contract: {pethAddr}
                    </span>
                  )}
                </div>
              )}

              {/* MetaMask Message */}
              {metaMaskTokenMsg && (
                <div className="mt-3 small text-info text-center fw-bold bg-info bg-opacity-10 p-2 rounded-3">
                  {metaMaskTokenMsg}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            className="col-12 col-lg-6 mb-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="card glass-card border-0 rounded-3 shadow-lg h-100 p-4 p-md-5">
              {/* Header */}
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="bg-primary   rounded-3 text-white p-2 width-span">
                  <FontAwesomeIcon icon={faPaperPlane} />
                </div>
                <h4 className="fw-black m-0">Send {symbol.data ?? 'Assets'}</h4>
              </div>

              {/* Description (from your old code) */}
              <p className="muted">
                Send the configured {token20Label()} token to any valid address.
              </p>

              <div className="d-flex flex-column gap-4 mt-2">
                {/* Recipient */}
                <div className="ux-icon-field">
                  <label className="small fw-bold opacity-50 mb-2">
                    RECIPIENT ADDRESS
                  </label>
                  <div className="ux-input-group-premium d-flex align-items-center px-3 rounded-3 border">
                    <span className="opacity-50">
                      <FontAwesomeIcon icon={faWallet} />
                    </span>
                    <input
                      className="flex-grow-1 border-0 bg-transparent py-3 px-3 outline-none"
                      placeholder="Recipient 0x..."
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Amount */}
                <div className="ux-icon-field">
                  <label className="small fw-bold opacity-50 mb-2">
                    AMOUNT
                  </label>
                  <div className="ux-input-group-premium d-flex align-items-center px-3 rounded-3 border">
                    <span className="opacity-50">
                      <FontAwesomeIcon icon={faCoins} />
                    </span>
                    <input
                      className="flex-grow-1 border-0 bg-transparent py-3 px-3 outline-none"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <span className="fw-bold text-primary">
                      {symbol.data ?? 'TOK'}
                    </span>
                  </div>
                </div>

                {/* Button (logic SAME) */}
                <button
                  className="btn btn-primary-gradient w-100 py-3 rounded-3 fw-black shadow-lg"
                  disabled={!canSend || isPending}
                  onClick={send}
                >
                  {isPending ? 'Confirm in wallet…' : 'Send token'}
                </button>

                {/* Error (from your original code - NOT removed) */}
                {error ? (
                  <p className="muted small text-danger">{error.message}</p>
                ) : null}

                {/* Tx Hash (styled but same logic) */}
                {hash ? (
                  <div className="alert alert-success small text-break border-0 py-2 rounded-3 fw-bold mt-2 text-center">
                    Tx: {hash}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>

          <motion.div
            className="col-12 col-xl-6 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="card glass-card border-0 rounded-3 shadow-lg h-100 p-4 p-md-5">
              {/* Header */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-black m-0">Live Activity</h4>
                <div className="live-pulse d-flex align-items-center gap-2 px-2 py-1 rounded-pill bg-success border border-success">
                  <span className="pulse-dot"></span>
                  <small className="fw-bold text-white">SYNCED</small>
                </div>
              </div>

              {/* Description (from your original code) */}
              <p className="muted">From ECNASCAN indexer API.</p>

              {/* Not Connected */}
              {!isConnected ? (
                <p className="text-muted text-center py-5 fw-bold">
                  Connect wallet to view history
                </p>
              ) : (
                <div
                  className="custom-scroll-list flex-grow-1"
                  style={{ maxHeight: '450px', overflowY: 'auto' }}
                >
                  {/* Transaction List */}
                  {history.map((t) => (
                    <div
                      key={t.hash}
                      className="tx-item p-3 rounded-3 mb-3 border border-white border-opacity-10 shadow-sm bg-black bg-opacity-10"
                    >
                      <div className="d-flex justify-content-between mb-2">
                        {/* Status (same logic) */}
                        <span
                          className={`badge px-2 py-1 ${
                            t.status === 1 ? 'bg-success' : 'bg-danger'
                          }`}
                        >
                          {t.status === 1 ? 'Confirmed' : 'Failed'}
                        </span>

                        {/* Copy Button */}
                        <button
                          type="button"
                          className="btn btn-link p-0 btn-sm text-primary"
                          onClick={() => void copyToClipboard(t.hash)}
                        >
                          <FontAwesomeIcon icon={faCopy} />
                        </button>
                      </div>

                      {/* Hash */}
                      <div className="font-monospace small text-truncate mb-2 text-primary">
                        {t.hash}
                      </div>

                      {/* Details */}
                      <div className="d-flex justify-content-between small fw-bold opacity-75">
                        <span className="text-muted">
                          Block {t.blockNumber}
                        </span>
                        <span>{formatUnits(BigInt(t.value), 18)} ECNA</span>
                      </div>
                    </div>
                  ))}

                  {/* Empty State (IMPORTANT - preserved) */}
                  {history.length === 0 && isConnected ? (
                    <div className="text-center py-4 text-muted fw-bold">
                      No indexed txs yet.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            className="col-12 col-xl-6 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="card glass-card border-0 rounded-3 shadow-lg h-100 p-4 p-md-5">
              {/* Header */}
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="bg-primary   rounded-3 text-white p-2 width-span">
                  <FontAwesomeIcon icon={faCode} />
                </div>
                <h4 className="fw-black m-0">Contract Hub</h4>
              </div>

              {/* Description (original) */}
              <p className="muted">
                Human-readable ABI JSON array or full JSON ABI.
              </p>

              <div className="row g-4 mt-1">
                {/* LEFT SIDE */}
                <div className="col-12 col-md-12 d-flex flex-column gap-3">
                  {/* Contract Address */}
                  <div className="ux-icon-field">
                    <label className="small fw-bold opacity-50 mb-2">
                      TARGET CONTRACT
                    </label>
                    <div className="ux-input-group-premium d-flex align-items-center px-3 rounded-3 border">
                      <span className="opacity-50">
                        <FontAwesomeIcon icon={faFileSignature} />
                      </span>
                      <input
                        className="flex-grow-1 border-0 bg-transparent py-3 px-3 outline-none"
                        placeholder="Contract 0x..."
                        value={contractAddr}
                        onChange={(e) => setContractAddr(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* ABI */}
                  <div className="ux-icon-field">
                    <label className="small fw-bold opacity-50 mb-2">
                      ABI JSON
                    </label>
                    <div className="ux-input-group-premium d-flex align-items-start pt-2 px-3 rounded-3 border">
                      <span className="opacity-50 mt-2">
                        <FontAwesomeIcon icon={faFileCode} />
                      </span>
                      <textarea
                        className="flex-grow-1 border-0 bg-transparent py-2 px-3 outline-none"
                        rows={4}
                        placeholder='["function balanceOf(address) view returns (uint256)"]'
                        value={abiJson}
                        onChange={(e) => setAbiJson(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE */}
                <div className="col-12 col-md-12 d-flex flex-column gap-3">
                  {/* Function Name */}
                  <div className="ux-icon-field">
                    <label className="small fw-bold opacity-50 mb-2">
                      FUNCTION
                    </label>
                    <div className="ux-input-group-premium d-flex align-items-center px-3 rounded-3 border">
                      <span className="opacity-50">
                        <FontAwesomeIcon icon={faTerminal} />
                      </span>
                      <input
                        className="flex-grow-1 border-0 bg-transparent py-3 px-3 outline-none"
                        value={fnName}
                        onChange={(e) => setFnName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Arguments */}
                  <div className="ux-icon-field">
                    <label className="small fw-bold opacity-50 mb-2">
                      ARGUMENTS
                    </label>
                    <div className="ux-input-group-premium d-flex align-items-center px-3 rounded-3 border">
                      <span className="opacity-50">
                        <FontAwesomeIcon icon={faListUl} />
                      </span>
                      <textarea
                        className="flex-grow-1 border-0 bg-transparent py-2 px-3 outline-none"
                        rows={2}
                        value={fnArgs}
                        onChange={(e) => setFnArgs(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Buttons (same logic) */}
                  <div className="d-flex gap-3 mt-auto">
                    <button
                      className="btn btn-outline-info flex-grow-1 py-3 rounded-3 fw-bold"
                      disabled={!customAbi}
                      onClick={() => void readCustom()}
                    >
                      Read
                    </button>
                    <button
                      className="btn btn-success flex-grow-1 py-3 rounded-3 fw-bold"
                      disabled={pending2 || !customAbi}
                      onClick={writeCustomFn}
                    >
                      {pending2 ? 'Writing…' : 'Write'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Console Output (ALL original conditions preserved) */}
              {(readResult !== null || readErr || err2 || hash2) && (
                <div className="terminal-console mt-4 rounded-3 p-4 font-monospace small bg-black bg-opacity-70 border border-info border-opacity-25 text-light">
                  {readResult !== null && (
                    <div className="text-info mb-1">
                      {'>'} Result: {readResult}
                    </div>
                  )}

                  {readErr && (
                    <div className="text-danger mb-1">
                      {'>'} Error: {readErr}
                    </div>
                  )}

                  {err2 && (
                    <div className="text-danger mb-1">
                      {'>'} Error: {err2.message}
                    </div>
                  )}

                  {hash2 && (
                    <div className="text-success">
                      {'>'} Tx: {hash2}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
