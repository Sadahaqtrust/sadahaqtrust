import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

// Dynamic sitemap generated from services config
export async function GET() {
  const servicesFile = path.join(process.cwd(), "data", "services.json");
  const sadahaqFile = path.join(process.cwd(), "data", "sadahaq-services.json");

  let services: any[] = [];
  let sadahaqServices: any[] = [];

  try {
    if (existsSync(servicesFile)) {
      const data = JSON.parse(readFileSync(servicesFile, "utf-8"));
      services = data.services || [];
    }
  } catch {}

  try {
    if (existsSync(sadahaqFile)) {
      const data = JSON.parse(readFileSync(sadahaqFile, "utf-8"));
      sadahaqServices = data.services || [];
    }
  } catch {}

  const today = new Date().toISOString().split("T")[0];

  let urls = `
  <url><loc>https://digitalrohtak.online/</loc><lastmod>${today}</lastmod><priority>1.0</priority><changefreq>daily</changefreq></url>
  <url><loc>https://digitalrohtak.online/products</loc><priority>0.8</priority></url>
  <url><loc>https://digitalrohtak.online/search</loc><priority>0.7</priority></url>
  <url><loc>https://digitalrohtak.online/auth/login</loc><priority>0.5</priority></url>
  <url><loc>https://digitalrohtak.online/auth/register</loc><priority>0.5</priority></url>`;

  // Add all service subdomains
  for (const svc of services) {
    if (svc.url && svc.url.includes("digitalrohtak.online")) {
      const url = svc.url.replace(/\/$/, "");
      urls += `\n  <url><loc>${url}/</loc><lastmod>${today}</lastmod><priority>0.8</priority><changefreq>weekly</changefreq></url>`;
    }
  }

  // Add sadahaq sub-pages
  urls += `\n  <url><loc>https://sadahaq.digitalrohtak.online/</loc><lastmod>${today}</lastmod><priority>1.0</priority><changefreq>daily</changefreq></url>`;
  for (const svc of sadahaqServices) {
    if (svc.href) {
      urls += `\n  <url><loc>https://sadahaq.digitalrohtak.online${svc.href.replace("/sadahaq", "")}</loc><lastmod>${today}</lastmod><priority>0.7</priority></url>`;
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
