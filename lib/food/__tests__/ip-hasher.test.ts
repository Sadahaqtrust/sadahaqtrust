/** @jest-environment node */
import { hash } from "../ip-hasher";

const TEST_KEY = "a".repeat(64);

describe("IpHasher", () => {
  const ORIGINAL = process.env.SEARCH_IP_HMAC_KEY;
  beforeAll(() => {
    process.env.SEARCH_IP_HMAC_KEY = TEST_KEY;
  });
  afterAll(() => {
    process.env.SEARCH_IP_HMAC_KEY = ORIGINAL;
  });

  it("produces 64-hex output", () => {
    expect(hash("127.0.0.1")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same (ip, key)", () => {
    expect(hash("10.0.0.1")).toBe(hash("10.0.0.1"));
  });

  it("produces different digests for different IPs", () => {
    expect(hash("1.1.1.1")).not.toBe(hash("1.1.1.2"));
  });

  it("throws when the key env var is missing", () => {
    const saved = process.env.SEARCH_IP_HMAC_KEY;
    delete process.env.SEARCH_IP_HMAC_KEY;
    try {
      expect(() => hash("1.2.3.4")).toThrow();
    } finally {
      process.env.SEARCH_IP_HMAC_KEY = saved;
    }
  });
});
