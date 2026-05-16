#!/usr/bin/env node
/**
 * File: storefront/scripts/apply-migration.ts
 *
 * Idempotent migration runner for the storefront Postgres database.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/apply-migration.ts migrations/001_search_history.sql
 *
 * Behaviour:
 *   - Reads DATABASE_URL from process.env.
 *   - Reads the SQL file path from process.argv[2].
 *   - Connects via pg.Client, runs the SQL as a single query.
 *     The migration file is expected to wrap itself in BEGIN/COMMIT;
 *     we pass it through verbatim. Relying on the file's own transaction
 *     block means a runner-injected transaction would nest needlessly.
 *   - On success, prints a single JSON log line on stdout:
 *       {"event_type":"migration_applied","file":"...","duration_ms":N}
 *     and exits 0.
 *   - On pg / fs / arg error, prints a structured JSON log line on stderr
 *     and exits 1.
 *
 * Safe to re-run: the migration uses CREATE ... IF NOT EXISTS throughout.
 *
 * Requirements: working-rules.md §2 (idempotency), tasks.md 1.3
 */

import { readFileSync } from "node:fs";
import { resolve as pathResolve } from "node:path";
import { Client } from "pg";

type ErrorLogLine = {
  event_type: "migration_error";
  file: string | null;
  message: string;
  code?: string;
};

function logError(line: ErrorLogLine): void {
  // stderr, one JSON object per line
  process.stderr.write(JSON.stringify(line) + "\n");
}

async function main(): Promise<void> {
  const argPath = process.argv[2];
  if (!argPath) {
    logError({
      event_type: "migration_error",
      file: null,
      message: "missing SQL file path argument (argv[2])",
    });
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.length === 0) {
    logError({
      event_type: "migration_error",
      file: argPath,
      message: "DATABASE_URL environment variable not set",
    });
    process.exit(1);
  }

  const absPath = pathResolve(process.cwd(), argPath);

  let sql: string;
  try {
    sql = readFileSync(absPath, "utf8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    logError({
      event_type: "migration_error",
      file: absPath,
      message: `failed to read SQL file: ${e.message}`,
      code: e.code,
    });
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  const started = Date.now();

  try {
    await client.connect();
  } catch (err) {
    const e = err as Error & { code?: string };
    logError({
      event_type: "migration_error",
      file: absPath,
      message: `pg connect failed: ${e.message}`,
      code: e.code,
    });
    process.exit(1);
  }

  try {
    // The migration file wraps itself in BEGIN/COMMIT; pass through as-is.
    await client.query(sql);
  } catch (err) {
    const e = err as Error & { code?: string };
    logError({
      event_type: "migration_error",
      file: absPath,
      message: `pg query failed: ${e.message}`,
      code: e.code,
    });
    try {
      await client.end();
    } catch {
      // best-effort cleanup
    }
    process.exit(1);
  }

  try {
    await client.end();
  } catch {
    // best-effort cleanup
  }

  const durationMs = Date.now() - started;
  const okLine = {
    event_type: "migration_applied",
    file: absPath,
    duration_ms: durationMs,
  };
  process.stdout.write(JSON.stringify(okLine) + "\n");
  process.exit(0);
}

main().catch((err) => {
  const e = err as Error;
  logError({
    event_type: "migration_error",
    file: process.argv[2] ?? null,
    message: `unhandled: ${e.message}`,
  });
  process.exit(1);
});
