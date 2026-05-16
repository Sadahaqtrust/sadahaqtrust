/** @jest-environment jsdom */
// Feature: hierarchical-dish-catalogue
//
// Property-based tests for the Phase 1 UI. Each block is labelled with
// the Correctness Property it defends. Phase 2 properties P1 and P2
// will be appended to this file once the backend derivation ships.
import React from "react";
import fc from "fast-check";
import { render, fireEvent, cleanup } from "@testing-library/react";
import {
  rankRestaurants,
  buildCuisineList,
  type Ranked,
} from "@/lib/food/match";
import {
  CUISINES,
  INDIAN_STATES,
  SAMPLE_RESTAURANTS,
  type RestaurantStub,
} from "@/lib/food/catalogue-static";
import FoodDropdownGroup from "@/components/food/FoodDropdownGroup";

afterEach(() => cleanup());

const restaurantArb = fc.record({
  id: fc
    .stringMatching(/^[a-z0-9_-]{3,12}$/)
    .map((s) => s || "x"),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  cuisine: fc.string({ maxLength: 20 }),
  is_open: fc.boolean(),
  menu_count: fc.integer({ min: 0, max: 10_000 }),
});

const RUNS = { numRuns: 100 };

describe("hierarchical-dish-catalogue :: P7 typeahead threshold", () => {
  it("P7: returns [] for any query shorter than 3 characters", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 2 }),
        fc.array(restaurantArb, { maxLength: 15 }),
        (q, list) => rankRestaurants(list, q).length === 0,
      ),
      RUNS,
    );
  });
});

describe("hierarchical-dish-catalogue :: P4 match tier ascending", () => {
  it("P4: tiers are non-decreasing in the output sequence", () => {
    fc.assert(
      fc.property(
        fc
          .stringMatching(/^[a-z]{3,6}$/)
          .filter((s) => s.length >= 3),
        fc.array(restaurantArb, { maxLength: 20 }),
        (q, list) => {
          const out: Ranked[] = rankRestaurants(list, q);
          for (let i = 1; i < out.length; i++) {
            if (out[i - 1].tier > out[i].tier) return false;
          }
          return true;
        },
      ),
      RUNS,
    );
  });
});

describe("hierarchical-dish-catalogue :: P5 intra-tier tiebreak", () => {
  it("P5: within a tier, open-first then menu_count desc", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z]{3,6}$/),
        fc.array(restaurantArb, { maxLength: 20 }),
        (q, list) => {
          const out = rankRestaurants(list, q);
          for (let i = 1; i < out.length; i++) {
            const a = out[i - 1];
            const b = out[i];
            if (a.tier !== b.tier) continue;
            if (a.is_open !== b.is_open) {
              if (!a.is_open && b.is_open) return false;
              continue;
            }
            if (a.menu_count < b.menu_count) return false;
          }
          return true;
        },
      ),
      RUNS,
    );
  });
});

describe("hierarchical-dish-catalogue :: P6 Indian pinned + alphabetical tail", () => {
  it("P6: buildCuisineList pins Indian first and α-sorts the rest", () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray([...CUISINES], { minLength: 1, maxLength: CUISINES.length }),
        (inputArr) => {
          const input = inputArr.includes("Indian") ? inputArr : ["Indian", ...inputArr];
          const out = buildCuisineList(input);
          if (out[0] !== "Indian") return false;
          const tail = out.slice(1);
          const sorted = [...tail].sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase(), "en"),
          );
          return tail.every((v, i) => v === sorted[i]);
        },
      ),
      RUNS,
    );
  });
});

describe("hierarchical-dish-catalogue :: P3 cascade invariant", () => {
  it("P3: state dropdown visible iff cuisine === 'Indian'", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<string | null>(
          null,
          ...CUISINES.filter((c) => c !== "Indian"),
        ),
        (otherCuisine) => {
          const { queryByTestId, getByTestId, unmount } = render(
            React.createElement(FoodDropdownGroup, {
              restaurants: SAMPLE_RESTAURANTS,
              cuisines: CUISINES,
              states: INDIAN_STATES,
            }),
          );
          try {
            // initial: cuisine = null → state hidden
            if (queryByTestId("state-select") !== null) return false;
            const select = getByTestId("cuisine-select").querySelector("select");
            // switch to Indian → state appears
            fireEvent.change(select!, { target: { value: "Indian" } });
            if (queryByTestId("state-select") === null) return false;
            // switch to a non-Indian cuisine → state disappears
            if (otherCuisine) {
              fireEvent.change(select!, { target: { value: otherCuisine } });
              if (queryByTestId("state-select") !== null) return false;
            }
            return true;
          } finally {
            unmount();
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});

describe("hierarchical-dish-catalogue :: P8 (jest adaptation) UI-only guard", () => {
  // TODO(phase-2): port to Playwright once e2e harness lands.
  it("P8-jest: FoodDropdownGroup does not invoke fetch/XHR/WebSocket", () => {
    const fetchSpy = jest.fn();
    const xhrSpy = jest.fn();
    const wsSpy = jest.fn();
    const origFetch = (global as any).fetch;
    const origXHR = (global as any).XMLHttpRequest;
    const origWS = (global as any).WebSocket;
    (global as any).fetch = (...args: unknown[]) => {
      fetchSpy(...args);
      return Promise.resolve(new Response("{}"));
    };
    class FakeXHR {
      constructor() {
        xhrSpy();
      }
      open() {}
      send() {}
      setRequestHeader() {}
      addEventListener() {}
    }
    (global as any).XMLHttpRequest = FakeXHR;
    class FakeWS {
      constructor() {
        wsSpy();
      }
      send() {}
      close() {}
      addEventListener() {}
    }
    (global as any).WebSocket = FakeWS;

    try {
      const { getByTestId } = render(
        React.createElement(FoodDropdownGroup, {
          restaurants: SAMPLE_RESTAURANTS,
          cuisines: CUISINES,
          states: INDIAN_STATES,
        }),
      );
      const input = getByTestId("restaurant-combobox").querySelector(
        'input[role="combobox"]',
      ) as HTMLInputElement;
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "maa" } });
      const select = getByTestId("cuisine-select").querySelector("select")!;
      fireEvent.change(select, { target: { value: "Indian" } });
      const stateSelect = getByTestId("state-select").querySelector("select")!;
      fireEvent.change(stateSelect, { target: { value: "Haryana" } });
      fireEvent.change(select, { target: { value: "Chinese" } });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrSpy).not.toHaveBeenCalled();
      expect(wsSpy).not.toHaveBeenCalled();
    } finally {
      (global as any).fetch = origFetch;
      (global as any).XMLHttpRequest = origXHR;
      (global as any).WebSocket = origWS;
    }
  });
});
