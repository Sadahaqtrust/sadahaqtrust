/**
 * Phase 1 static data for the hierarchical dish catalogue feature.
 * See spec: .kiro/specs/hierarchical-dish-catalogue
 *
 * IMPORTANT: This module is the sole data source for the three /food
 * dropdowns during Phase 1. It MUST NOT import anything that performs
 * I/O (pg, fetch, fs, etc.). The Phase_Gate requirement (Req 5 / P8) is
 * that the /food page issue ZERO network calls for dropdown data in
 * Phase 1 — all three dropdowns read from this file only.
 */

/**
 * Cuisine dropdown options. "Indian" is pinned first; the remainder is
 * alphabetical (case-insensitive), matching Req 2.1 / 2.2.
 */
export const CUISINES: readonly string[] = [
  "Indian",
  "American",
  "Chinese",
  "Egyptian",
  "Ethiopian",
  "French",
  "German",
  "Greek",
  "Italian",
  "Japanese",
  "Korean",
  "Lebanese",
  "Pakistani",
  "Spanish",
  "Thai",
  "Turkish",
  "Vietnamese",
] as const;

/**
 * Indian states for the cascading sub-region dropdown. All 28 states
 * present in existing curated data. No Union Territories in Phase 1.
 */
export const INDIAN_STATES: readonly string[] = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

/** Restaurant typeahead stub. Phase 2 will replace this with DB data. */
export type RestaurantStub = {
  id: string;
  name: string;
  cuisine: string;
  is_open: boolean;
  menu_count: number;
};

/**
 * Sample restaurant list for Phase 1. The first entry is the real
 * Maa-Ki-Rasoi sales channel so the typeahead's top result can be
 * clicked through to its real menu page via existing routing. The rest
 * are plausible Rohtak placeholders — clearly labelled "sample" so
 * reviewers know they aren't live.
 */
export const SAMPLE_RESTAURANTS: readonly RestaurantStub[] = [
  {
    id: "sc_01KR1PCS0QGKNSWBNSYCG98TBX",
    name: "Maa-Ki-Rasoi",
    cuisine: "North Indian, Home Style",
    is_open: true,
    menu_count: 111_000,
  },
  {
    id: "sample-sagar-ratna",
    name: "Sagar Ratna (sample)",
    cuisine: "South Indian",
    is_open: true,
    menu_count: 240,
  },
  {
    id: "sample-bikaner-sweets",
    name: "Bikaner Sweets (sample)",
    cuisine: "Bakery & Sweets",
    is_open: true,
    menu_count: 180,
  },
  {
    id: "sample-haveli-restaurant",
    name: "Haveli Restaurant (sample)",
    cuisine: "Punjabi",
    is_open: false,
    menu_count: 160,
  },
  {
    id: "sample-chaatwala-express",
    name: "Chaatwala Express (sample)",
    cuisine: "Street Food",
    is_open: true,
    menu_count: 95,
  },
  {
    id: "sample-zaika-biryani-house",
    name: "Zaika Biryani House (sample)",
    cuisine: "Biryani",
    is_open: true,
    menu_count: 72,
  },
  {
    id: "sample-panchvati-gaurav",
    name: "Panchvati Gaurav (sample)",
    cuisine: "Gujarati",
    is_open: true,
    menu_count: 68,
  },
  {
    id: "sample-rohtak-tandoor",
    name: "Rohtak Tandoor (sample)",
    cuisine: "Tandoori",
    is_open: false,
    menu_count: 54,
  },
  {
    id: "sample-dilli-darbar",
    name: "Dilli Darbar (sample)",
    cuisine: "Mughlai",
    is_open: true,
    menu_count: 130,
  },
] as const;
