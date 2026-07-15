/**
 * Public RPC guards (nginx → these → local Geth).
 * Blocks eth_sendTransaction / eth_sign / personal_* so unlocked Clique miner cannot be drained.
 */
module.exports = {
  apps: [
    {
      name: "ecna-rpc-guard",
      cwd: ".",
      script: "scripts/rpc-public-guard.mjs",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
        RPC_UPSTREAM: "http://127.0.0.1:8545",
        RPC_GUARD_HOST: "127.0.0.1",
        RPC_GUARD_PORT: "28545",
      },
    },
    {
      name: "ecna-rpc-guard-testnet",
      cwd: ".",
      script: "scripts/rpc-public-guard.mjs",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
        RPC_UPSTREAM: "http://127.0.0.1:18545",
        RPC_GUARD_HOST: "127.0.0.1",
        RPC_GUARD_PORT: "28546",
      },
    },
  ],
};
