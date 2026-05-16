/**
 * Server-side helpers for a restaurant's menu page.
 * Used by app/food/r/[handle]/page.tsx and app/food/r/id/[id]/page.tsx.
 *
 * Resolution order:
 *   1. Slug-to-id: lookup a `sales_channel` whose name slugifies to the
 *      given {handle}. Case-insensitive, NFKD + non-alphanumerics → hyphens
 *      at the SQL level. Must have metadata.platform='food.digitalrohtak.online'.
 *   2. Direct id: `sales_channel.id` == {id}.
 * After resolving, we list its published products (paginated) and the
 * public-facing metadata.
 */
import { Client } from "pg";
import { DATABASE_URL } from "./pg-data";
import { slugify } from "./slug";
import type { Restaurant } from "./types";

export type MenuProduct = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  weight: number | null;
  thumbnail: string | null;
  price_inr: number | null;
  veg_nonveg: "Veg" | "Non-Veg" | "Both" | null;
  category: string | null;
  cuisine_origin: string | null;
};

export type MenuPayload = {
  restaurant: Restaurant;
  products: MenuProduct[];
  total: number;
  page: number;
  pageSize: number;
};

function channelToRestaurant(row: {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  menu_count: number;
}): Restaurant {
  const m = (row.metadata ?? {}) as Record<string, any>;
  return {
    id: row.id,
    name: row.name,
    cuisine: m.cuisine_type || "",
    veg_nonveg: (m.veg_nonveg as Restaurant["veg_nonveg"]) || "Both",
    address: m.address || "",
    city: m.city || "Rohtak",
    opening_time: m.opening_time || "09:00",
    closing_time: m.closing_time || "23:00",
    is_open: m.hours_24x7 === true ? true : m.is_open !== false,
    hours_24x7: m.hours_24x7 === true,
    menu_count: row.menu_count,
    min_price_inr: m.min_price_inr != null ? Number(m.min_price_inr) : null,
    match_reason: "all",
  };
}

export async function findRestaurantByHandle(
  handle: string,
): Promise<Restaurant | null> {
  if (!handle) return null;
  const target = slugify(handle);
  if (!target) return null;
  const c = new Client({ connectionString: DATABASE_URL });
  try {
    await c.connect();
    const { rows } = await c.query<{
      id: string;
      name: string;
      description: string | null;
      metadata: Record<string, unknown> | null;
    }>(
      `SELECT id, name, description, metadata
         FROM sales_channel
        WHERE deleted_at IS NULL
          AND COALESCE(metadata->>'platform','') = 'food.digitalrohtak.online'`,
    );
    const matches = rows.filter((r) => slugify(r.name) === target);
    if (matches.length !== 1) return null;
    const sc = matches[0];
    const countRes = await c.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n
         FROM product_sales_channel psc
         JOIN product p ON p.id = psc.product_id
        WHERE p.deleted_at IS NULL AND p.status = 'published'
          AND psc.sales_channel_id = $1`,
      [sc.id],
    );
    return channelToRestaurant({
      ...sc,
      menu_count: Number(countRes.rows[0]?.n ?? 0),
    });
  } finally {
    try {
      await c.end();
    } catch {
      /* best-effort */
    }
  }
}

export async function findRestaurantById(
  id: string,
): Promise<Restaurant | null> {
  if (!id) return null;
  const c = new Client({ connectionString: DATABASE_URL });
  try {
    await c.connect();
    const { rows } = await c.query<{
      id: string;
      name: string;
      description: string | null;
      metadata: Record<string, unknown> | null;
    }>(
      `SELECT id, name, description, metadata
         FROM sales_channel
        WHERE deleted_at IS NULL
          AND id = $1
          AND COALESCE(metadata->>'platform','') = 'food.digitalrohtak.online'`,
      [id],
    );
    if (rows.length === 0) return null;
    const sc = rows[0];
    const countRes = await c.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n
         FROM product_sales_channel psc
         JOIN product p ON p.id = psc.product_id
        WHERE p.deleted_at IS NULL AND p.status = 'published'
          AND psc.sales_channel_id = $1`,
      [sc.id],
    );
    return channelToRestaurant({
      ...sc,
      menu_count: Number(countRes.rows[0]?.n ?? 0),
    });
  } finally {
    try {
      await c.end();
    } catch {
      /* best-effort */
    }
  }
}

export async function loadMenu(
  channelId: string,
  page: number,
  pageSize: number,
  q?: string,
): Promise<{ products: MenuProduct[]; total: number }> {
  const offset = Math.max(0, (page - 1) * pageSize);
  const c = new Client({ connectionString: DATABASE_URL });
  try {
    await c.connect();
    const filter = q && q.trim().length >= 2 ? q.trim().toLowerCase() : "";
    const params: unknown[] = [channelId];
    let whereQ = "";
    if (filter) {
      params.push(filter);
      whereQ = `AND (
        LOWER(p.title)       LIKE '%' || $2 || '%'
     OR LOWER(p.handle)      LIKE '%' || $2 || '%'
     OR LOWER(p.description) LIKE '%' || $2 || '%'
      )`;
    }

    const totalRes = await c.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n
         FROM product p
         JOIN product_sales_channel psc ON psc.product_id = p.id
        WHERE p.deleted_at IS NULL AND p.status = 'published'
          AND psc.sales_channel_id = $1
          ${whereQ}`,
      params,
    );
    const total = Number(totalRes.rows[0]?.n ?? 0);

    const listParams: unknown[] = [...params, pageSize, offset];
    const listOffsetIdx = listParams.length - 1; // 1-based index to bind below
    const listLimitIdx = listParams.length;
    // When there is no filter, params = [channelId, pageSize, offset]
    // When there is a filter,    params = [channelId, filter, pageSize, offset]
    // We'll reconstruct the proper positional placeholders:
    const limitPlaceholder = `$${listLimitIdx - 1 + 1}`; // $2 or $3
    const offsetPlaceholder = `$${listOffsetIdx + 1}`; //   wrong — rebuild below
    void limitPlaceholder;
    void offsetPlaceholder;

    // Simpler: just build the SQL string using params.length bookkeeping.
    const baseLen = filter ? 2 : 1;
    const sqlList = `
      SELECT
        p.id, p.title, p.handle, p.description, p.weight, p.thumbnail,
        p.metadata AS product_metadata,
        pv.metadata AS variant_metadata,
        pr.amount AS price_amount
      FROM product p
      JOIN product_sales_channel psc ON psc.product_id = p.id
      LEFT JOIN product_variant pv ON pv.product_id = p.id
      LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
      LEFT JOIN price pr ON pr.price_set_id = pvps.price_set_id
        AND pr.currency_code = 'inr'
        AND pr.deleted_at IS NULL
      WHERE p.deleted_at IS NULL AND p.status = 'published'
        AND psc.sales_channel_id = $1
        ${whereQ}
      ORDER BY p.created_at DESC, p.id ASC
      LIMIT $${baseLen + 1} OFFSET $${baseLen + 2}
    `;

    const listRes = await c.query<{
      id: string;
      title: string;
      handle: string;
      description: string | null;
      weight: string | number | null;
      thumbnail: string | null;
      product_metadata: Record<string, unknown> | null;
      variant_metadata: Record<string, unknown> | null;
      price_amount: string | number | null;
    }>(sqlList, listParams);

    // pg returns one row per variant × price; dedupe by product id and
    // keep the cheapest INR price seen.
    const byId = new Map<string, MenuProduct>();
    for (const row of listRes.rows) {
      const m = (row.product_metadata ?? {}) as Record<string, any>;
      const price = row.price_amount != null ? Number(row.price_amount) : null;
      const existing = byId.get(row.id);
      if (existing) {
        if (price != null && (existing.price_inr == null || price < existing.price_inr)) {
          existing.price_inr = price;
        }
        continue;
      }
      byId.set(row.id, {
        id: row.id,
        title: row.title,
        handle: row.handle,
        description: row.description,
        weight: row.weight != null ? Number(row.weight) : null,
        thumbnail: row.thumbnail,
        price_inr: price,
        veg_nonveg:
          m.veg_nonveg === "Veg" || m.veg_nonveg === "Non-Veg" || m.veg_nonveg === "Both"
            ? (m.veg_nonveg as "Veg" | "Non-Veg" | "Both")
            : null,
        category: typeof m.fssai_category === "string" ? m.fssai_category : null,
        cuisine_origin:
          typeof m.cuisine_origin === "string" ? m.cuisine_origin : null,
      });
    }
    return { products: Array.from(byId.values()), total };
  } finally {
    try {
      await c.end();
    } catch {
      /* best-effort */
    }
  }
}
