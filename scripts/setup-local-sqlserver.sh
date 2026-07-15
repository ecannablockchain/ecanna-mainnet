#!/bin/bash
# Install + start local SQL Server on the same host as API/indexer (localhost:1433).
# Run on production server as root:
#   bash /opt/ecnascan/scripts/setup-local-sqlserver.sh
set -eu

ROOT="${ECNA_ROOT:-/opt/ecnascan}"
DOCKER_DIR="$ROOT/server/docker"
ENV_FILE="$DOCKER_DIR/.env.mssql"
DB_NAME="${ECNA_DB_NAME:-Db_ECNAChain}"
SA_PASSWORD="${MSSQL_SA_PASSWORD:-}"

if [[ -z "$SA_PASSWORD" && -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  SA_PASSWORD="${MSSQL_SA_PASSWORD:-}"
fi

if [[ -z "$SA_PASSWORD" ]]; then
  SA_PASSWORD="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9!@#%^&*' | head -c 24)"
  SA_PASSWORD="${SA_PASSWORD}Aa1!"
  mkdir -p "$DOCKER_DIR"
  printf 'MSSQL_SA_PASSWORD=%s\n' "$SA_PASSWORD" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "[sql] Wrote new SA password to $ENV_FILE"
fi

echo "=== [1/4] Start SQL Server container ==="
cd "$DOCKER_DIR"
docker compose -f docker-compose.mssql.yml --env-file "$ENV_FILE" up -d

echo "=== [2/4] Wait for SQL Server ==="
for i in $(seq 1 40); do
  if docker exec ecna-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C -Q "SELECT 1" >/dev/null 2>&1; then
    echo "[sql] Ready"
    break
  fi
  sleep 3
done

echo "=== [3/4] Create database $DB_NAME ==="
docker exec ecna-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -C -Q \
  "IF DB_ID('$DB_NAME') IS NULL CREATE DATABASE [$DB_NAME];"

ENC_PASS=$(printf '%s' "$SA_PASSWORD" | sed 's/}/}}/g')
NEW_URL="sqlserver://127.0.0.1:1433;database=${DB_NAME};user=sa;password={${ENC_PASS}};encrypt=true;trustServerCertificate=true"

SERVER_ENV="$ROOT/server/.env"
if [[ ! -f "$SERVER_ENV" ]]; then
  echo "ERROR: $SERVER_ENV missing"
  exit 1
fi

if grep -q '^DATABASE_URL=' "$SERVER_ENV"; then
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${NEW_URL}\"|" "$SERVER_ENV"
else
  echo "DATABASE_URL=\"${NEW_URL}\"" >> "$SERVER_ENV"
fi

echo "=== [4/4] Prisma schema + scale procedures ==="
cd "$ROOT/server"
pm2 stop ecna-api ecna-indexer 2>/dev/null || true
npx prisma generate
npx prisma db push
npm run db:apply-scale 2>/dev/null || true

echo ""
echo "=== Local SQL Server ready ==="
echo "  Host: 127.0.0.1:1433 (not exposed publicly)"
echo "  Database: $DB_NAME"
echo "  Updated: $SERVER_ENV"
echo ""
echo "Restart API + indexer:"
echo "  cd $ROOT && pm2 restart all --update-env"
echo "Indexer will backfill blocks from chain (empty tables after fresh DB)."
