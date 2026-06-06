/**
 * GET /api/food/catalogue/dishes
 * Filter params: cuisine, subRegion, foodCategory, q, restaurant, page, pageSize
 * Returns paginated dishes from food_dish_catalogue joined to sales_channel.
 */
import { NextResponse, type NextRequest } from "next/server";
import { Client } from "pg";
import { DATABASE_URL } from "@/lib/food/pg-data";
import { slugify } from "@/lib/food/slug";

export const dynamic = "force-dynamic";

function clampInt(raw: string | null, def: number, min: number, max: number) {
  const n = parseInt(raw ?? "", 10);
  if (Number.isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const cuisine = sp.get("cuisine")?.trim() || null;
  const subRegion = sp.get("subRegion")?.trim() || null;
  const foodCategory = sp.get("foodCategory")?.trim() || null;
  const q = sp.get("q")?.trim() || "";
  const restaurant = sp.get("restaurant")?.trim() || null;
  const page = clampInt(sp.get("page"), 1, 1, 10000);
  const pageSize = clampInt(sp.get("pageSize"), 20, 1, 50);
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: unknown[] = [];
  const bind = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (cuisine) where.push(`fdc.cuisine = ${bind(cuisine)}`);
  if (subRegion) where.push(`fdc.sub_region = ${bind(subRegion)}`);
  if (foodCategory) where.push(`fdc.food_category = ${bind(foodCategory)}`);
  if (restaurant) where.push(`fdc.sales_channel_id = ${bind(restaurant)}`);
  if (q && q.length >= 2) where.push(`fdc.display_title ILIKE '%' || ${bind(q)} || '%'`);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const c = new Client({ connectionString: DATABASE_URL });
  try {
    await c.connect();
    const totalRes = await c.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM food_dish_catalogue fdc ${whereSql}`,
      params,
    );
    const total = Number(totalRes.rows[0]?.n ?? 0);

    const listParams = [...params, pageSize, offset];
    const rowsRes = await c.query<{
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
      `SELECT
         fdc.id, fdc.source_product_id, fdc.display_title,
         fdc.cuisine, fdc.sub_region, fdc.food_category,
         fdc.price_inr, fdc.veg_nonveg,
         fdc.sales_channel_id,
         sc.name AS restaurant_name
       FROM food_dish_catalogue fdc
       LEFT JOIN sales_channel sc ON sc.id = fdc.sales_channel_id
       ${whereSql}
       ORDER BY fdc.cuisine, fdc.sub_region NULLS LAST, fdc.food_category NULLS LAST, fdc.display_title
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      listParams,
    );

    const items = rowsRes.rows.map((r) => ({
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
      { items, total, page, pageSize },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    console.error("food.catalogue.dishes error", (err as Error)?.message);
    return NextResponse.json({ error: "dishes_failed" }, { status: 500 });
  } finally {
    try { await c.end(); } catch { /* best-effort */ }
  }
}
