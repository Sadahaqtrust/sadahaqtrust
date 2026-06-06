/**
 * Formats a paise amount (integer) as an Indian Rupee string.
 *
 * @param paise - Amount in paise (e.g. 4999 → ₹49.99)
 * @returns Formatted INR string (e.g. "₹49.99")
 */
export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
