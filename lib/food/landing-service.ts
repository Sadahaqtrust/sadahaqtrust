/**
 * LandingService. Derives a Personalized_Listing from the visitor's recent
 * Search_Event history, with a Fallback_Listing when history is empty or
 * the visitor has opted out.
 *
 * Requirements: 1.*, 2.*, 10.5; Correctness Properties 2, 3, 8-read.
 *
 * The pure `dedupOrder` function is exported separately so the P2 property
 * test can target it without a live database.
 */
import type { LandingResult, Restaurant } from "./types";

export type SearchEventLite = {
  created_at: number | Date;
  result_restaurant_ids: string[];
};

function tsOf(d: number | Date): number {
  return typeof d === "number" ? d : d.getTime();
}

/**
 * Deduplicate restaurants newest-first, preserving first occurrence, then
 * apply the open-first resort per design §Data Flow 2.
 *
 * Ordering keys:
 *   1. (is_open || hours_24x7) desc
 *   2. most-recent contributing event created_at desc
 *   3. restaurant.id asc
 */
export function dedupOrder(
  events: SearchEventLite[],
  catalogue: Restaurant[],
): Restaurant[] {
  const byId = new Map<string, Restaurant>();
  for (const r of catalogue) byId.set(r.id, r);

  // Sort events newest first (stable within equal timestamps by input order).
  const sorted = [...events].sort((a, b) => tsOf(b.created_at) - tsOf(a.created_at));

  const firstSeen = new Map<string, number>(); // restaurantId -> newest contributing ts
  for (const ev of sorted) {
    const ts = tsOf(ev.created_at);
    for (const rid of ev.result_restaurant_ids) {
      if (!byId.has(rid)) continue;
      if (!firstSeen.has(rid)) firstSeen.set(rid, ts);
    }
  }

  const picked = Array.from(firstSeen.keys()).map((id) => byId.get(id)!);

  picked.sort((a, b) => {
    const aOpen = a.is_open || a.hours_24x7 ? 1 : 0;
    const bOpen = b.is_open || b.hours_24x7 ? 1 : 0;
    if (aOpen !== bOpen) return bOpen - aOpen;
    const aTs = firstSeen.get(a.id) ?? 0;
    const bTs = firstSeen.get(b.id) ?? 0;
    if (aTs !== bTs) return bTs - aTs;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return picked;
}

export type LandingServiceDataSource = {
  isOptedOut(visitorId: string): Promise<boolean>;
  /** Latest N events for visitor, newest first. */
  recentEvents(
    visitorId: string,
    limit: number,
  ): Promise<SearchEventLite[]>;
  /** The visitor's full non-expired history, newest first. */
  fullHistory(visitorId: string): Promise<SearchEventLite[]>;
  /** All platform restaurants, sorted open-first then by menu_count desc, id asc. */
  catalogue(): Promise<Restaurant[]>;
};

export type LandingServiceOptions = {
  N?: number;
  F?: number;
  minDistinct?: number;
};

export type LandingService = {
  getListing(visitorId: string): Promise<LandingResult>;
};

function clampConfig(opts: LandingServiceOptions) {
  const N = Math.min(Math.max(opts.N ?? 10, 5), 50);
  const F = Math.min(Math.max(opts.F ?? 10, 3), 20);
  const minDistinct = Math.max(opts.minDistinct ?? 3, 1);
  return { N, F, minDistinct };
}

function fallbackFromCatalogue(catalogue: Restaurant[], F: number): Restaurant[] {
  const open = catalogue.filter((r) => r.is_open || r.hours_24x7);
  if (open.length >= F) return open.slice(0, F);
  const closed = catalogue.filter((r) => !(r.is_open || r.hours_24x7));
  return [...open, ...closed].slice(0, F);
}

export function createLandingService(
  ds: LandingServiceDataSource,
  opts: LandingServiceOptions = {},
): LandingService {
  const { N, F, minDistinct } = clampConfig(opts);
  return {
    async getListing(visitorId: string): Promise<LandingResult> {
      let optedOut = false;
      try {
        optedOut = await ds.isOptedOut(visitorId);
      } catch {
        optedOut = false;
      }
      const catalogue = await ds.catalogue();
      if (optedOut) {
        return {
          restaurants: fallbackFromCatalogue(catalogue, F),
          personalized: false,
          considered: 0,
        };
      }

      let events: SearchEventLite[] = [];
      try {
        events = await ds.recentEvents(visitorId, N);
      } catch {
        events = [];
      }
      let considered = events.length;
      let picked = dedupOrder(events, catalogue);

      if (picked.length < minDistinct) {
        // Expand to full history per Req 1.6.
        let full: SearchEventLite[] = [];
        try {
          full = await ds.fullHistory(visitorId);
        } catch {
          full = events;
        }
        considered = full.length;
        picked = dedupOrder(full, catalogue);
      }

      if (picked.length === 0) {
        return {
          restaurants: fallbackFromCatalogue(catalogue, F),
          personalized: false,
          considered,
        };
      }
      return { restaurants: picked, personalized: true, considered };
    },
  };
}
