/** @jest-environment node */
import { createLandingService, dedupOrder } from "../landing-service";
import type { Restaurant } from "../types";

function r(partial: Partial<Restaurant> & Pick<Restaurant, "id" | "name">): Restaurant {
  return {
    cuisine: "",
    veg_nonveg: "Both",
    address: "",
    city: "Rohtak",
    opening_time: "09:00",
    closing_time: "23:00",
    is_open: true,
    hours_24x7: false,
    menu_count: 0,
    min_price_inr: null,
    match_reason: "all",
    ...partial,
  };
}

describe("dedupOrder", () => {
  const A = r({ id: "a", name: "A", is_open: true, menu_count: 1 });
  const B = r({ id: "b", name: "B", is_open: false, menu_count: 10 });
  const C = r({ id: "c", name: "C", hours_24x7: true });

  it("dedupes by first-occurrence newest-first", () => {
    const out = dedupOrder(
      [
        { created_at: 3, result_restaurant_ids: ["a", "b"] },
        { created_at: 2, result_restaurant_ids: ["b", "c"] },
        { created_at: 1, result_restaurant_ids: ["a"] },
      ],
      [A, B, C],
    );
    const ids = out.map((x) => x.id);
    // All three picked; open-first resort puts A and C (open/24x7) before B,
    // then within open: most-recent last-event desc — a@3, c@2, so a before c.
    expect(ids).toEqual(["a", "c", "b"]);
  });

  it("returns empty when no event maps to a catalogue restaurant", () => {
    const out = dedupOrder(
      [{ created_at: 1, result_restaurant_ids: ["zzz"] }],
      [A],
    );
    expect(out).toEqual([]);
  });

  it("is stable: ties on open flag and ts break by id asc", () => {
    const X = r({ id: "x", name: "X", is_open: true });
    const Y = r({ id: "y", name: "Y", is_open: true });
    const out = dedupOrder(
      [{ created_at: 5, result_restaurant_ids: ["y", "x"] }],
      [X, Y],
    );
    expect(out.map((r) => r.id)).toEqual(["x", "y"]);
  });
});

describe("createLandingService", () => {
  const catalogue = [
    r({ id: "o1", name: "Open1", is_open: true, menu_count: 10 }),
    r({ id: "o2", name: "Open2", is_open: true, menu_count: 5 }),
    r({ id: "c1", name: "Closed1", is_open: false, menu_count: 20 }),
  ];

  it("returns a Fallback when the visitor has zero events", async () => {
    const svc = createLandingService(
      {
        isOptedOut: async () => false,
        recentEvents: async () => [],
        fullHistory: async () => [],
        catalogue: async () => catalogue,
      },
      { F: 3 },
    );
    const out = await svc.getListing("v1");
    expect(out.personalized).toBe(false);
    expect(out.restaurants.length).toBeLessThanOrEqual(3);
  });

  it("returns a Fallback when opt_out is set", async () => {
    const svc = createLandingService({
      isOptedOut: async () => true,
      recentEvents: async () => [
        { created_at: 1, result_restaurant_ids: ["o1"] },
      ],
      fullHistory: async () => [],
      catalogue: async () => catalogue,
    });
    const out = await svc.getListing("v1");
    expect(out.personalized).toBe(false);
  });

  it("returns Personalized when history maps to catalogue entries", async () => {
    const svc = createLandingService(
      {
        isOptedOut: async () => false,
        recentEvents: async () => [
          { created_at: 2, result_restaurant_ids: ["o2"] },
          { created_at: 1, result_restaurant_ids: ["o1"] },
        ],
        fullHistory: async () => [],
        catalogue: async () => catalogue,
      },
      { minDistinct: 2 },
    );
    const out = await svc.getListing("v1");
    expect(out.personalized).toBe(true);
    expect(out.restaurants.map((r) => r.id)).toEqual(["o2", "o1"]);
    expect(out.considered).toBe(2);
  });

  it("expands to full history when distinct < minDistinct", async () => {
    let recentCalls = 0;
    let fullCalls = 0;
    const svc = createLandingService(
      {
        isOptedOut: async () => false,
        recentEvents: async () => {
          recentCalls++;
          return [{ created_at: 2, result_restaurant_ids: ["o1"] }];
        },
        fullHistory: async () => {
          fullCalls++;
          return [
            { created_at: 3, result_restaurant_ids: ["o1"] },
            { created_at: 2, result_restaurant_ids: ["o2"] },
            { created_at: 1, result_restaurant_ids: ["c1"] },
          ];
        },
        catalogue: async () => catalogue,
      },
      { minDistinct: 3 },
    );
    const out = await svc.getListing("v1");
    expect(recentCalls).toBe(1);
    expect(fullCalls).toBe(1);
    expect(out.personalized).toBe(true);
    expect(out.restaurants.map((r) => r.id)).toEqual(["o1", "o2", "c1"]);
    expect(out.considered).toBe(3);
  });
});
