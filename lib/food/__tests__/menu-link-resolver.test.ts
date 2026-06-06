/** @jest-environment node */
import { href, hrefForBatch } from "../menu-link-resolver";

describe("MenuLinkResolver", () => {
  it("uses slug form for unique names", () => {
    expect(href({ id: "abc", name: "Maa Ki Rasoi" })).toBe(
      "/food/r/maa-ki-rasoi",
    );
  });

  it("falls back to id form when name has no alphanumerics", () => {
    expect(href({ id: "sc_1", name: "***" })).toBe("/food/r/id/sc_1");
  });

  it("downgrades BOTH siblings on a slug collision within a batch", () => {
    const rs = [
      { id: "a1", name: "Tea House" },
      { id: "b2", name: "tea   house" },
    ];
    const hs = hrefForBatch(rs);
    expect(hs).toEqual(["/food/r/id/a1", "/food/r/id/b2"]);
  });

  it("keeps the unique sibling slugged when a 3-way mix collides on 2", () => {
    const rs = [
      { id: "a1", name: "Kafe" },
      { id: "b2", name: "Cafe" },
      { id: "c3", name: "Café" }, // collides with 'cafe' after NFKD
    ];
    const hs = hrefForBatch(rs);
    expect(hs[0]).toBe("/food/r/kafe");
    expect(hs[1]).toBe("/food/r/id/b2");
    expect(hs[2]).toBe("/food/r/id/c3");
  });

  it("empty-name siblings always use id form regardless of batch", () => {
    const rs = [
      { id: "a", name: "###" },
      { id: "b", name: "Foo" },
    ];
    expect(hrefForBatch(rs)).toEqual(["/food/r/id/a", "/food/r/foo"]);
  });
});
