/**
 * Pure ranking helper for the Phase 1 restaurant typeahead.
 * See design.md §3.2.
 *
 * Input list is NEVER mutated. All comparison is case-insensitive on
 * `.name` only. When `query.trim().length < 3` the output is empty
 * (Req 1.1 / Property P7).
 */
import type { RestaurantStub } from "./catalogue-static";

export type MatchTier = 0 | 1 | 2; // 0 = prefix, 1 = substring, 2 = fuzzy

export type Ranked = RestaurantStub & {
  tier: MatchTier;
  score: number; // lower is better within a tier
};

export const MIN_QUERY = 3;
export const MAX_RESULTS = 10;

/** Levenshtein distance bounded by `maxDistance + 1` for early exit. */
function boundedLevenshtein(
  a: string,
  b: string,
  maxDistance: number,
): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > maxDistance) return maxDistance + 1;
  const prev = new Array(bl + 1);
  const cur = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > maxDistance) return maxDistance + 1;
    for (let j = 0; j <= bl; j++) prev[j] = cur[j];
  }
  return prev[bl];
}

function tierAndScore(name: string, query: string): { tier: MatchTier; score: number } | null {
  const n = name.toLowerCase();
  const q = query.toLowerCase();
  if (n.startsWith(q)) return { tier: 0, score: n.length - q.length };
  const idx = n.indexOf(q);
  if (idx !== -1) return { tier: 1, score: idx };
  const slice = n.slice(0, Math.min(n.length, q.length + 2));
  const d = boundedLevenshtein(slice, q, 2);
  if (d <= 2) return { tier: 2, score: d };
  return null;
}

/**
 * Rank restaurants by (tier asc, is_open desc, menu_count desc, id asc)
 * and truncate to MAX_RESULTS. Pure.
 */
export function rankRestaurants(
  list: readonly RestaurantStub[],
  query: string,
): Ranked[] {
  const trimmed = (query ?? "").trim();
  if (trimmed.length < MIN_QUERY) return [];
  const scored: Ranked[] = [];
  for (const r of list) {
    const t = tierAndScore(r.name, trimmed);
    if (!t) continue;
    scored.push({ ...r, tier: t.tier, score: t.score });
  }
  scored.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.is_open !== b.is_open) return a.is_open ? -1 : 1;
    if (a.menu_count !== b.menu_count) return b.menu_count - a.menu_count;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return scored.slice(0, MAX_RESULTS);
}

/**
 * Pure builder used by Property P6 and CuisineSelect: pins "Indian"
 * first, sorts the rest alphabetically (case-insensitive).
 */
export function buildCuisineList(input: readonly string[]): string[] {
  const seen = new Set<string>();
  const rest: string[] = [];
  let hasIndian = false;
  for (const c of input) {
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (key === "indian") {
      hasIndian = true;
      continue;
    }
    rest.push(c);
  }
  rest.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), "en"));
  return hasIndian ? ["Indian", ...rest] : rest;
}
