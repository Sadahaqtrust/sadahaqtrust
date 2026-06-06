/**
 * Shared types for the personalized-food-landing feature.
 * See .kiro/specs/personalized-food-landing/design.md §Components and Interfaces.
 */

export type MatchReason =
  | "name"
  | "cuisine"
  | "address"
  | "menu"
  | "history"
  | "all";

export type Restaurant = {
  id: string;
  name: string;
  /** URL-safe handle assigned by MenuLinkResolver for the current batch. */
  handle?: string;
  /** Canonical href — /food/r/{slug} or /food/r/id/{id}. */
  href?: string;
  cuisine: string;
  veg_nonveg: "Veg" | "Non-Veg" | "Both";
  address: string;
  city: string;
  opening_time: string;
  closing_time: string;
  is_open: boolean;
  hours_24x7: boolean;
  menu_count: number;
  min_price_inr: number | null;
  match_reason: MatchReason;
};

export type SanitizedSearch = {
  queryText: string;
  queryTruncated: boolean;
  cuisine: string | null;
  cuisineRejected: boolean;
};

export type RateDecision =
  | { ok: true }
  | { ok: false; reason: "visitor" | "ip" };

export type VisitorIdentity = {
  visitorId: string;
  setCookieHeader?: string;
  source: "cookie" | "minted" | "malformed-replaced";
};

export type PendingSearchEvent = {
  visitorId: string;
  queryText: string;
  queryTruncated: boolean;
  cuisine: string | null;
  resultRestaurantIds: string[];
  resultCount: number;
  matchReasonBreakdown: Record<string, number>;
  userAgent: string;
  locale: string;
  sourceIpHash: string;
};

export type LandingResult = {
  restaurants: Restaurant[];
  personalized: boolean;
  considered: number;
};
