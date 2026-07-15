/**
 * PM2 production process file — repo root:
 *   cd server && npm run build
 *   pm2 start ../ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "ecna-api",
      cwd: "./server",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "ecna-indexer",
      cwd: "./server",
      script: "dist/indexer.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
