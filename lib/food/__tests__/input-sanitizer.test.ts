/** @jest-environment node */
import { sanitize } from "../input-sanitizer";

describe("InputSanitizer", () => {
  it("NFC-normalizes decomposed sequences", () => {
    const r = sanitize({ q: "cafe\u0301" }); // café (composed)
    expect(r.queryText.length).toBeGreaterThan(0);
    expect(r.queryText.normalize("NFC")).toBe(r.queryText);
  });

  it("strips ASCII control characters and U+007F from the query", () => {
    const r = sanitize({ q: "bir\u0001ya\u007fni" });
    expect(r.queryText).toBe("biryani");
  });

  it("trims surrounding whitespace", () => {
    const r = sanitize({ q: "   biryani   " });
    expect(r.queryText).toBe("biryani");
  });

  it("caps query at 256 and sets queryTruncated", () => {
    const r = sanitize({ q: "a".repeat(400) });
    expect(r.queryText.length).toBe(256);
    expect(r.queryTruncated).toBe(true);
  });

  it("returns empty query for empty input without truncation", () => {
    const r = sanitize({ q: "" });
    expect(r.queryText).toBe("");
    expect(r.queryTruncated).toBe(false);
  });

  it("accepts a cuisine from the chip set", () => {
    const r = sanitize({ cuisine: "Biryani" });
    expect(r.cuisine).toBe("Biryani");
    expect(r.cuisineRejected).toBe(false);
  });

  it("stores null for a cuisine outside the chip set but does not reject", () => {
    const r = sanitize({ cuisine: "French" });
    expect(r.cuisine).toBeNull();
    expect(r.cuisineRejected).toBe(false);
  });

  it("rejects an over-length cuisine", () => {
    const r = sanitize({ cuisine: "a".repeat(128) });
    expect(r.cuisineRejected).toBe(true);
    expect(r.cuisine).toBeNull();
  });

  it("treats missing cuisine as no filter", () => {
    const r = sanitize({ q: "biryani" });
    expect(r.cuisine).toBeNull();
    expect(r.cuisineRejected).toBe(false);
  });
});
