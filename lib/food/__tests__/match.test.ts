/** @jest-environment node */
import { rankRestaurants, buildCuisineList } from "../match";
import { CUISINES, SAMPLE_RESTAURANTS } from "../catalogue-static";

describe("rankRestaurants", () => {
  it("returns empty for queries shorter than 3 chars", () => {
    expect(rankRestaurants(SAMPLE_RESTAURANTS, "")).toEqual([]);
    expect(rankRestaurants(SAMPLE_RESTAURANTS, "m")).toEqual([]);
    expect(rankRestaurants(SAMPLE_RESTAURANTS, "ma")).toEqual([]);
  });

  it("returns empty on empty input", () => {
    expect(rankRestaurants([], "maa")).toEqual([]);
  });

  it("places prefix match first (tier 0)", () => {
    const out = rankRestaurants(SAMPLE_RESTAURANTS, "maa");
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].name).toBe("Maa-Ki-Rasoi");
    expect(out[0].tier).toBe(0);
  });

  it("promotes substring match to tier 1", () => {
    const out = rankRestaurants(SAMPLE_RESTAURANTS, "biryani");
    expect(out.length).toBeGreaterThan(0);
    const hit = out.find((r) => r.name.includes("Biryani"));
    expect(hit).toBeDefined();
    expect(hit!.tier).toBe(1);
  });

  it("detects fuzzy typos as tier 2", () => {
    const out = rankRestaurants(SAMPLE_RESTAURANTS, "bikner");
    expect(out.length).toBeGreaterThan(0);
    const hit = out.find((r) => r.name.startsWith("Bikaner"));
    expect(hit).toBeDefined();
    expect(hit!.tier).toBe(2);
  });

  it("never mutates the input list", () => {
    const snapshot = JSON.stringify(SAMPLE_RESTAURANTS);
    rankRestaurants(SAMPLE_RESTAURANTS, "maa");
    expect(JSON.stringify(SAMPLE_RESTAURANTS)).toBe(snapshot);
  });

  it("truncates to 10 results", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: `id_${i}`,
      name: `Maa Restaurant ${i}`,
      cuisine: "X",
      is_open: true,
      menu_count: 10 + i,
    }));
    expect(rankRestaurants(many, "maa").length).toBe(10);
  });
});

describe("buildCuisineList", () => {
  it("pins Indian first and alphabetises the tail", () => {
    const out = buildCuisineList(["Thai", "Chinese", "Indian", "American"]);
    expect(out[0]).toBe("Indian");
    expect(out.slice(1)).toEqual(["American", "Chinese", "Thai"]);
  });

  it("matches CUISINES ordering when given the full list", () => {
    expect(buildCuisineList(CUISINES)).toEqual([...CUISINES]);
  });

  it("is stable under shuffling", () => {
    const shuffled = ["Thai", "Indian", "Chinese", "American"];
    const twice = buildCuisineList(buildCuisineList(shuffled));
    expect(twice).toEqual(buildCuisineList(shuffled));
  });
});
