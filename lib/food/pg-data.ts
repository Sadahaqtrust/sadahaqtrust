/**
 * Postgres helpers shared by the /api/food/landing and /api/food/search
 * route handlers. Backed by the existing `medusa_digitalrohtak` database.
 *
 * Every function creates a short-lived pg Client because the phase-1 traffic
 * on /food is very low. We can promote to a pool later without changing
 * call-sites (all helpers accept an injected `Client` so tests can stub).
 */
import { Client } from "pg";
import type { Restaurant, MatchReason } from "./types";
import type {
  LandingServiceDataSource,
  SearchEventLite,
} from "./landing-service";

export const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://medusa_user:Saanvi02052016%40@localhost:5432/medusa_digitalrohtak";

export type ChannelRow = {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, any> | null;
};

export async function newClient(): Promise<Client> {
  const c = new Client({ connectionString: DATABASE_URL });
  await c.connect();
  return c;
}

export async function selectPlatformChannels(c: Client): Promise<ChannelRow[]> {
  const res = await c.query<ChannelRow>(
    `SELECT id, name, description, metadata
       FROM sales_channel
      WHERE deleted_at IS NULL
        AND COALESCE(metadata->>'platform','') = 'food.digitalrohtak.online'`,
  );
  return res.rows;
}

export async function selectMenuCounts(
  c: Client,
  channelIds: string[],
): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  if (channelIds.length === 0) return m;
  const res = await c.query<{ sales_channel_id: string; n: string }>(
    `SELECT psc.sales_channel_id, COUNT(*)::text AS n
       FROM product_sales_channel psc
       JOIN product p ON p.id = psc.product_id
      WHERE p.deleted_at IS NULL
        AND p.status = 'published'
        AND psc.sales_channel_id = ANY($1::text[])
      GROUP BY psc.sales_channel_id`,
    [channelIds],
  );
  for (const r of res.rows) m.set(r.sales_channel_id, Number(r.n));
  return m;
}

export async function selectMenuMatches(
  c: Client,
  channelIds: string[],
  q: string,
): Promise<Set<string>> {
  const out = new Set<string>();
  if (!q || channelIds.length === 0) return out;
  const res = await c.query<{ sales_channel_id: string }>(
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
    [channelIds, q.toLowerCase()],
  );
  for (const r of res.rows) out.add(r.sales_channel_id);
  return out;
}

function channelToRestaurant(
  sc: ChannelRow,
  menuCount: number,
  match_reason: MatchReason,
): Restaurant {
  const m = sc.metadata || {};
  return {
    id: sc.id,
    name: sc.name,
    cuisine: m.cuisine_type || "",
    veg_nonveg: (m.veg_nonveg as Restaurant["veg_nonveg"]) || "Both",
    address: m.address || "",
    city: m.city || "Rohtak",
    opening_time: m.opening_time || "09:00",
    closing_time: m.closing_time || "23:00",
    is_open: m.hours_24x7 === true ? true : m.is_open !== false,
    hours_24x7: m.hours_24x7 === true,
    menu_count: menuCount,
    min_price_inr: m.min_price_inr != null ? Number(m.min_price_inr) : null,
    match_reason,
  };
}

export async function loadCatalogue(c: Client): Promise<Restaurant[]> {
  const channels = await selectPlatformChannels(c);
  const counts = await selectMenuCounts(
    c,
    channels.map((ch) => ch.id),
  );
  const restaurants = channels.map((ch) =>
    channelToRestaurant(ch, counts.get(ch.id) ?? 0, "all"),
  );
  return restaurants.sort((a, b) => {
    const aOpen = a.is_open || a.hours_24x7 ? 1 : 0;
    const bOpen = b.is_open || b.hours_24x7 ? 1 : 0;
    if (aOpen !== bOpen) return bOpen - aOpen;
    if (a.menu_count !== b.menu_count) return b.menu_count - a.menu_count;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Narrow catalogue by a free-text query + cuisine chip. Returns restaurants
 * whose name / cuisine / address / description matches OR whose menu
 * contains a product that matches.
 */
export async function searchRestaurants(
  c: Client,
  q: string,
  cuisine: string | null,
): Promise<Restaurant[]> {
  const channels = await selectPlatformChannels(c);
  if (channels.length === 0) return [];
  const channelIds = channels.map((ch) => ch.id);
  const counts = await selectMenuCounts(c, channelIds);
  const menuMatches =
    q && q.length >= 2
      ? await selectMenuMatches(c, channelIds, q)
      : new Set<string>();

  const normQ = q.toLowerCase();
  const normCuisine = (cuisine ?? "").toLowerCase();

  const out: Restaurant[] = [];
  for (const ch of channels) {
    const base = channelToRestaurant(ch, counts.get(ch.id) ?? 0, "all");
    if (normCuisine && !base.cuisine.toLowerCase().includes(normCuisine)) continue;
    let match_reason: MatchReason = "all";
    if (q) {
      const inName = base.name.toLowerCase().includes(normQ);
      const inCuisine = base.cuisine.toLowerCase().includes(normQ);
      const inAddress = base.address.toLowerCase().includes(normQ);
      const inDesc = (ch.description || "").toLowerCase().includes(normQ);
      const inMenu = menuMatches.has(ch.id);
      if (!(inName || inCuisine || inAddress || inDesc || inMenu)) continue;
      match_reason = inName
        ? "name"
        : inCuisine
          ? "cuisine"
          : inAddress
            ? "address"
            : inMenu
              ? "menu"
              : "name";
    }
    out.push({ ...base, match_reason });
  }
  return out.sort((a, b) => {
    const aOpen = a.is_open || a.hours_24x7 ? 1 : 0;
    const bOpen = b.is_open || b.hours_24x7 ? 1 : 0;
    if (aOpen !== bOpen) return bOpen - aOpen;
    return b.menu_count - a.menu_count;
  });
}

/** LandingService data source backed by Postgres. */
export function createPgLandingDataSource(): LandingServiceDataSource {
  return {
    async isOptedOut(visitorId) {
      const c = await newClient();
      try {
        const r = await c.query<{ opt_out: boolean }>(
          "SELECT opt_out FROM visitor_preferences WHERE visitor_id = $1",
          [visitorId],
        );
        return r.rows[0]?.opt_out === true;
      } catch {
        return false;
      } finally {
        try {
          await c.end();
        } catch {
          /* best-effort */
        }
      }
    },
    async recentEvents(visitorId, limit) {
      const c = await newClient();
      try {
        const r = await c.query<{ created_at: Date; result_restaurant_ids: string[] }>(
          `SELECT created_at, result_restaurant_ids
             FROM search_event
            WHERE visitor_id = $1
            ORDER BY created_at DESC
            LIMIT $2`,
          [visitorId, limit],
        );
        return r.rows.map((row) => ({
          created_at: row.created_at,
          result_restaurant_ids: row.result_restaurant_ids ?? [],
        })) as SearchEventLite[];
      } catch {
        return [];
      } finally {
        try {
          await c.end();
        } catch {
          /* best-effort */
        }
      }
    },
    async fullHistory(visitorId) {
      const c = await newClient();
      try {
        const r = await c.query<{ created_at: Date; result_restaurant_ids: string[] }>(
          `SELECT created_at, result_restaurant_ids
             FROM search_event
            WHERE visitor_id = $1
            ORDER BY created_at DESC`,
          [visitorId],
        );
        return r.rows.map((row) => ({
          created_at: row.created_at,
          result_restaurant_ids: row.result_restaurant_ids ?? [],
        })) as SearchEventLite[];
      } catch {
        return [];
      } finally {
        try {
          await c.end();
        } catch {
          /* best-effort */
        }
      }
    },
    async catalogue() {
      const c = await newClient();
      try {
        return await loadCatalogue(c);
      } catch {
        return [];
      } finally {
        try {
          await c.end();
        } catch {
          /* best-effort */
        }
      }
    },
  };
}

export async function isVisitorOptedOut(visitorId: string): Promise<boolean> {
  const c = await newClient();
  try {
    const r = await c.query<{ opt_out: boolean }>(
      "SELECT opt_out FROM visitor_preferences WHERE visitor_id = $1",
      [visitorId],
    );
    return r.rows[0]?.opt_out === true;
  } catch {
    return false;
  } finally {
    try {
      await c.end();
    } catch {
      /* best-effort */
    }
  }
}
