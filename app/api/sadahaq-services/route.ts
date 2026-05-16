import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { logAudit } from "@/lib/auditLog";

const DB_FILE = path.join(process.cwd(), "data", "sadahaq-services.json");

export async function GET() {
  try {
    if (existsSync(DB_FILE)) {
      const data = JSON.parse(readFileSync(DB_FILE, "utf-8"));
      if (data.services && data.services.length > 0) {
        return NextResponse.json(data);
      }
    }
    return NextResponse.json({ services: [] });
  } catch {
    return NextResponse.json({ services: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { services } = await req.json();
    const dataDir = path.join(process.cwd(), "data");
    if (!existsSync(dataDir)) {
      execSync(`mkdir -p ${dataDir}`);
    }
    writeFileSync(DB_FILE, JSON.stringify({ services, updatedAt: new Date().toISOString() }, null, 2));

    // Audit log
    logAudit(req, 'SERVICE_GRID_SAVE', { serviceCount: services?.length || 0 });

    return NextResponse.json({ success: true, message: "Sadahaq services saved" });
  } catch (err: any) {
    console.error("Sadahaq services save error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
