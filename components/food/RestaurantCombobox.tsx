"use client";
import { useId, useMemo, useRef, useState } from "react";
import type { RestaurantStub } from "@/lib/food/catalogue-static";
import { rankRestaurants, MIN_QUERY, type Ranked } from "@/lib/food/match";

export type RestaurantComboboxProps = {
  restaurants: readonly RestaurantStub[];
  value: RestaurantStub | null;
  onChange: (r: RestaurantStub | null) => void;
  label?: string;
  placeholder?: string;
};

export default function RestaurantCombobox({
  restaurants,
  value,
  onChange,
  label = "Restaurant",
  placeholder = "Type 3+ characters…",
}: RestaurantComboboxProps) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const listboxId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results: Ranked[] = useMemo(() => {
    try {
      return rankRestaurants(restaurants, query);
    } catch (e) {
      // Pure helper threw unexpectedly; surface an empty list per design §9.
      console.error("food.rank", e);
      return [];
    }
  }, [restaurants, query]);

  const shortQuery = query.trim().length > 0 && query.trim().length < MIN_QUERY;
  const listOpen = open && !shortQuery;

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!listOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && results[activeIdx]) {
        e.preventDefault();
        select(results[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  function select(r: Ranked) {
    onChange({
      id: r.id,
      name: r.name,
      cuisine: r.cuisine,
      is_open: r.is_open,
      menu_count: r.menu_count,
    });
    setQuery(r.name);
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.blur();
  }

  function clear() {
    onChange(null);
    setQuery("");
    setActiveIdx(-1);
  }

  return (
    <div className="flex flex-col gap-1 min-w-[14rem] relative" data-testid="restaurant-combobox">
      <label htmlFor={inputId} className="text-[11px] font-bold text-white/90">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIdx(-1);
            if (value && e.target.value !== value.name) onChange(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Let click on a row register before closing.
            setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={handleKey}
          type="text"
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIdx >= 0 ? `${listboxId}-opt-${activeIdx}` : undefined
          }
          aria-autocomplete="list"
          placeholder={placeholder}
          className="w-full rounded-xl px-3 py-2 text-sm bg-white text-gray-800 outline-none border-2 border-transparent focus-visible:ring-2 ring-[#00A650] pr-8"
        />
        {query && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clear}
            aria-label="Clear"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-sm"
          >
            ×
          </button>
        )}
      </div>

      {listOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg z-20 max-h-80 overflow-y-auto border border-gray-100"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-500" aria-disabled="true">
              {query.trim().length < MIN_QUERY
                ? `Type ${MIN_QUERY}+ characters to search…`
                : `No restaurants match "${query}". Try a different spelling.`}
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.id}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(r);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center gap-3 ${
                  i === activeIdx ? "bg-orange-50" : "hover:bg-gray-50"
                }`}
              >
                <span className="font-semibold text-gray-800 truncate">{r.name}</span>
                <span className="text-[11px] text-[#F47216] font-semibold whitespace-nowrap">
                  {r.cuisine}
                  {!r.is_open && <span className="ml-2 text-gray-400">· Closed</span>}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
