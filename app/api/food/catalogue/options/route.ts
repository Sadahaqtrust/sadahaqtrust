/**
 * GET /api/food/catalogue/options
 * Returns cuisines, states (Indian sub_regions), food categories, and
 * the restaurants that have at least one catalogue row.
 */
import { NextResponse } from "next/server";
import { Client } from "pg";
import { DATABASE_URL } from "@/lib/food/pg-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const c = new Client({ connectionString: DATABASE_URL });
  try {
    await c.connect();
    const cuisineRes = await c.query<{ cuisine: string; n: string }>(
      `SELECT cuisine, COUNT(*)::text AS n FROM food_dish_catalogue GROUP BY 1 ORDER BY 2 DESC`,
    );
    const stateRes = await c.query<{ sub_region: string }>(
      `SELECT DISTINCT sub_region FROM food_dish_catalogue
        WHERE cuisine = 'Indian' AND sub_region IS NOT NULL
        ORDER BY 1`,
    );
    const catRes = await c.query<{ food_category: string; n: string }>(
      `SELECT food_category, COUNT(*)::text AS n FROM food_dish_catalogue
        WHERE food_category IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC`,
    );
    const restRes = await c.query<{
      id: string;
      name: string;
      metadata: Record<string, any> | null;
      n: string;
    }>(
      `SELECT sc.id, sc.name, sc.metadata,
              COUNT(fdc.*)::text AS n
         FROM sales_channel sc
         JOIN food_dish_catalogue fdc ON fdc.sales_channel_id = sc.id
        WHERE sc.deleted_at IS NULL
          AND COALESCE(sc.metadata->>'platform','') = 'food.digitalrohtak.online'
        GROUP BY sc.id, sc.name, sc.metadata
        ORDER BY 4 DESC`,
    );

    // Indian first, then by dish count desc
    const cuisines = cuisineRes.rows.map((r) => r.cuisine);
    cuisines.sort((a, b) => {
      if (a === "Indian") return -1;
      if (b === "Indian") return 1;
      return a.localeCompare(b);
    });
    const uniqueCuisines = Array.from(new Set(cuisines));

    return NextResponse.json({
      cuisines: uniqueCuisines,
      states: stateRes.rows.map((r) => r.sub_region),
      food_categories: catRes.rows.map((r) => r.food_category),
      restaurants: restRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        cuisine: r.metadata?.cuisine_type || "",
        is_open:
          r.metadata?.hours_24x7 === true ? true : r.metadata?.is_open !== false,
        menu_count: Number(r.n),
      })),
      generated_at: new Date().toISOString(),
    }, { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=300" } });
  } catch (err) {
    console.error("food.catalogue.options error", (err as Error)?.message);
    return NextResponse.json({ error: "options_failed" }, { status: 500 });
  } finally {
    try { await c.end(); } catch { /* best-effort */ }
  }
}
