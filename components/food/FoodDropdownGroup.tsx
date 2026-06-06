"use client";
import { useEffect, useState } from "react";
import type { RestaurantStub } from "@/lib/food/catalogue-static";
import RestaurantCombobox from "./RestaurantCombobox";
import CuisineSelect from "./CuisineSelect";
import StateSelect from "./StateSelect";

export type FoodDropdownSelection = {
  restaurant: RestaurantStub | null;
  cuisine: string | null;
  state: string | null;
};

export type FoodDropdownGroupProps = {
  restaurants: readonly RestaurantStub[];
  cuisines: readonly string[];
  states: readonly string[];
  initial?: Partial<FoodDropdownSelection>;
  onChange?: (sel: FoodDropdownSelection) => void;
  /** Phase 2 slot — render a small pill when the options API fell back. */
  degradedNotice?: string | null;
};

export default function FoodDropdownGroup({
  restaurants,
  cuisines,
  states,
  initial,
  onChange,
  degradedNotice,
}: FoodDropdownGroupProps) {
  const [restaurant, setRestaurant] = useState<RestaurantStub | null>(initial?.restaurant ?? null);
  const [cuisine, setCuisine] = useState<string | null>(initial?.cuisine ?? null);
  const [state, setState] = useState<string | null>(initial?.state ?? null);

  // Req 3.4: when cuisine transitions away from "Indian", clear state.
  useEffect(() => {
    if (cuisine !== "Indian" && state !== null) setState(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuisine]);

  useEffect(() => {
    onChange?.({ restaurant, cuisine, state });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant, cuisine, state]);

  return (
    <div
      className="max-w-3xl mx-auto px-4 mt-4 flex flex-wrap gap-3 items-end"
      data-testid="food-dropdown-group"
    >
      <RestaurantCombobox
        restaurants={restaurants}
        value={restaurant}
        onChange={setRestaurant}
      />
      <CuisineSelect cuisines={cuisines} value={cuisine} onChange={setCuisine} />
      {cuisine === "Indian" && (
        <StateSelect states={states} value={state} onChange={setState} />
      )}
      {degradedNotice && (
        <span className="bg-yellow-100 text-yellow-800 text-[11px] font-bold px-2 py-1 rounded-full self-center">
          {degradedNotice}
        </span>
      )}
    </div>
  );
}
