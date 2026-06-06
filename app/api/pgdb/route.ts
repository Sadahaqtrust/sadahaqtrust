import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { logAudit } from "@/lib/auditLog";

const pools: Record<string, Pool> = {};

function getPool(db: string): Pool {
  if (!pools[db]) {
    pools[db] = new Pool({
      host: process.env.DATABASE_HOST || "localhost",
      port: 5432,
      user: "medusa_user",
      password: "Saanvi02052016@",
      database: db,
      max: 3,
    });
  }
  return pools[db];
}

export async function POST(req: NextRequest) {
  try {
    const { sql, database } = await req.json();
    if (!sql || !database) {
      return NextResponse.json({ error: "sql and database required" }, { status: 400 });
    }
    // Block dangerous operations for safety
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith("DROP DATABASE") || upper.startsWith("DROP SCHEMA")) {
      return NextResponse.json({ error: "DROP DATABASE/SCHEMA not allowed" }, { status: 403 });
    }
    const pool = getPool(database);
    const result = await pool.query(sql);

    // Audit log
    logAudit(req, 'PGDB_QUERY', { database, commandType: result.command || sql.trim().split(/\s+/)[0].toUpperCase() });

    return NextResponse.json({
      rows: result.rows || [],
      rowCount: result.rowCount,
      fields: result.fields?.map((f: any) => f.name) || [],
      command: result.command,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// List databases
export async function GET() {
  try {
    const pool = getPool("postgres");
    const result = await pool.query(
      "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"
    );
    return NextResponse.json({ databases: result.rows.map((r: any) => r.datname) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
