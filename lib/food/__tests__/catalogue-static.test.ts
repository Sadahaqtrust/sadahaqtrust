/** @jest-environment node */
import {
  CUISINES,
  INDIAN_STATES,
  SAMPLE_RESTAURANTS,
} from "../catalogue-static";

describe("catalogue-static", () => {
  it("pins Indian first and alphabetises the tail", () => {
    expect(CUISINES[0]).toBe("Indian");
    const tail = CUISINES.slice(1);
    const sorted = [...tail].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase(), "en"),
    );
    expect(tail).toEqual(sorted);
  });

  it("exports the 28 Indian states without duplicates", () => {
    expect(INDIAN_STATES.length).toBe(28);
    expect(new Set(INDIAN_STATES).size).toBe(28);
  });

  it("ships at least 9 sample restaurants with Maa-Ki-Rasoi first", () => {
    expect(SAMPLE_RESTAURANTS.length).toBeGreaterThanOrEqual(9);
    expect(SAMPLE_RESTAURANTS[0].id).toBe("sc_01KR1PCS0QGKNSWBNSYCG98TBX");
    expect(SAMPLE_RESTAURANTS[0].name).toBe("Maa-Ki-Rasoi");
    for (const r of SAMPLE_RESTAURANTS) {
      expect(r.id.length).toBeGreaterThan(0);
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.cuisine.length).toBeGreaterThan(0);
      expect(typeof r.menu_count).toBe("number");
    }
  });
});
