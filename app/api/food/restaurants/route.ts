// NOTE: This endpoint is NOT on the /food landing path as of the
// personalized-food-landing spec. /food now fetches /api/food/landing on
// mount (GET) and /api/food/search on submit (POST). This route is
// retained for a future /food/browse-all admin/debug view. Do not import
// from /food/page.tsx.
import { NextResponse } from "next/server";
import { Client } from "pg";

// Restaurants are modelled as Medusa sales channels tagged with
// metadata.platform = "food.digitalrohtak.online". We hit Postgres directly
// (same VM, medusa_user credentials already in the storefront env) because
// the /store/sales-channels endpoint doesn't exist in Medusa v2.
//
// Search semantics, in priority order:
//   1. If q matches a restaurant name / cuisine / address -> show it.
//   2. If q matches a product (dish) title under a restaurant's sales channel
//      -> show the parent restaurant. This lets "biryani" surface
//      Maa-Ki-Rasoi because the channel has 111k dishes including biryani.
//   3. Optional cuisine filter narrows results further.
//
// No ORM, no new deps — plain SQL against the existing medusa_digitalrohtak
// database.

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://medusa_user:Saanvi02052016%40@localhost:5432/medusa_digitalrohtak";

type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  veg_nonveg: string;
  address: string;
  city: string;
  opening_time: string;
  closing_time: string;
  is_open: boolean;
  hours_24x7: boolean;
  menu_count: number;
  min_price_inr: number | null;
  match_reason: "name" | "cuisine" | "address" | "menu" | "all";
};

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const cuisine = (searchParams.get("cuisine") || "").toLowerCase().trim();

  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();

    // Pull every restaurant sales channel (platform tag)
    const channelsRes = await client.query<{
      id: string;
      name: string;
      description: string;
      metadata: Record<string, any> | null;
    }>(
      `SELECT id, name, description, metadata
         FROM sales_channel
        WHERE deleted_at IS NULL
          AND COALESCE(metadata->>'platform','') = 'food.digitalrohtak.online'`
    );

    type Channel = (typeof channelsRes.rows)[number];
    const channels: Channel[] = channelsRes.rows;
    if (channels.length === 0) return NextResponse.json({ restaurants: [] });

    // Count published products (menu size) per channel
    const counts = await client.query<{
      sales_channel_id: string;
      n: string;
    }>(
      `SELECT psc.sales_channel_id, COUNT(*)::text AS n
         FROM product_sales_channel psc
         JOIN product p ON p.id = psc.product_id
        WHERE p.deleted_at IS NULL
          AND p.status = 'published'
          AND psc.sales_channel_id = ANY($1::text[])
        GROUP BY psc.sales_channel_id`,
      [channels.map((c) => c.id)]
    );
    const menuCount = new Map<string, number>();
    for (const row of counts.rows) menuCount.set(row.sales_channel_id, Number(row.n));

    // If there's a free-text query, figure out which restaurants have a menu
    // item matching it (dish search). Limit to a reasonable cap for perf.
    const menuMatches = new Set<string>();
    if (q && q.length >= 2) {
      const menuRes = await client.query<{ sales_channel_id: string }>(
        `SELECT DISTINCT psc.sales_channel_id
           FROM product p
           JOIN product_sales_channel psc ON psc.product_id = p.id
          WHERE p.deleted_at IS NULL
            AND p.status = 'published'
            AND psc.sales_channel_id = ANY($1::text[])
            AND (
                  LOWER(p.title)        LIKE '%' || $2 || '%'
               OR LOWER(p.handle)       LIKE '%' || $2 || '%'
               OR LOWER(p.description)  LIKE '%' || $2 || '%'
            )
          LIMIT 1000`,
        [channels.map((c) => c.id), q]
      );
      for (const row of menuRes.rows) menuMatches.add(row.sales_channel_id);
    }

    const normalise = (s: string | null | undefined) =>
      (s || "").toLowerCase();

    const restaurants: Restaurant[] = channels
      .map<Restaurant | null>((sc) => {
        const m = sc.metadata || {};
        const r: Restaurant = {
          id: sc.id,
          name: sc.name,
          cuisine: m.cuisine_type || "",
          veg_nonveg: m.veg_nonveg || "Both",
          address: m.address || "",
          city: m.city || "Rohtak",
          opening_time: m.opening_time || "09:00",
          closing_time: m.closing_time || "23:00",
          is_open: m.hours_24x7 === true ? true : m.is_open !== false,
          hours_24x7: m.hours_24x7 === true,
          menu_count: menuCount.get(sc.id) ?? Number(m.menu_count ?? 0),
          min_price_inr:
            m.min_price_inr != null ? Number(m.min_price_inr) : null,
          match_reason: "all",
        };

        // cuisine filter (chip)
        if (cuisine) {
          const hit = normalise(r.cuisine).includes(cuisine);
          if (!hit) return null;
        }

        // text search — name / cuisine / address OR menu-match
        if (q) {
          const inName = normalise(r.name).includes(q);
          const inCuisine = normalise(r.cuisine).includes(q);
          const inAddress = normalise(r.address).includes(q);
          const inDesc = normalise(sc.description).includes(q);
          const inMenu = menuMatches.has(sc.id);
          if (!(inName || inCuisine || inAddress || inDesc || inMenu)) {
            return null;
          }
          r.match_reason = inName
            ? "name"
            : inCuisine
            ? "cuisine"
            : inAddress
            ? "address"
            : inMenu
            ? "menu"
            : "name";
        }

        return r;
      })
      .filter((x): x is Restaurant => x !== null)
      // open first, then by menu size
      .sort((a, b) => {
        if (a.is_open !== b.is_open) return a.is_open ? -1 : 1;
        return b.menu_count - a.menu_count;
      });

    return NextResponse.json({ restaurants });
  } catch (err: any) {
    console.error("restaurants api error", err?.message || err);
    return NextResponse.json({ restaurants: [] });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
