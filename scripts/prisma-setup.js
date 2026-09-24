#!/usr/bin/env node
/**
 * Prisma setup that works in both worlds:
 *
 * - Production / preview (e.g. Vercel): DATABASE_URL points at PostgreSQL.
 *   The canonical schema in prisma/schema.prisma (provider "postgresql")
 *   is used as-is.
 * - Local development: DATABASE_URL is a SQLite file (or unset). A derived
 *   SQLite schema is written to prisma/.local.prisma and the client is
 *   generated from it, so `npm run dev` stays zero-setup.
 *
 * Runs on postinstall, predev and prebuild — idempotent and fast.
 */
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const CANONICAL = path.join(ROOT, 'prisma', 'schema.prisma')
const LOCAL = path.join(ROOT, 'prisma', '.local.prisma')

const url = (process.env.DATABASE_URL ?? '').trim()
const isSqlite = url === '' || url.startsWith('file:')

function targetSchema() {
  if (!isSqlite) return CANONICAL
  const source = fs.readFileSync(CANONICAL, 'utf8')
  const swapped = source
    .replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"')
    .replace(/url\s*=\s*env\("DATABASE_URL"\)/, 'url = "file:./dev.db"')
  fs.writeFileSync(LOCAL, swapped)
  return LOCAL
}

function main() {
  const schema = targetSchema()
  if (isSqlite) {
    // Keep the local database in sync with the schema (no migration
    // history needed for the dev database).
    execSync(`npx prisma db push --schema "${schema}" --skip-generate`, { stdio: 'inherit', cwd: ROOT })
  }
  execSync(`npx prisma generate --schema "${schema}"`, { stdio: 'inherit', cwd: ROOT })
  console.log(`[afra] Prisma client ready (${isSqlite ? 'sqlite (local)' : 'postgresql'})`)
}

main()
