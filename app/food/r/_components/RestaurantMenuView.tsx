"use client";
import { useState } from "react";
import type { Restaurant } from "@/lib/food/types";
import type { MenuProduct } from "@/lib/food/pg-menu";

type Props = {
  restaurant: Restaurant;
  products: MenuProduct[];
  total: number;
  page: number;
  pageSize: number;
  initialQuery: string;
  basePath: string;
};

function vegIcon(v: MenuProduct["veg_nonveg"]) {
  if (v === "Veg") return "🟢";
  if (v === "Non-Veg") return "🔴";
  return "";
}

export default function RestaurantMenuView({
  restaurant,
  products,
  total,
  page,
  pageSize,
  initialQuery,
  basePath,
}: Props) {
  const [q, setQ] = useState(initialQuery);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <div className="bg-[#F47216] px-4 pt-5 pb-6 relative">
        <div className="max-w-3xl mx-auto">
          <a
            href="/food"
            className="inline-flex items-center gap-1 text-white/90 text-xs font-bold mb-3 hover:text-white"
          >
            <span>←</span>
            <span>All restaurants</span>
          </a>
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl flex-shrink-0">
              🍛
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                {restaurant.name}
              </h1>
              <p className="text-white/80 text-xs mt-1">
                {restaurant.cuisine ? `${restaurant.cuisine} · ` : ""}
                {restaurant.city}
              </p>
              <p className="text-white/80 text-xs">
                🕐{" "}
                {restaurant.hours_24x7
                  ? "Open 24×7"
                  : `${restaurant.opening_time} – ${restaurant.closing_time}`}
                {"  "}·{"  "}
                📖 {restaurant.menu_count.toLocaleString()} dishes
                {restaurant.min_price_inr != null
                  ? `  ·  ₹${restaurant.min_price_inr}+`
                  : ""}
              </p>
            </div>
            {(restaurant.hours_24x7 || restaurant.is_open) && (
              <span className="flex-shrink-0 text-[11px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-800">
                {restaurant.hours_24x7 ? "24×7" : "Open"}
              </span>
            )}
          </div>

          {/* Search inside this menu */}
          <form
            method="GET"
            action={basePath}
            className="mt-5 flex gap-2"
          >
            <input
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search this menu — biryani, paneer, ..."
              className="flex-1 rounded-xl px-4 py-3 text-sm outline-none border-2 border-transparent focus:border-[#00A650] text-gray-800"
            />
            <button
              type="submit"
              className="bg-[#00A650] text-white px-5 py-3 rounded-xl font-bold text-sm"
            >
              🔍
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-3xl mx-auto px-4 mt-6 pb-10">
        <p className="text-gray-500 text-xs mb-3">
          {total.toLocaleString()} dishes
          {initialQuery ? ` for "${initialQuery}"` : ""}
          {totalPages > 1 ? `  ·  page ${page} / ${totalPages}` : ""}
        </p>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🍽️</div>
            <p className="text-gray-500 font-semibold">No dishes found</p>
            <p className="text-gray-400 text-sm">
              Try a different term, or{" "}
              <a href={basePath} className="text-[#F47216] font-bold">
                clear the search
              </a>
              .
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {products.map((p) => (
              <li
                key={p.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-gray-800">
                      <span className="mr-1">{vegIcon(p.veg_nonveg)}</span>
                      {p.title}
                    </h3>
                    {p.price_inr != null && (
                      <span className="flex-shrink-0 text-[#F47216] text-sm font-extrabold">
                        ₹{p.price_inr}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  <p className="text-gray-400 text-[11px] mt-1">
                    {p.category ? `${p.category}` : ""}
                    {p.cuisine_origin
                      ? `${p.category ? " · " : ""}${p.cuisine_origin}`
                      : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6 text-sm">
            {page > 1 && (
              <a
                href={pageHref(page - 1)}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 font-bold text-gray-600 hover:bg-[#F47216] hover:text-white"
              >
                ← Previous
              </a>
            )}
            <span className="px-3 py-2 text-gray-400">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={pageHref(page + 1)}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 font-bold text-gray-600 hover:bg-[#F47216] hover:text-white"
              >
                Next →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
