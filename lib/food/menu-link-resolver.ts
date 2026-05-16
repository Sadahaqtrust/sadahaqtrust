/**
 * MenuLinkResolver. Computes the canonical href for a Restaurant.
 * See design.md §Menu Link Resolver — collision handling downgrades ALL
 * siblings sharing a non-unique slug to the /food/r/id/{id} form so URLs are
 * order-independent across API responses.
 */
import { slugify } from "./slug";

export function href(r: { id: string; name: string }): string {
  const s = slugify(r.name);
  return s ? `/food/r/${s}` : `/food/r/id/${r.id}`;
}

export function hrefForBatch(
  rs: { id: string; name: string }[],
): string[] {
  const slugs = rs.map((r) => slugify(r.name));
  const counts = new Map<string, number>();
  for (const s of slugs) {
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return rs.map((r, i) => {
    const s = slugs[i];
    if (!s || (counts.get(s) ?? 0) > 1) return `/food/r/id/${r.id}`;
    return `/food/r/${s}`;
  });
}
