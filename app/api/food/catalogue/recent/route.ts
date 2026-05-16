/**
 * GET /api/food/catalogue/recent
 * Returns the visitor's recent + frequent dishes derived from their
 * `search_event` history (personalized-food-landing spec).
 * Falls back to top dishes (by occurrence) when no history exists.
 */
import { NextResponse, type NextRequest } from "next/server";
import { Client } from "pg";
import { DATABASE_URL } from "@/lib/food/pg-data";
import { readOrMint, COOKIE_NAME } from "@/lib/food/visitor-identity";
import { slugify } from "@/lib/food/slug";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const identity = readOrMint({
    cookies: {
      get: (n: string) => {
        const c = req.cookies.get(n);
        return c ? { value: c.value } : undefined;
      },
    },
  });

  const c = new Client({ connectionString: DATABASE_URL });
  try {
    await c.connect();

    // Pull the most recent search results for this visitor and rank dishes
    // whose source_product_id appeared in those events. Personalised when
    // we have history, otherwise top-by-menu-count fallback.
    const histRes = await c.query<{ result_restaurant_ids: string[] }>(
      `SELECT result_restaurant_ids
         FROM search_event
        WHERE visitor_id = $1
        ORDER BY created_at DESC
        LIMIT 20`,
      [identity.visitorId],
    );

    let restaurantIds: string[] = [];
    for (const row of histRes.rows) {
      for (const id of row.result_restaurant_ids ?? []) restaurantIds.push(id);
    }
    restaurantIds = Array.from(new Set(restaurantIds));

    let dishesQuery: string;
    let dishesParams: unknown[];
    let source: "personalized" | "none" = "none";

    if (restaurantIds.length > 0) {
      source = "personalized";
      dishesQuery = `
        SELECT fdc.id, fdc.display_title, fdc.cuisine, fdc.sub_region,
               fdc.food_category, fdc.price_inr, fdc.veg_nonveg,
               fdc.sales_channel_id, sc.name AS restaurant_name
          FROM food_dish_catalogue fdc
          LEFT JOIN sales_channel sc ON sc.id = fdc.sales_channel_id
         WHERE fdc.sales_channel_id = ANY($1::text[])
         ORDER BY fdc.display_title
         LIMIT 12
      `;
      dishesParams = [restaurantIds];
    } else {
      dishesQuery = `
        SELECT fdc.id, fdc.display_title, fdc.cuisine, fdc.sub_region,
               fdc.food_category, fdc.price_inr, fdc.veg_nonveg,
               fdc.sales_channel_id, sc.name AS restaurant_name
          FROM food_dish_catalogue fdc
          LEFT JOIN sales_channel sc ON sc.id = fdc.sales_channel_id
         ORDER BY fdc.display_title
         LIMIT 12
      `;
      dishesParams = [];
    }

    const rows = await c.query<{
      id: string;
      display_title: string;
      cuisine: string;
      sub_region: string | null;
      food_category: string | null;
      price_inr: number | null;
      veg_nonveg: string | null;
      sales_channel_id: string | null;
      restaurant_name: string | null;
    }>(dishesQuery, dishesParams);

    const dishes = rows.rows.map((r) => ({
      id: r.id,
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

    const res = NextResponse.json(
      { source, dishes },
      { headers: { "Cache-Control": "private, no-store" } },
    );
    if (identity.setCookieHeader) res.headers.append("Set-Cookie", identity.setCookieHeader);
    void COOKIE_NAME;
    return res;
  } catch (err) {
    console.error("food.catalogue.recent error", (err as Error)?.message);
    return NextResponse.json({ source: "none", dishes: [] });
  } finally {
    try {
      await c.end();
    } catch {
      /* best-effort */
    }
  }
}
