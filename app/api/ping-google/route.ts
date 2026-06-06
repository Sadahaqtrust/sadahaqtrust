import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

// Ping Google to re-crawl updated URLs
// Google supports: https://www.google.com/ping?sitemap=URL
// Also supports IndexNow for Bing/Yandex

const SITE_URL = "https://digitalrohtak.online";

export async function POST(req: NextRequest) {
  try {
    const results: any[] = [];

    // 1. Ping Google with sitemap
    const sitemapUrl = `${SITE_URL}/sitemap.xml`;
    try {
      const googleRes = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
      results.push({ service: "google-sitemap", status: googleRes.status, ok: googleRes.ok });
    } catch (e: any) {
      results.push({ service: "google-sitemap", error: e.message });
    }

    // 2. Ping Bing with sitemap
    try {
      const bingRes = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
      results.push({ service: "bing-sitemap", status: bingRes.status, ok: bingRes.ok });
    } catch (e: any) {
      results.push({ service: "bing-sitemap", error: e.message });
    }

    // 3. Collect all URLs from services
    const servicesFile = path.join(process.cwd(), "data", "services.json");
    const sadahaqFile = path.join(process.cwd(), "data", "sadahaq-services.json");
    const allUrls: string[] = [SITE_URL + "/"];

    try {
      if (existsSync(servicesFile)) {
        const data = JSON.parse(readFileSync(servicesFile, "utf-8"));
        for (const svc of data.services || []) {
          if (svc.url) allUrls.push(svc.url.replace(/\/$/, "") + "/");
        }
      }
    } catch {}

    try {
      if (existsSync(sadahaqFile)) {
        const data = JSON.parse(readFileSync(sadahaqFile, "utf-8"));
        for (const svc of data.services || []) {
          if (svc.href) allUrls.push(`https://sadahaq.digitalrohtak.online${svc.href.replace("/sadahaq", "")}`);
        }
      }
    } catch {}

    // 4. IndexNow for Bing/Yandex (batch submit)
    try {
      const indexNowRes = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: "digitalrohtak.online",
          key: "digitalrohtak2026",
          urlList: allUrls.slice(0, 100), // max 100 per request
        }),
      });
      results.push({ service: "indexnow", status: indexNowRes.status, urlCount: allUrls.length });
    } catch (e: any) {
      results.push({ service: "indexnow", error: e.message });
    }

    return NextResponse.json({
      success: true,
      pinged: results,
      totalUrls: allUrls.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
