import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Subdomains with dedicated Next.js route groups
const DEDICATED_ROUTES: Record<string, string> = {
  "sadahaq":              "/sadahaq",
  "shopping":             "/shopping",
  "pgdb":                 "/pgdb",
  "food":                 "/food",
  "professionalservices": "/professionalservices",
};

// Subdomains that bypass middleware entirely
const BYPASS = ["pgadmin", "db", "console", "api"];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Skip internal Next.js paths and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/banners") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/edit-services") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/offline.html" ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Not a digitalrohtak subdomain — pass through
  if (!host.endsWith(".digitalrohtak.online") && host !== "digitalrohtak.online") {
    return NextResponse.next();
  }

  // Root domain — pass through
  if (host === "digitalrohtak.online") {
    return NextResponse.next();
  }

  const sub = host.split(".")[0];

  // Bypass subdomains
  if (BYPASS.includes(sub)) {
    return NextResponse.next();
  }

  // Dedicated route subdomains (sadahaq, pgdb)
  if (DEDICATED_ROUTES[sub]) {
    const base = DEDICATED_ROUTES[sub];
    if (pathname.startsWith(base)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = `${base}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // All other subdomains — they don't have a dedicated landing yet.
  // Route them to the global Work In Progress page so we never silently
  // serve the root domain page on a sister subdomain.
  if (pathname === "/" || pathname === "") {
    const url = request.nextUrl.clone();
    url.pathname = "/wip";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
