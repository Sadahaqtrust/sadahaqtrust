/**
 * IpHasher. HMAC-SHA256 keyed digest of a raw IP address.
 * Key sourced from process.env.SEARCH_IP_HMAC_KEY (256-bit hex).
 * See design.md §Security — rotate every 90 days.
 */
import { createHmac } from "node:crypto";

const HEX_256_RE = /^[0-9a-f]{64}$/;

function getKey(): Buffer {
  const raw = process.env.SEARCH_IP_HMAC_KEY;
  if (!raw || !HEX_256_RE.test(raw)) {
    throw new Error(
      "SEARCH_IP_HMAC_KEY env is missing or not a 64-hex string",
    );
  }
  return Buffer.from(raw, "hex");
}

export function hash(rawIp: string): string {
  return createHmac("sha256", getKey()).update(rawIp).digest("hex");
}
