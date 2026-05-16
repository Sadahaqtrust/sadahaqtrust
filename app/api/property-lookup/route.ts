import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: "127.0.0.1", port: 3306,
  user: "digitaladmin", password: "Saanvi02052016@",
  database: "sadahaqtrust_db", connectionLimit: 3,
});

export async function GET(req: NextRequest) {
  const pid = req.nextUrl.searchParams.get("pid") || "";
  if (!pid) return NextResponse.json({ error: "pid required" }, { status: 400 });
  try {
    const [rows] = await pool.execute(
      "SELECT pid, owner_name, address, colony, property_type, plot_area_sq_yard FROM sadahaq_haryana_property_rohtak WHERE LOWER(pid) = ? LIMIT 1",
      [pid.toLowerCase().trim()]
    ) as any[];
    if (!rows.length) return NextResponse.json({ property: null });
    return NextResponse.json({ property: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
