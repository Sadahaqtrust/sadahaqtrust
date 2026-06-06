/**
 * InputSanitizer. NFC normalize → strip control chars (U+0000..U+001F, U+007F)
 * → trim → cap query at 256 (set queryTruncated), cap cuisine at 64.
 * See design.md §Security and requirements.md Requirement 7.
 */
import type { SanitizedSearch } from "./types";

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const CUISINE_CHIPS = new Set<string>([
  "North Indian",
  "South Indian",
  "Chinese",
  "Fast Food",
  "Bakery & Sweets",
  "Beverages & Juice",
  "Biryani",
  "Street Food",
  "Multi-Cuisine",
]);

export function sanitize(raw: {
  q?: string | null;
  cuisine?: string | null;
}): SanitizedSearch {
  const rawQ = raw.q ?? "";
  const q = rawQ.normalize("NFC").replace(CONTROL_CHARS, "").trim();
  const queryTruncated = q.length > 256;
  const queryText = queryTruncated ? q.slice(0, 256) : q;

  let cuisine: string | null = null;
  let cuisineRejected = false;
  if (raw.cuisine != null) {
    const c = raw.cuisine.normalize("NFC").replace(CONTROL_CHARS, "").trim();
    if (c.length > 64) {
      cuisineRejected = true;
      cuisine = null;
    } else if (c === "" || CUISINE_CHIPS.has(c)) {
      cuisine = c === "" ? null : c;
    } else {
      // Not a member of the chip set — treat as an unrestricted filter, per
      // requirements.md Req 7.5. We intentionally store `null` rather than
      // the raw string to keep the search path's filter unambiguous.
      cuisine = null;
    }
  }

  return { queryText, queryTruncated, cuisine, cuisineRejected };
}
