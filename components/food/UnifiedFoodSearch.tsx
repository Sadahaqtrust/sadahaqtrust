"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Mode = "near" | "restaurant" | "cuisine";

const RADII_M = [500, 1000, 2000, 3000];
const MIN_RESTAURANT_QUERY = 3;

type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  address: string;
  is_open: boolean;
  menu_count: number;
  distance_m: number | null;
  href: string;
};

type Dish = {
  id: string;
  display_title: string;
  cuisine: string;
  sub_region: string | null;
  food_category: string | null;
  price_inr: number | null;
  veg_nonveg: string | null;
  restaurant: { id: string | null; name: string; href: string } | null;
};

type Options = {
  cuisines: string[];
  states: string[];
  food_categories: string[];
  restaurants: { id: string; name: string; cuisine: string; is_open: boolean; menu_count: number }[];
};

type SearchResp = {
  mode: Mode;
  restaurants: Restaurant[];
  dishes: Dish[];
  total_restaurants: number;
  total_dishes: number;
};

type Recent = {
  source: "personalized" | "none";
  dishes: Dish[];
};

export default function UnifiedFoodSearch() {
  const [mode, setMode] = useState<Mode>("restaurant");
  const [q, setQ] = useState("");
  const [radius, setRadius] = useState(1000);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "asking" | "ok" | "denied">("idle");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [foodCategory, setFoodCategory] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [opts, setOpts] = useState<Options | null>(null);
  const [data, setData] = useState<SearchResp | null>(null);
  const [recent, setRecent] = useState<Recent | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const log = (msg: string) =>
    setDebugLog((prev) => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${msg}`]);

  // -------- mount: load options once
  useEffect(() => {
    let cancelled = false;
    log("GET /api/food/catalogue/options");
    fetch("/api/food/catalogue/options", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Options | null) => {
        if (!cancelled && d) {
          setOpts(d);
          log(
            `options loaded: cuisines=${d.cuisines.length} states=${d.states.length} cats=${d.food_categories.length} restaurants=${d.restaurants.length}`,
          );
        }
      })
      .catch(() => log("options failed"));
    return () => {
      cancelled = true;
    };
  }, []);

  // -------- when mode flips to cuisine: load recent/frequent dishes
  useEffect(() => {
    if (mode !== "cuisine") return;
    if (recent) return; // cached
    let cancelled = false;
    log("GET /api/food/catalogue/recent (cuisine mode default = your recent/frequent dishes)");
    fetch("/api/food/catalogue/recent", { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Recent | null) => {
        if (!cancelled && d) {
          setRecent(d);
          log(`recent loaded: ${d.dishes.length} dishes (${d.source})`);
        }
      })
      .catch(() => log("recent failed"));
    return () => {
      cancelled = true;
    };
  }, [mode, recent]);

  // -------- mode -> coords (near me only)
  useEffect(() => {
    if (mode !== "near") return;
    if (coords) return;
    if (!navigator.geolocation) {
      setGeoState("denied");
      return;
    }
    setGeoState("asking");
    log("requesting geolocation…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoState("ok");
        log(`geo ok: ${p.coords.latitude.toFixed(4)},${p.coords.longitude.toFixed(4)}`);
      },
      () => {
        // Fallback to Rohtak centre
        setCoords({ lat: 28.8955, lng: 76.6066 });
        setGeoState("denied");
        log("geo denied — falling back to Rohtak centre");
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300_000 },
    );
  }, [mode, coords]);

  // -------- guard: should we hit the search API for this state?
  const shouldFetch = useMemo(() => {
    if (mode === "restaurant") return q.trim().length >= MIN_RESTAURANT_QUERY;
    if (mode === "near") return coords != null;
    if (mode === "cuisine") return cuisine != null || foodCategory != null || (q.trim().length >= 2);
    return false;
  }, [mode, q, coords, cuisine, foodCategory]);

  // -------- search
  const buildUrl = useCallback(() => {
    const p = new URLSearchParams();
    p.set("mode", mode);
    if (q.trim()) p.set("q", q.trim());
    if (cuisine) p.set("cuisine", cuisine);
    if (state) p.set("subRegion", state);
    if (foodCategory) p.set("foodCategory", foodCategory);
    if (restaurantId) p.set("restaurantId", restaurantId);
    if (mode === "near" && coords) {
      p.set("lat", String(coords.lat));
      p.set("lng", String(coords.lng));
      p.set("radius_m", String(radius));
    }
    return `/api/food/catalogue/search?${p.toString()}`;
  }, [mode, q, cuisine, state, foodCategory, restaurantId, radius, coords]);

  useEffect(() => {
    if (!shouldFetch) {
      // Clear stale results when guard fails so the empty-state copy can show
      setData(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const url = buildUrl();
      log(`GET ${url}`);
      setLoading(true);
      fetch(url, { cache: "no-store", signal: ctrl.signal })
        .then((r) => (r.ok ? (r.json() as Promise<SearchResp>) : Promise.reject(r.status)))
        .then((d) => {
          setData(d);
          log(`response: restaurants=${d.total_restaurants} dishes=${d.total_dishes}`);
        })
        .catch((err) => {
          if (!ctrl.signal.aborted) {
            setData(null);
            log(`error: ${String(err)}`);
          }
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [shouldFetch, buildUrl]);

  // -------- restaurant typeahead suggestions (client-side, no API)
  const restaurantSuggestions = useMemo(() => {
    if (mode !== "restaurant" || !opts || q.trim().length < MIN_RESTAURANT_QUERY) return [];
    const Q = q.trim().toLowerCase();
    return opts.restaurants
      .map((r) => {
        const n = r.name.toLowerCase();
        if (n.startsWith(Q)) return { r, tier: 0 };
        if (n.includes(Q)) return { r, tier: 1 };
        return null;
      })
      .filter((x): x is { r: Options["restaurants"][number]; tier: number } => x !== null)
      .sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        if (a.r.is_open !== b.r.is_open) return a.r.is_open ? -1 : 1;
        return b.r.menu_count - a.r.menu_count;
      })
      .slice(0, 10)
      .map((x) => x.r);
  }, [mode, q, opts]);

  // -------- empty-state copy per mode
  const emptyState: string | null = (() => {
    if (loading) return null;
    if (mode === "restaurant" && q.trim().length < MIN_RESTAURANT_QUERY) {
      return `Type ${MIN_RESTAURANT_QUERY}+ characters of a restaurant name to search.`;
    }
    if (mode === "near" && !coords) {
      return geoState === "asking" ? "Fetching your location…" : null;
    }
    if (mode === "cuisine" && !shouldFetch) {
      return null; // recent/frequent block will render
    }
    if (data) {
      if ((mode === "near" || mode === "restaurant") && data.total_restaurants === 0)
        return "No restaurants match.";
      if (mode === "cuisine" && data.total_dishes === 0) return "No dishes match.";
    }
    return null;
  })();

  return (
    <div className="max-w-5xl mx-auto px-4 mt-4">
      {/* Unified top search bar */}
      <div className="bg-white rounded-2xl shadow-lg p-3 flex flex-wrap md:flex-nowrap gap-2 items-center">
        {/* Left dropdown: mode */}
        <select
          value={mode}
          onChange={(e) => {
            const m = e.target.value as Mode;
            setMode(m);
            setRestaurantId(null);
            setData(null);
          }}
          aria-label="Search mode"
          className="rounded-xl px-3 py-2 text-sm bg-white text-gray-800 border border-gray-400 outline-none focus-visible:ring-2 ring-[#00A650]"
        >
          <option value="near">📍 Near me</option>
          <option value="restaurant">🏠 Restaurant</option>
          <option value="cuisine">🍴 Cuisine</option>
        </select>

        {/* Mode-specific middle controls */}
        {mode === "near" && (
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            aria-label="Radius"
            className="rounded-xl px-3 py-2 text-sm bg-white text-gray-800 border border-gray-400 outline-none focus-visible:ring-2 ring-[#00A650]"
          >
            {RADII_M.map((r) => (
              <option key={r} value={r}>
                Within {r >= 1000 ? `${r / 1000} km` : `${r} m`}
              </option>
            ))}
          </select>
        )}

        {mode === "cuisine" && opts && (
          <>
            <select
              value={cuisine ?? ""}
              onChange={(e) => setCuisine(e.target.value || null)}
              className="rounded-xl px-3 py-2 text-sm bg-white text-gray-800 border border-gray-400 outline-none focus-visible:ring-2 ring-[#00A650]"
            >
              <option value="">All cuisines</option>
              {opts.cuisines.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {cuisine === "Indian" && (
              <select
                value={state ?? ""}
                onChange={(e) => setState(e.target.value || null)}
                className="rounded-xl px-3 py-2 text-sm bg-white text-gray-800 border border-gray-400 outline-none focus-visible:ring-2 ring-[#00A650]"
              >
                <option value="">All states</option>
                {opts.states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
            <select
              value={foodCategory ?? ""}
              onChange={(e) => setFoodCategory(e.target.value || null)}
              className="rounded-xl px-3 py-2 text-sm bg-white text-gray-800 border border-gray-400 outline-none focus-visible:ring-2 ring-[#00A650]"
            >
              <option value="">All categories</option>
              {opts.food_categories.map((fc) => (
                <option key={fc} value={fc}>
                  {fc}
                </option>
              ))}
            </select>
          </>
        )}

        {/* Right: free-text box */}
        <div className="relative flex-1 min-w-[14rem]">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (mode === "restaurant") setRestaurantId(null);
            }}
            placeholder={
              mode === "restaurant"
                ? "Type 3+ characters of restaurant name…"
                : mode === "near"
                  ? "Optional: search for a dish nearby…"
                  : "Search dishes…"
            }
            className="w-full rounded-xl px-3 py-2 text-sm bg-white text-gray-800 border border-gray-400 outline-none focus-visible:ring-2 ring-[#00A650]"
          />
          {mode === "restaurant" && restaurantSuggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-20 max-h-72 overflow-y-auto border border-gray-200">
              {restaurantSuggestions.map((r) => (
                <li
                  key={r.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setRestaurantId(r.id);
                    setQ(r.name);
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
      </div>

      {/* Mode-specific status messages */}
      {mode === "restaurant" && q.trim().length > 0 && q.trim().length < MIN_RESTAURANT_QUERY && (
        <p className="text-orange-600 text-xs mt-2">
          Please type at least {MIN_RESTAURANT_QUERY} characters of the restaurant name.
        </p>
      )}
      {mode === "near" && geoState === "asking" && (
        <p className="text-gray-500 text-xs mt-2">Fetching your location…</p>
      )}
      {mode === "near" && geoState === "denied" && (
        <p className="text-orange-600 text-xs mt-2">
          Allow location access to search nearby. Showing results around Rohtak city centre as a fallback.
        </p>
      )}

      {/* Cuisine: default = recent / frequent dishes when no filter selected */}
      {mode === "cuisine" && !shouldFetch && recent && recent.dishes.length > 0 && (
        <div className="mt-4">
          <h3 className="text-gray-800 text-sm font-extrabold mb-2">
            {recent.source === "personalized" ? "Your recent dishes" : "Popular dishes"}
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recent.dishes.map((d) => (
              <DishRow key={d.id} d={d} />
            ))}
          </ul>
        </div>
      )}
      {mode === "cuisine" && !shouldFetch && recent && recent.dishes.length === 0 && (
        <p className="text-gray-500 text-xs mt-3">
          Pick a cuisine, state or category — or type a dish name to search.
        </p>
      )}

      {/* Loading + empty state */}
      {loading && <p className="text-gray-500 text-xs mt-3">Loading…</p>}
      {emptyState && <p className="text-gray-500 text-sm mt-3">{emptyState}</p>}

      {/* Restaurant / Near me results */}
      {data && (mode === "near" || mode === "restaurant") && data.restaurants.length > 0 && (
        <div className="mt-4">
          <h3 className="text-gray-800 text-sm font-extrabold mb-2">
            Restaurants ({data.total_restaurants.toLocaleString()})
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.restaurants.map((r) => (
              <li key={r.id} className="bg-white rounded-2xl border border-gray-200 p-3 flex justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <a href={r.href} className="text-sm font-bold text-gray-800 hover:text-[#F47216] truncate block">
                    {r.name}
                  </a>
                  <p className="text-[11px] text-gray-500 truncate">{r.cuisine}</p>
                  {r.address && <p className="text-[11px] text-gray-400 truncate">📍 {r.address}</p>}
                </div>
                <div className="flex flex-col items-end whitespace-nowrap text-[11px]">
                  {r.distance_m != null && (
                    <span className="text-[#00A650] font-bold">
                      {r.distance_m >= 1000 ? `${(r.distance_m / 1000).toFixed(1)} km` : `${r.distance_m} m`}
                    </span>
                  )}
                  <span className="text-gray-500">{r.menu_count.toLocaleString()} dishes</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cuisine results — dishes only */}
      {data && mode === "cuisine" && data.dishes.length > 0 && (
        <div className="mt-4">
          <h3 className="text-gray-800 text-sm font-extrabold mb-2">
            Dishes ({data.total_dishes.toLocaleString()})
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.dishes.map((d) => (
              <DishRow key={d.id} d={d} />
            ))}
          </ul>
        </div>
      )}

      {/* Debug panel — visible in dev or when ?debug=1 */}
      {(process.env.NODE_ENV !== "production" ||
        (typeof window !== "undefined" && window.location.search.includes("debug=1"))) && (
        <details className="mt-6 border border-gray-300 rounded-xl bg-gray-50 p-3 text-xs">
          <summary className="font-bold cursor-pointer text-gray-700">Debug — API call log</summary>
          <ul className="mt-2 font-mono text-[11px] text-gray-700 space-y-1 max-h-60 overflow-y-auto">
            {debugLog.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function DishRow({ d }: { d: Dish }) {
  return (
    <li className="bg-white rounded-2xl border border-gray-200 p-3 flex justify-between gap-3">
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
        <span className="text-[#F47216] font-extrabold text-sm whitespace-nowrap">₹{d.price_inr}</span>
      )}
    </li>
  );
}
