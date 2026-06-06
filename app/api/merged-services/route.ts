import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "data", "merged_services.json");

export async function GET() {
  try {
    if (existsSync(DB_FILE)) {
      const data = JSON.parse(readFileSync(DB_FILE, "utf-8"));
      return NextResponse.json(data);
    }
    return NextResponse.json({ categories: [] });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
