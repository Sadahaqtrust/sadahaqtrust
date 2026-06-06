"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type OptionsResponse = {
  cuisines: string[];
  states: string[];
  food_categories: string[];
  restaurants: {
    id: string;
    name: string;
    cuisine: string;
    is_open: boolean;
    menu_count: number;
  }[];
};

type Dish = {
  id: string;
  source_product_id: string;
  display_title: string;
  cuisine: string;
  sub_region: string | null;
  food_category: string | null;
  price_inr: number | null;
  veg_nonveg: string | null;
  restaurant: { id: string | null; name: string; href: string } | null;
};

type DishesResponse = {
  items: Dish[];
  total: number;
  page: number;
  pageSize: number;
};

export default function HierarchicalDishBrowser() {
  const [opts, setOpts] = useState<OptionsResponse | null>(null);
  const [restaurant, setRestaurant] = useState<OptionsResponse["restaurants"][number] | null>(null);
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [foodCategory, setFoodCategory] = useState<string | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [openCombo, setOpenCombo] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load options once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/food/catalogue/options", { cache: "no-store" });
        if (!res.ok) return;
        const data: OptionsResponse = await res.json();
        if (!cancelled) setOpts(data);
      } catch { /* swallow */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Reset state when cuisine changes away from Indian.
  useEffect(() => {
    if (cuisine !== "Indian" && state !== null) setState(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuisine]);

  // Fetch dishes whenever filters change.
  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const params = new URLSearchParams();
    if (cuisine) params.set("cuisine", cuisine);
    if (state) params.set("subRegion", state);
    if (foodCategory) params.set("foodCategory", foodCategory);
    if (restaurant) params.set("restaurant", restaurant.id);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    setLoading(true);
    fetch(`/api/food/catalogue/dishes?${params.toString()}`, {
      cache: "no-store",
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? (r.json() as Promise<DishesResponse>) : Promise.reject()))
      .then((d) => {
        setDishes(d.items);
        setTotal(d.total);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) {
          setDishes([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [cuisine, state, foodCategory, restaurant, page, pageSize]);

  const restaurantMatches = useMemo(() => {
    if (!opts) return [];
    const q = restaurantQuery.trim().toLowerCase();
    if (q.length < 3) return [];
    const scored = opts.restaurants
      .map((r) => {
        const n = r.name.toLowerCase();
        if (n.startsWith(q)) return { r, tier: 0 };
        if (n.includes(q)) return { r, tier: 1 };
        return null;
      })
      .filter((x): x is { r: OptionsResponse["restaurants"][number]; tier: number } => x !== null);
    scored.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.r.is_open !== b.r.is_open) return a.r.is_open ? -1 : 1;
      return b.r.menu_count - a.r.menu_count;
    });
    return scored.slice(0, 10).map((x) => x.r);
  }, [opts, restaurantQuery]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-5xl mx-auto px-4 mt-4">
      <div className="bg-white rounded-2xl shadow-lg p-4 flex flex-wrap gap-3 items-end">
        {/* Restaurant combobox */}
        <div className="flex flex-col gap-1 min-w-[14rem] relative flex-1">
          <label className="text-[11px] font-bold text-gray-600">Restaurant</label>
          <input
            value={restaurant ? restaurant.name : restaurantQuery}
            onFocus={() => setOpenCombo(true)}
            onBlur={() => setTimeout(() => setOpenCombo(false), 120)}
            onChange={(e) => {
              setRestaurantQuery(e.target.value);
              setOpenCombo(true);
              if (restaurant && e.target.value !== restaurant.name) setRestaurant(null);
            }}
            placeholder="Type 3+ characters…"
            className="rounded-xl px-3 py-2 text-sm bg-white text-gray-800 outline-none border border-gray-200 focus-visible:ring-2 ring-[#00A650]"
            aria-expanded={openCombo && restaurantMatches.length > 0}
            role="combobox"
          />
          {restaurant && (
            <button
              type="button"
              onClick={() => { setRestaurant(null); setRestaurantQuery(""); setPage(1); }}
              className="absolute right-2 top-7 text-gray-400 hover:text-gray-700 text-sm"
              aria-label="Clear restaurant"
            >
              ×
            </button>
          )}
          {openCombo && restaurantMatches.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-20 max-h-72 overflow-y-auto border border-gray-100">
              {restaurantMatches.map((r) => (
                <li
                  key={r.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setRestaurant(r);
                    setRestaurantQuery(r.name);
                    setPage(1);
                    setOpenCombo(false);
                  }}
                  className="px-3 py-2 text-sm cursor-pointer flex justify-between gap-3 hover:bg-orange-50"
                >
                  <span className="font-semibold text-gray-800 truncate">{r.name}</span>
                  <span className="text-[11px] text-[#F47216] font-semibold whitespace-nowrap">
                    {r.cuisine}
                    {!r.is_open && <span className="ml-2 text-gray-400">· Closed</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cuisine */}
        <div className="flex flex-col gap-1 min-w-[10rem]">
          <label className="text-[11px] font-bold text-gray-600">Cuisine</label>
          <select
            value={cuisine ?? ""}
            onChange={(e) => { setCuisine(e.target.value || null); setPage(1); }}
            className="rounded-xl px-3 py-2 text-sm bg-white text-gray-800 border border-gray-200 outline-none focus-visible:ring-2 ring-[#00A650]"
          >
            <option value="">All cuisines</option>
            {opts?.cuisines.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* State (Indian only) */}
        {cuisine === "Indian" && (
          <div className="flex flex-col gap-1 min-w-[10rem]">
            <label className="text-[11px] font-bold text-gray-600">State</label>
            <select
              value={state ?? ""}
              onChange={(e) => { setState(e.target.value || null); setPage(1); }}
              className="rounded-xl px-3 py-2 text-sm bg-white text-gray-800 border border-gray-200 outline-none focus-visible:ring-2 ring-[#00A650]"
            >
              <option value="">All states</option>
              {opts?.states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Food category */}
        <div className="flex flex-col gap-1 min-w-[10rem]">
          <label className="text-[11px] font-bold text-gray-600">Food Category</label>
          <select
            value={foodCategory ?? ""}
            onChange={(e) => { setFoodCategory(e.target.value || null); setPage(1); }}
            className="rounded-xl px-3 py-2 text-sm bg-white text-gray-800 border border-gray-200 outline-none focus-visible:ring-2 ring-[#00A650]"
          >
            <option value="">All categories</option>
            {opts?.food_categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter chips */}
      {(cuisine || state || foodCategory || restaurant) && (
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          {cuisine && <FilterChip label={cuisine} onClear={() => setCuisine(null)} />}
          {state && <FilterChip label={state} onClear={() => setState(null)} />}
          {foodCategory && <FilterChip label={foodCategory} onClear={() => setFoodCategory(null)} />}
          {restaurant && <FilterChip label={restaurant.name} onClear={() => { setRestaurant(null); setRestaurantQuery(""); }} />}
          <button
            onClick={() => {
              setCuisine(null);
              setState(null);
              setFoodCategory(null);
              setRestaurant(null);
              setRestaurantQuery("");
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results */}
      <div className="mt-4">
        <p className="text-gray-400 text-xs mb-2">
          {loading ? "Loading dishes…" : `${total.toLocaleString()} dishes`}
          {total > 0 && ` · page ${page} / ${totalPages}`}
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dishes.map((d) => (
            <li
              key={d.id}
              className="bg-white rounded-2xl border border-gray-100 p-3 flex justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">
                  {d.veg_nonveg === "Veg" ? "🟢 " : d.veg_nonveg === "Non-Veg" ? "🔴 " : ""}
                  {d.display_title}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {d.cuisine}
                  {d.sub_region ? ` · ${d.sub_region}` : ""}
                  {d.food_category ? ` · ${d.food_category}` : ""}
                </p>
                {d.restaurant && (
                  <p className="text-[11px] text-[#F47216] font-bold truncate mt-1">
                    <a href={d.restaurant.href} className="hover:underline">
                      {d.restaurant.name}
                    </a>
                  </p>
                )}
              </div>
              {d.price_inr != null && (
                <span className="text-[#F47216] font-extrabold text-sm whitespace-nowrap">
                  ₹{d.price_inr}
                </span>
              )}
            </li>
          ))}
        </ul>
        {total === 0 && !loading && (
          <p className="text-center text-gray-400 text-sm py-10">
            No dishes match the current filters.
          </p>
        )}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="px-3 py-1.5 text-gray-500">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="px-3 py-1.5 rounded-full bg-orange-100 text-[#F47216] font-bold flex items-center gap-2">
      {label}
      <button onClick={onClear} className="text-[#F47216]/70 hover:text-[#F47216]" aria-label="Clear">
        ×
      </button>
    </span>
  );
}
