/**
 * GET /api/food/landing
 *
 * Returns a Personalized_Listing derived from the visitor's recent search
 * history, or a Fallback_Listing when the visitor has none.
 *
 * See spec: .kiro/specs/personalized-food-landing/{requirements,design}.md
 */
import { NextResponse, type NextRequest } from "next/server";
import { hrefForBatch } from "@/lib/food/menu-link-resolver";
import { createLandingService } from "@/lib/food/landing-service";
import { createPgLandingDataSource } from "@/lib/food/pg-data";
import { readOrMint, COOKIE_NAME } from "@/lib/food/visitor-identity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const identity = readOrMint({
    cookies: {
      get: (n: string) => {
        const c = req.cookies.get(n);
        return c ? { value: c.value } : undefined;
      },
    },
  });

  const svc = createLandingService(createPgLandingDataSource());
  const result = await svc.getListing(identity.visitorId);

  const hrefs = hrefForBatch(result.restaurants);
  const annotated = result.restaurants.map((r, i) => ({
    ...r,
    href: hrefs[i],
    handle: hrefs[i].startsWith("/food/r/id/") ? null : hrefs[i].substring("/food/r/".length),
  }));

  const body = {
    restaurants: annotated,
    personalized: result.personalized,
    considered: result.considered,
  };

  const res = NextResponse.json(body);
  res.headers.set("X-DR-Personalized", String(result.personalized));
  res.headers.set("Cache-Control", "private, no-store");
  if (identity.setCookieHeader) {
    res.headers.append("Set-Cookie", identity.setCookieHeader);
  }

  try {
    console.log(
      JSON.stringify({
        svc: "food",
        event_type: "landing_rendered",
        visitor_id: identity.visitorId,
        personalized: result.personalized,
        history_events_considered: result.considered,
        restaurants_returned: annotated.length,
        duration_ms: Date.now() - startedAt,
        ts: new Date().toISOString(),
      }),
    );
  } catch {
    /* best-effort */
  }
  // Tag the cookie-name to avoid unused-import lint in edge builds.
  void COOKIE_NAME;

  return res;
}
