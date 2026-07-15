// Apply scale-hardening SQL (indexes, rollups, stored procedures).
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "../src/generated/prisma/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.join(__dirname, "..");
const migDir = path.join(serverRoot, "prisma", "migrations", "20260619120000_scale_hardening");
const schemaPath = path.join(serverRoot, "prisma", "schema.prisma");

const prisma = new PrismaClient();

async function execBatch(sql, label) {
  await prisma.$executeRawUnsafe(sql);
  console.log("[db:apply-scale]", label, "ok");
}

async function dropProcedure(name) {
  await prisma.$executeRawUnsafe(
    `IF OBJECT_ID(N'[dbo].[${name}]', N'P') IS NOT NULL EXEC(N'DROP PROCEDURE [dbo].[${name}]')`,
  );
}

function installProcedure(fileName) {
  const procName = fileName.replace(/\.sql$/, "");
  const filePath = path.join(migDir, "procedures", fileName);
  execSync(`npx prisma db execute --file "${filePath}" --schema "${schemaPath}"`, {
    cwd: serverRoot,
    stdio: "inherit",
  });
  console.log("[db:apply-scale]", procName, "ok");
}

try {
  const tablesSql = fs.readFileSync(path.join(migDir, "migration.sql"), "utf8").trim();
  await execBatch(tablesSql, "tables+indexes");

  const procDir = path.join(migDir, "procedures");
  if (fs.existsSync(procDir)) {
    const files = fs.readdirSync(procDir).filter((f) => f.endsWith(".sql")).sort();
    for (const f of files) {
      const procName = f.replace(/\.sql$/, "");
      await dropProcedure(procName);
      installProcedure(f);
    }
  }

  console.log("[db:apply-scale] Done.");
} finally {
  await prisma.$disconnect();
}
