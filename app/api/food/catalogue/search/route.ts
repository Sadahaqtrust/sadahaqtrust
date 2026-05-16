/**
 * GET /api/food/catalogue/search
 * Unified global search across restaurants + dishes.
 *
 * Params:
 *   mode      = "near" | "restaurant" | "cuisine" | "any" (default "any")
 *   q         = free-text term (optional)
 *   cuisine   = cuisine filter (optional)
 *   subRegion = state filter (optional)
 *   foodCategory = category filter (optional)
 *   restaurantId = exact channel id (optional; from typeahead pick)
 *   lat, lng, radius_m = geo filter for mode=near (radius in metres)
 *   page, pageSize
 */
import { NextResponse, type NextRequest } from "next/server";
import { Client } from "pg";
import { DATABASE_URL } from "@/lib/food/pg-data";
import { slugify } from "@/lib/food/slug";

export const dynamic = "force-dynamic";

function toInt(s: string | null, def: number, min: number, max: number) {
  const n = parseInt(s ?? "", 10);
  return Number.isNaN(n) ? def : Math.max(min, Math.min(max, n));
}
function toFloat(s: string | null): number | null {
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Haversine in metres. */
function metresBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = (sp.get("mode") || "any").toLowerCase();
  const q = (sp.get("q") || "").trim();
  const cuisine = sp.get("cuisine")?.trim() || null;
  const subRegion = sp.get("subRegion")?.trim() || null;
  const foodCategory = sp.get("foodCategory")?.trim() || null;
  const restaurantId = sp.get("restaurantId")?.trim() || null;
  const lat = toFloat(sp.get("lat"));
  const lng = toFloat(sp.get("lng"));
  const radius = toInt(sp.get("radius_m"), 1000, 100, 50_000);
  const page = toInt(sp.get("page"), 1, 1, 10000);
  const pageSize = toInt(sp.get("pageSize"), 20, 1, 50);

  const c = new Client({ connectionString: DATABASE_URL });
  try {
    await c.connect();

    // ---- Restaurants (always cheap, used by every mode) ----
    const restRes = await c.query<{
      id: string;
      name: string;
      metadata: Record<string, any> | null;
      n: string;
    }>(
      `SELECT sc.id, sc.name, sc.metadata, COUNT(fdc.*)::text AS n
         FROM sales_channel sc
         LEFT JOIN food_dish_catalogue fdc ON fdc.sales_channel_id = sc.id
        WHERE sc.deleted_at IS NULL
          AND COALESCE(sc.metadata->>'platform','') = 'food.digitalrohtak.online'
        GROUP BY sc.id, sc.name, sc.metadata`,
    );
    type RestRow = typeof restRes.rows[number];
    let rests = restRes.rows.map((r) => {
      const rLat = r.metadata?.lat != null ? Number(r.metadata.lat) : null;
      const rLng = r.metadata?.lng != null ? Number(r.metadata.lng) : null;
      return {
        id: r.id,
        name: r.name,
        cuisine: r.metadata?.cuisine_type || "",
        address: r.metadata?.address || "",
        is_open:
          r.metadata?.hours_24x7 === true ? true : r.metadata?.is_open !== false,
        menu_count: Number(r.n),
        lat: rLat,
        lng: rLng,
        distance_m:
          lat != null && lng != null && rLat != null && rLng != null
            ? Math.round(metresBetween(lat, lng, rLat, rLng))
            : null,
        href: `/food/r/${slugify(r.name)}`,
      };
    });

    // ---- Filter restaurants by mode ----
    if (mode === "near") {
      if (lat == null || lng == null) {
        return NextResponse.json({
          mode, restaurants: [], dishes: [], total_restaurants: 0, total_dishes: 0,
          reason: "missing_coords",
        });
      }
      rests = rests.filter(
        (r) => r.distance_m != null && r.distance_m <= radius,
      );
      rests.sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
    } else if (mode === "restaurant") {
      if (q.length >= 3) {
        const Q = q.toLowerCase();
        const scored: { r: (typeof rests)[number]; tier: number }[] = [];
        for (const r of rests) {
          const n = r.name.toLowerCase();
          if (n.startsWith(Q)) scored.push({ r, tier: 0 });
          else if (n.includes(Q)) scored.push({ r, tier: 1 });
        }
        scored.sort((a, b) => {
          if (a.tier !== b.tier) return a.tier - b.tier;
          if (a.r.is_open !== b.r.is_open) return a.r.is_open ? -1 : 1;
          return b.r.menu_count - a.r.menu_count;
        });
        rests = scored.slice(0, 20).map((x) => x.r);
      } else {
        rests = [];
      }
    } else if (mode === "cuisine") {
      // restaurant listing is not the main payload; still return all as a sidebar signal.
      rests = rests.sort((a, b) => b.menu_count - a.menu_count).slice(0, 10);
    } else {
      // any → free-text across restaurant names (prefix/substring)
      if (q.length >= 2) {
        const Q = q.toLowerCase();
        rests = rests.filter(
          (r) => r.name.toLowerCase().includes(Q) || r.cuisine.toLowerCase().includes(Q),
        );
      } else {
        rests = rests.sort((a, b) => b.menu_count - a.menu_count).slice(0, 8);
      }
    }

    // ---- Dishes (main payload for cuisine / any / near) ----
    const params: unknown[] = [];
    const bind = (v: unknown) => {
      params.push(v);
      return `$${params.length}`;
    };
    const where: string[] = [];
    if (cuisine) where.push(`fdc.cuisine = ${bind(cuisine)}`);
    if (subRegion) where.push(`fdc.sub_region = ${bind(subRegion)}`);
    if (foodCategory) where.push(`fdc.food_category = ${bind(foodCategory)}`);

    // Restaurant scoping
    if (mode === "restaurant" && restaurantId) {
      where.push(`fdc.sales_channel_id = ${bind(restaurantId)}`);
    } else if (mode === "near") {
      const ids = rests.map((r) => r.id);
      if (ids.length === 0) {
        return NextResponse.json({
          mode, restaurants: rests, dishes: [],
          total_restaurants: 0, total_dishes: 0,
        });
      }
      where.push(`fdc.sales_channel_id = ANY(${bind(ids)}::text[])`);
    }

    if (q && q.length >= 2 && mode !== "restaurant") {
      where.push(`fdc.display_title ILIKE '%' || ${bind(q)} || '%'`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const totalRes = await c.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM food_dish_catalogue fdc ${whereSql}`,
      params,
    );
    const totalDishes = Number(totalRes.rows[0]?.n ?? 0);

    const listParams = [...params, pageSize, (page - 1) * pageSize];
    const dishRes = await c.query<{
      id: string;
      source_product_id: string;
      display_title: string;
      cuisine: string;
      sub_region: string | null;
      food_category: string | null;
      price_inr: number | null;
      veg_nonveg: string | null;
      sales_channel_id: string | null;
      restaurant_name: string | null;
    }>(
      `SELECT fdc.id, fdc.source_product_id, fdc.display_title, fdc.cuisine,
              fdc.sub_region, fdc.food_category, fdc.price_inr, fdc.veg_nonveg,
              fdc.sales_channel_id, sc.name AS restaurant_name
         FROM food_dish_catalogue fdc
         LEFT JOIN sales_channel sc ON sc.id = fdc.sales_channel_id
         ${whereSql}
         ORDER BY fdc.display_title
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      listParams,
    );

    const dishes = dishRes.rows.map((r) => ({
      id: r.id,
      source_product_id: r.source_product_id,
      display_title: r.display_title,
      cuisine: r.cuisine,
      sub_region: r.sub_region,
      food_category: r.food_category,
      price_inr: r.price_inr,
      veg_nonveg: r.veg_nonveg,
      restaurant: r.restaurant_name
        ? {
            id: r.sales_channel_id,
            name: r.restaurant_name,
            href: `/food/r/${slugify(r.restaurant_name)}`,
          }
        : null,
    }));

    return NextResponse.json(
      {
        mode,
        restaurants: rests,
        dishes,
        total_restaurants: rests.length,
        total_dishes: totalDishes,
        page,
        pageSize,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("food.catalogue.search error", (err as Error)?.message);
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  } finally {
    try { await c.end(); } catch { /* best-effort */ }
  }
}
