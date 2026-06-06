/** @jest-environment node */
import { slugify } from "../slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Maa Ki Rasoi")).toBe("maa-ki-rasoi");
  });
  it("collapses runs of non-alphanumerics into a single hyphen", () => {
    expect(slugify("Maa  Ki   Rasoi")).toBe("maa-ki-rasoi");
  });
  it("strips combining marks (NFKD)", () => {
    expect(slugify("Café")).toBe("cafe");
  });
  it("trims leading/trailing hyphens", () => {
    expect(slugify("---Hello---")).toBe("hello");
  });
  it("returns empty string when input has no alphanumerics", () => {
    expect(slugify("***")).toBe("");
  });
  it("is idempotent", () => {
    const a = slugify("Test Foo!");
    expect(slugify(a)).toBe(a);
  });
});
