/**
 * Import Rohtak restaurants pulled from the Google Places API (New) into
 * Medusa as Sales Channels, tagged so they appear on food.digitalrohtak.online.
 *
 * Source data: agents/places-fetcher/results/rohtak_restaurants_clean.json
 *   (override with GOOGLE_PLACES_JSON=/abs/path env var)
 *
 * What it does:
 *   1. Reads the Places JSON, keeps only food/eatery types, drops permanently
 *      closed places.
 *   2. Dedupes against existing sales channels by google_place_id and by name.
 *   3. Creates new sales channels with metadata the food storefront reads:
 *        platform = "food.digitalrohtak.online" (required for visibility),
 *        cuisine_type, veg_nonveg, address, city, lat/lng, phone, rating,
 *        opening_time/closing_time, is_open, hours_24x7, min_price_inr, etc.
 *   4. Backfills the platform tag + normalized display metadata onto existing
 *      restaurant channels (source = "zomato") so they too become visible.
 *
 * Idempotent: re-running skips places/names already present and only adds the
 * platform tag to zomato channels that don't have it yet.
 *
 * Usage:
 *   cd medusa-backend
 *   npx medusa exec ./src/scripts/import-google-places-restaurants.ts
 */

import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createSalesChannelsWorkflow } from "@medusajs/medusa/core-flows";
import fs from "fs";

const PLATFORM = "food.digitalrohtak.online";

const DEFAULT_JSON =
  "/home/digitalrohtak/madusa-digitalrohtak/agents/places-fetcher/results/rohtak_restaurants_clean.json";

// Existing channels that are NOT restaurants — never tag these for the food site.
const NON_FOOD_NAMES = new Set(
  ["default sales channel", "verma electronics", "test shop dr"].map((s) =>
    s.toLowerCase()
  )
);

// ── Types ──────────────────────────────────────────────────────────────────

interface PlaceRow {
  place_id: string;
  name: string;
  address?: string;
  phone?: string;
  phone_intl?: string;
  rating?: number | string;
  rating_count?: number | string;
  lat?: number | string;
  lng?: number | string;
  primary_type?: string;
  types?: string;
  price_level?: string;
  status?: string;
  website?: string;
  maps_url?: string;
  hours?: string;
}

// ── Classification helpers ───────────────────────────────────────────────────

// A place is treated as an eatery if any of its Google types contains one of
// these substrings. Grocery/supermarket/park/hospital/etc. are excluded.
const FOOD_KEYWORDS = [
  "restaurant", "cafe", "cafeteria", "bakery", "bakers", "bar", "pizza",
  "ice_cream", "coffee", "dessert", "confectionery", "candy", "cake",
  "chocolate", "sweet", "juice", "snack", "meal_", "food_court",
  "food_delivery", "dhaba", "brewpub", "pub", "buffet", "bistro", "diner",
  "tea_store", "food",
];

function placeTypes(p: PlaceRow): string[] {
  const list = (p.types || "").split("|").map((t) => t.trim()).filter(Boolean);
  if (p.primary_type) list.unshift(p.primary_type);
  return list.map((t) => t.toLowerCase());
}

function isEatery(p: PlaceRow): boolean {
  const status = (p.status || "").toUpperCase();
  if (status === "CLOSED_PERMANENTLY") return false;
  const types = placeTypes(p);
  return types.some((t) => FOOD_KEYWORDS.some((k) => t.includes(k)));
}

const CUISINE_MAP: Record<string, string> = {
  north_indian_restaurant: "North Indian",
  south_indian_restaurant: "South Indian",
  indian_restaurant: "Indian",
  chinese_restaurant: "Chinese",
  chinese_noodle_restaurant: "Chinese",
  italian_restaurant: "Italian",
  pizza_restaurant: "Pizza",
  pizza_delivery: "Pizza",
  fast_food_restaurant: "Fast Food",
  hamburger_restaurant: "American",
  american_restaurant: "American",
  vegetarian_restaurant: "Vegetarian",
  vegan_restaurant: "Vegetarian",
  asian_restaurant: "Asian",
  shawarma_restaurant: "Middle Eastern",
  middle_eastern_restaurant: "Middle Eastern",
  chicken_restaurant: "Chicken",
  cafe: "Cafe",
  coffee_shop: "Cafe",
  internet_cafe: "Cafe",
  cafeteria: "Cafe",
  coffee_stand: "Cafe",
  bakery: "Bakery & Desserts",
  cake_shop: "Bakery & Desserts",
  dessert_shop: "Bakery & Desserts",
  dessert_restaurant: "Bakery & Desserts",
  confectionery: "Bakery & Desserts",
  candy_store: "Bakery & Desserts",
  chocolate_shop: "Bakery & Desserts",
  ice_cream_shop: "Bakery & Desserts",
  juice_shop: "Bakery & Desserts",
  bar: "Bar & Grill",
  bar_and_grill: "Bar & Grill",
  sports_bar: "Bar & Grill",
  pub: "Bar & Grill",
  brewpub: "Bar & Grill",
  fine_dining_restaurant: "Fine Dining",
  buffet_restaurant: "Buffet",
  breakfast_restaurant: "Breakfast",
  family_restaurant: "Family Restaurant",
  food_court: "Food Court",
};

function prettify(t: string): string {
  return t
    .replace(/_restaurant$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function cuisineOf(p: PlaceRow): string {
  const pt = (p.primary_type || "").toLowerCase();
  if (CUISINE_MAP[pt]) return CUISINE_MAP[pt];
  for (const t of placeTypes(p)) if (CUISINE_MAP[t]) return CUISINE_MAP[t];
  return pt ? prettify(pt) : "Restaurant";
}

function vegOf(p: PlaceRow): "Veg" | "Both" {
  const types = placeTypes(p);
  return types.some((t) => t.includes("vegetarian") || t.includes("vegan"))
    ? "Veg"
    : "Both";
}

function minPriceInr(level?: string): number | null {
  switch ((level || "").toUpperCase()) {
    case "PRICE_LEVEL_INEXPENSIVE":
      return 100;
    case "PRICE_LEVEL_MODERATE":
      return 250;
    case "PRICE_LEVEL_EXPENSIVE":
      return 500;
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return 1000;
    default:
      return null;
  }
}

function is24x7(hours?: string): boolean {
  if (!hours) return false;
  const matches = (hours.match(/open 24 hours/gi) || []).length;
  return matches >= 7;
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default async function importGooglePlacesRestaurants({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL);

  const jsonPath = process.env.GOOGLE_PLACES_JSON || DEFAULT_JSON;
  if (!fs.existsSync(jsonPath)) {
    logger.error(`Places JSON not found at ${jsonPath}`);
    return;
  }

  const raw: PlaceRow[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  logger.info(`Loaded ${raw.length} places from ${jsonPath}`);

  const eateries = raw.filter(isEatery);
  logger.info(`${eateries.length} of ${raw.length} are food/eatery types`);

  // ── Load existing channels for dedupe + backfill ──────────────────────────
  const existing = await salesChannelService.listSalesChannels(
    {},
    { take: null }
  );
  const existingNames = new Set(
    existing.map((c) => (c.name || "").trim().toLowerCase())
  );
  const existingPlaceIds = new Set(
    existing
      .map((c) => (c.metadata as any)?.google_place_id)
      .filter(Boolean) as string[]
  );

  // ── 1. Backfill existing restaurant channels (currently hidden) ────────────
  let tagged = 0;
  for (const c of existing) {
    const meta = (c.metadata as any) || {};
    const nameKey = (c.name || "").trim().toLowerCase();
    if (NON_FOOD_NAMES.has(nameKey)) continue;
    // Only touch real restaurant channels: zomato-sourced or already tagged.
    const isRestaurant = meta.source === "zomato" || meta.platform === PLATFORM;
    if (!isRestaurant) continue;
    if (meta.platform === PLATFORM && meta.cuisine_type) continue; // already good

    const merged = {
      ...meta,
      platform: PLATFORM,
      subdomain: PLATFORM,
      city: meta.city || "Rohtak",
      cuisine_type: meta.cuisine_type || meta.cuisine || "Restaurant",
      veg_nonveg: meta.veg_nonveg || "Both",
      is_open: meta.is_open !== false,
      hours_24x7: meta.hours_24x7 === true,
      opening_time: meta.opening_time || "09:00",
      closing_time: meta.closing_time || "23:00",
      menu_count: meta.menu_count ?? 0,
    };
    try {
      await salesChannelService.updateSalesChannels(c.id, { metadata: merged });
      tagged++;
    } catch (e: any) {
      logger.error(`Backfill failed for "${c.name}": ${e.message}`);
    }
  }
  logger.info(`Backfilled platform tag on ${tagged} existing restaurant channel(s)`);

  // ── 2. Build new channels from Google Places (skip dupes) ──────────────────
  const seenNames = new Set<string>();
  const toCreate = [];
  for (const p of eateries) {
    const nameKey = (p.name || "").trim().toLowerCase();
    if (!nameKey || !p.place_id) continue;
    if (existingPlaceIds.has(p.place_id)) continue;
    if (existingNames.has(nameKey)) continue;
    if (seenNames.has(nameKey)) continue; // de-dupe within the batch
    seenNames.add(nameKey);

    const cuisine = cuisineOf(p);
    const open247 = is24x7(p.hours);
    toCreate.push({
      name: p.name,
      description: `${cuisine}${p.address ? " — " + p.address : ""}`.slice(0, 250),
      is_disabled: false,
      metadata: {
        platform: PLATFORM,
        subdomain: PLATFORM,
        source: "google_places",
        google_place_id: p.place_id,
        google_primary_type: p.primary_type || "",
        cuisine_type: cuisine,
        veg_nonveg: vegOf(p),
        address: p.address || "",
        city: "Rohtak",
        state: "Haryana",
        country: "India",
        lat: p.lat !== "" && p.lat != null ? Number(p.lat) : null,
        lng: p.lng !== "" && p.lng != null ? Number(p.lng) : null,
        mobile: p.phone || "",
        phone: p.phone || "",
        rating: p.rating !== "" && p.rating != null ? Number(p.rating) : null,
        rating_count:
          p.rating_count !== "" && p.rating_count != null
            ? Number(p.rating_count)
            : null,
        opening_time: open247 ? "00:00" : "09:00",
        closing_time: open247 ? "23:59" : "23:00",
        is_open: true,
        hours_24x7: open247,
        hours: p.hours || "",
        menu_count: 0,
        min_price_inr: minPriceInr(p.price_level),
        website: p.website || "",
        google_maps_uri: p.maps_url || "",
        business_status: p.status || "",
      },
    });
  }

  logger.info(`${toCreate.length} new restaurants to create (after dedupe)`);

  // ── 3. Create in batches ───────────────────────────────────────────────────
  const batchSize = 50;
  let created = 0;
  for (let i = 0; i < toCreate.length; i += batchSize) {
    const batch = toCreate.slice(i, i + batchSize);
    try {
      await createSalesChannelsWorkflow(container).run({
        input: { salesChannelsData: batch },
      });
      created += batch.length;
      logger.info(`Created ${created}/${toCreate.length}...`);
    } catch (e: any) {
      logger.error(`Batch ${i}-${i + batch.length} failed: ${e.message}`);
    }
  }

  logger.info("─────────────────────────────────────────────────────");
  logger.info(`Done. New channels created: ${created}`);
  logger.info(`Existing channels tagged for food site: ${tagged}`);
  logger.info(
    `All channels with platform=${PLATFORM} are now visible on the food site.`
  );
  logger.info("─────────────────────────────────────────────────────");
}
