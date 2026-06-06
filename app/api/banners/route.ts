import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { logAudit } from "@/lib/auditLog";

const DATA_DIR = path.join(process.cwd(), "data", "banners");

function getDbFile(site: string) {
  return path.join(DATA_DIR, `${site}.json`);
}

export async function GET(req: NextRequest) {
  const site = req.nextUrl.searchParams.get("site") || "digitalrohtak";
  const dbFile = getDbFile(site);
  try {
    if (existsSync(dbFile)) {
      const data = JSON.parse(readFileSync(dbFile, "utf-8"));
      return NextResponse.json({ banners: data.banners || [] });
    }
    return NextResponse.json({ banners: [] });
  } catch {
    return NextResponse.json({ banners: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { site, banners } = await req.json();
    const siteKey = site || "digitalrohtak";
    if (!existsSync(DATA_DIR)) {
      execSync(`mkdir -p ${DATA_DIR}`);
    }
    const dbFile = getDbFile(siteKey);
    writeFileSync(dbFile, JSON.stringify({ banners, updatedAt: new Date().toISOString() }, null, 2));

    // Audit log
    logAudit(req, 'BANNER_CONFIG_SAVE', { site: siteKey, bannerCount: banners?.length || 0 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
