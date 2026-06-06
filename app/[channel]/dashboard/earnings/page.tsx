"use client";
/**
 * EarningsView — Seller Dashboard: Earnings View
 *
 * Fetches GET /store/seller/earnings?channel={handle}
 * Displays total and itemised list (order ID, completion date, subtotal)
 * sorted by completion date descending.
 * Shows ₹0.00 and empty list when there are no completed orders.
 *
 * Date-range filter:
 *   - Validates start ≤ end client-side before API call
 *   - Shows inline error if start > end; does NOT update display
 *   - Re-fetches with from/to params on valid range
 *
 * Uses formatINR from lib/utils/currency.ts for all amounts.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { useState, useEffect, useCallback } from "react";
import { getStoredToken } from "@/lib/authCookies";
import { formatINR } from "@/lib/utils/currency";
import type { SellerEarningsResponse, EarningsItem } from "@/lib/types/platform";

// ── Constants ──────────────────────────────────────────────────────────────
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

// ── API helpers ────────────────────────────────────────────────────────────

async function fetchEarnings(
  channel: string,
  from?: string,
  to?: string
): Promise<SellerEarningsResponse> {
  const token = getStoredToken();
  const url = new URL(`${MEDUSA_URL}/store/seller/earnings`);
  url.searchParams.set("channel", channel);
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-publishable-api-key": PUB_KEY,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  // Ensure items are sorted by completion_date descending
  const items: EarningsItem[] = (data.items ?? []).sort(
    (a: EarningsItem, b: EarningsItem) =>
      new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime()
  );
  return {
    total: data.total ?? 0,
    currency: "INR",
    items,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function shortOrderId(orderId: string): string {
  return orderId.length > 10 ? `…${orderId.slice(-10)}` : orderId;
}

/** Returns today's date as YYYY-MM-DD string */
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "error" | "success";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm max-w-xs text-center ${
        type === "error" ? "bg-red-600" : "bg-green-600"
      }`}
      role="alert"
    >
      {message}
      <button
        onClick={onClose}
        className="ml-3 text-white/70 hover:text-white font-bold"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

// ── Earnings Item Row ────────────────────────────────────────────────────────

function EarningsRow({ item }: { item: EarningsItem }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-b-0 gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs text-gray-500 truncate">
          #{shortOrderId(item.order_id)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDate(item.completion_date)}
        </p>
      </div>
      <span className="font-bold text-sm text-[#F47216] shrink-0">
        {formatINR(item.subtotal)}
      </span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface EarningsViewProps {
  params: { channel: string };
}

export default function EarningsViewPage({ params }: EarningsViewProps) {
  const { channel } = params;

  const [earnings, setEarnings] = useState<SellerEarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Date-range filter state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const [activeFrom, setActiveFrom] = useState<string | undefined>(undefined);
  const [activeTo, setActiveTo] = useState<string | undefined>(undefined);
  const [isFiltered, setIsFiltered] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  function showToast(message: string, type: "error" | "success" = "error") {
    setToast({ message, type });
  }

  // ── Load earnings ─────────────────────────────────────────────────────────
  const loadEarnings = useCallback(
    async (from?: string, to?: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchEarnings(channel, from, to);
        setEarnings(data);
      } catch (err: any) {
        setLoadError(err.message || "Failed to load earnings.");
      } finally {
        setLoading(false);
      }
    },
    [channel]
  );

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  // ── Date-range filter ─────────────────────────────────────────────────────

  function applyFilter() {
    setDateRangeError(null);

    // Client-side validation: start ≤ end
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (start > end) {
        setDateRangeError("Start date must be on or before the end date.");
        return;
      }
    }

    const from = fromDate || undefined;
    const to = toDate || undefined;
    setActiveFrom(from);
    setActiveTo(to);
    setIsFiltered(Boolean(from || to));
    loadEarnings(from, to);
  }

  function clearFilter() {
    setFromDate("");
    setToDate("");
    setDateRangeError(null);
    setActiveFrom(undefined);
    setActiveTo(undefined);
    setIsFiltered(false);
    loadEarnings();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const total = earnings?.total ?? 0;
  const items = earnings?.items ?? [];

  return (
    <div className="w-full max-w-[480px] mx-auto">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Total earnings card */}
      <div
        className="rounded-2xl px-5 py-5 mb-5 text-white shadow-md"
        style={{ backgroundColor: "#F47216" }}
      >
        <p className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-1">
          {isFiltered ? "Earnings (filtered)" : "Total Earnings"}
        </p>
        {loading ? (
          <div className="h-8 flex items-center">
            <div className="animate-spin text-white text-xl">⏳</div>
          </div>
        ) : (
          <p className="text-3xl font-extrabold tracking-tight">
            {formatINR(total)}
          </p>
        )}
        {isFiltered && activeFrom && activeTo && (
          <p className="text-xs text-white/70 mt-1">
            {formatDate(activeFrom)} – {formatDate(activeTo)}
          </p>
        )}
        {isFiltered && activeFrom && !activeTo && (
          <p className="text-xs text-white/70 mt-1">
            From {formatDate(activeFrom)}
          </p>
        )}
        {isFiltered && !activeFrom && activeTo && (
          <p className="text-xs text-white/70 mt-1">
            Until {formatDate(activeTo)}
          </p>
        )}
      </div>

      {/* Date-range filter */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-4 mb-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Filter by Date Range</h3>
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block" htmlFor="from-date">
              From
            </label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              max={todayStr()}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDateRangeError(null);
              }}
              className={`w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47216] ${
                dateRangeError ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
              aria-invalid={!!dateRangeError}
              aria-describedby={dateRangeError ? "date-range-error" : undefined}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block" htmlFor="to-date">
              To
            </label>
            <input
              id="to-date"
              type="date"
              value={toDate}
              max={todayStr()}
              onChange={(e) => {
                setToDate(e.target.value);
                setDateRangeError(null);
              }}
              className={`w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F47216] ${
                dateRangeError ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
              aria-invalid={!!dateRangeError}
            />
          </div>
        </div>

        {/* Date range validation error */}
        {dateRangeError && (
          <p
            id="date-range-error"
            className="text-red-500 text-xs mb-2"
            role="alert"
          >
            {dateRangeError}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={applyFilter}
            disabled={loading}
            className="flex-1 text-white text-xs font-bold py-2 rounded-lg transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#F47216" }}
          >
            Apply Filter
          </button>
          {isFiltered && (
            <button
              type="button"
              onClick={clearFilter}
              disabled={loading}
              className="text-xs px-3 py-2 border border-gray-300 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Load error */}
      {!loading && loadError && (
        <div className="text-center py-8">
          <p className="text-red-500 text-sm">{loadError}</p>
          <button
            type="button"
            onClick={() => loadEarnings(activeFrom, activeTo)}
            className="mt-3 text-[#F47216] text-sm font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Itemised list */}
      {!loadError && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">Completed Orders</h3>
            {!loading && (
              <span className="text-xs text-gray-400">{items.length} order{items.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {/* Loading skeleton rows */}
          {loading && (
            <div className="divide-y divide-gray-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-3 flex justify-between items-center animate-pulse">
                  <div className="space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded w-28" />
                    <div className="h-2.5 bg-gray-100 rounded w-20" />
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && items.length === 0 && (
            <div className="text-center py-10 px-4">
              <div className="text-4xl mb-2">💰</div>
              <p className="text-gray-600 font-semibold text-sm">
                {isFiltered ? "No earnings in this range" : "No completed orders yet"}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {isFiltered
                  ? "Try a different date range."
                  : "Completed orders will appear here."}
              </p>
            </div>
          )}

          {/* Earnings rows */}
          {!loading && items.length > 0 && (
            <div className="px-4 divide-y divide-gray-100">
              {items.map((item) => (
                <EarningsRow key={item.order_id} item={item} />
              ))}
            </div>
          )}

          {/* Summary footer */}
          {!loading && items.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-500">Total</span>
              <span className="text-sm font-extrabold text-[#F47216]">
                {formatINR(total)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
