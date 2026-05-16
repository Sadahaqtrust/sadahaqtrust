/**
 * Pure predicate used by the retention worker. Extracted so we can prove
 * Correctness Property 7 without spinning up the worker itself.
 */
const MS_PER_DAY = 86_400_000;

export function shouldRetain(
  row: { created_at: Date | number },
  now: number,
  rwDays: number,
): boolean {
  const ts =
    row.created_at instanceof Date ? row.created_at.getTime() : row.created_at;
  return ts >= now - rwDays * MS_PER_DAY;
}
