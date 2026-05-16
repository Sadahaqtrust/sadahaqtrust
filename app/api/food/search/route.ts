/**
 * POST /api/food/search
 *
 * Runs a restaurant+dish search, returns the result set, and fires (non-
 * blocking) a Search_Event write. See spec: personalized-food-landing.
 *
 * Body: { q?: string; cuisine?: string }
 * Response: 200 { restaurants, considered } OR 400 { error: "cuisine_too_long" }
 *
 * Cookies: reads or mints `dr_food_vid` (anonymous visitor identity).
 * Headers: Set-Cookie on mint; X-DR-Personalized not set on this endpoint —
 *          the landing endpoint carries that flag, per design.
 */
import { NextResponse, type NextRequest } from "next/server";
import { Client } from "pg";
import { sanitize } from "@/lib/food/input-sanitizer";
import { readOrMint } from "@/lib/food/visitor-identity";
import { hrefForBatch } from "@/lib/food/menu-link-resolver";
import { hash as ipHash } from "@/lib/food/ip-hasher";
import { createSearchLogger } from "@/lib/food/search-logger";
import { InProcSlidingWindow } from "@/lib/food/rate-limiter";
import {
  DATABASE_URL,
  isVisitorOptedOut,
  searchRestaurants,
} from "@/lib/food/pg-data";
import type { MatchReason, PendingSearchEvent } from "@/lib/food/types";

export const dynamic = "force-dynamic";

// Module-scope limiter: one instance per Node process. OK for phase 1
// (single PM2 process); phase 2 swaps in a Redis adapter.
const rateLimiter = new InProcSlidingWindow({ rVid: 60, rIp: 300 });

const searchLogger = createSearchLogger({
  pgClientFactory: async () => {
    const c = new Client({ connectionString: DATABASE_URL });
    await c.connect();
    return c;
  },
  rateLimiter,
  isOptedOut: async (vid) => isVisitorOptedOut(vid),
  tLogMs: 250,
});

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export async function POST(req: NextRequest) {
  let body: { q?: string; cuisine?: string } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    body = {};
  }
  const sanitized = sanitize(body);
  if (sanitized.cuisineRejected) {
    return NextResponse.json({ error: "cuisine_too_long" }, { status: 400 });
  }

  const identity = readOrMint({
    cookies: {
      get: (n: string) => {
        const c = req.cookies.get(n);
        return c ? { value: c.value } : undefined;
      },
    },
  });

  const c = new Client({ connectionString: DATABASE_URL });
  let rows: Awaited<ReturnType<typeof searchRestaurants>> = [];
  try {
    await c.connect();
    rows = await searchRestaurants(c, sanitized.queryText, sanitized.cuisine);
  } catch (err) {
    console.error("food-search pg error", (err as Error)?.message);
  } finally {
    try {
      await c.end();
    } catch {
      /* best-effort */
    }
  }

  const hrefs = hrefForBatch(rows);
  const annotated = rows.map((r, i) => ({
    ...r,
    href: hrefs[i],
    handle: hrefs[i].startsWith("/food/r/id/")
      ? null
      : hrefs[i].substring("/food/r/".length),
  }));

  // Build the pending event and fire-and-forget.
  const breakdown: Record<MatchReason, number> = {
    name: 0,
    cuisine: 0,
    address: 0,
    menu: 0,
    history: 0,
    all: 0,
  };
  for (const r of rows) breakdown[r.match_reason]++;
  const event: PendingSearchEvent = {
    visitorId: identity.visitorId,
    queryText: sanitized.queryText,
    queryTruncated: sanitized.queryTruncated,
    cuisine: sanitized.cuisine,
    resultRestaurantIds: rows.map((r) => r.id),
    resultCount: rows.length,
    matchReasonBreakdown: breakdown,
    userAgent: (req.headers.get("user-agent") ?? "").slice(0, 512),
    locale: req.headers.get("accept-language")?.split(",")[0] ?? "",
    sourceIpHash: (() => {
      try {
        return ipHash(clientIp(req));
      } catch {
        return "";
      }
    })(),
  };
  try {
    searchLogger.log(event);
  } catch {
    /* logger must never break the response path */
  }

  const res = NextResponse.json({
    restaurants: annotated,
    considered: rows.length,
  });
  if (identity.setCookieHeader) {
    res.headers.append("Set-Cookie", identity.setCookieHeader);
  }
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
