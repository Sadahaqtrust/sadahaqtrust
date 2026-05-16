import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "127.0.0.1", port: 3306,
  user: "digitaladmin", password: "Saanvi02052016@",
  database: "sadahaqtrust_db", connectionLimit: 3,
});

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  try {
    const [rows] = await pool.execute(
      q
        ? "SELECT colony_id, colony_name FROM sadahaq_ulb_colony_master WHERE colony_name LIKE ? ORDER BY colony_name LIMIT 20"
        : "SELECT colony_id, colony_name FROM sadahaq_ulb_colony_master ORDER BY colony_name LIMIT 50",
      q ? [`%${q}%`] : []
    ) as any[];
    return NextResponse.json({ colonies: rows });
  } catch (err: any) {
    return NextResponse.json({ colonies: [], error: err.message }, { status: 500 });
  }
}
