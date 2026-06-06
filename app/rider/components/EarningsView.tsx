"use client";
/**
 * EarningsView
 *
 * Rider earnings tab. Fetches GET /store/delivery/rider/earnings and displays:
 *  - Total earnings
 *  - Itemised list sorted by completion date descending
 *  - Date-range filter with start ≤ end validation
 *
 * All amounts formatted with formatINR (paise → INR).
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import { useState, useEffect, useCallback } from "react";
import { getStoredToken } from "@/lib/authCookies";
import { formatINR } from "@/lib/utils/currency";
import type { RiderEarningsResponse, RiderEarningsItem } from "@/lib/types/platform";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

interface Props {
  driverId: string;
}

export default function EarningsView({ driverId }: Props) {
  const [earnings, setEarnings] = useState<RiderEarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rangeError, setRangeError] = useState<string | null>(null);

  const fetchEarnings = useCallback(
    async (from?: string, to?: string) => {
      setLoading(true);
      setFetchError(null);

      const token = getStoredToken();
      if (!token) {
        setFetchError("Session expired");
        setLoading(false);
        return;
      }

      try {
        const url = new URL(`${MEDUSA_URL}/store/delivery/rider/earnings`);
        if (from) url.searchParams.set("from", from);
        if (to) url.searchParams.set("to", to);
        // driver_id scoping handled server-side from JWT, but pass for clarity
        url.searchParams.set("driver_id", driverId);

        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-publishable-api-key": PUB_KEY,
          },
          cache: "no-store",
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            (err as any).error ||
              (err as any).message ||
              `Failed to load earnings (${res.status})`
          );
        }

        const data: RiderEarningsResponse = await res.json();

        // Sort items by completion_date descending (defensive; should be server-sorted)
        const sortedItems = [...(data.items ?? [])].sort(
          (a, b) =>
            new Date(b.completion_date).getTime() -
            new Date(a.completion_date).getTime()
        );

        setEarnings({ ...data, items: sortedItems });
      } catch (err: any) {
        setFetchError(err.message || "Failed to load earnings");
      } finally {
        setLoading(false);
      }
    },
    [driverId]
  );

  // Initial load (no date filter)
  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  function handleApplyFilter() {
    // Validate date range (req 10.6)
    if (fromDate && toDate && fromDate > toDate) {
      setRangeError("Start date must not be after end date");
      return;
    }
    setRangeError(null);
    fetchEarnings(fromDate || undefined, toDate || undefined);
  }

  function handleClearFilter() {
    setFromDate("");
    setToDate("");
    setRangeError(null);
    fetchEarnings();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-extrabold text-gray-800">My Earnings</h2>

      {/* Date range filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <p className="text-xs font-semibold text-gray-600">Filter by Date</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label
              htmlFor="earnings-from"
              className="text-xs text-gray-500 mb-1 block"
            >
              From
            </label>
            <input
              id="earnings-from"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setRangeError(null);
              }}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#F47216] bg-white"
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="earnings-to"
              className="text-xs text-gray-500 mb-1 block"
            >
              To
            </label>
            <input
              id="earnings-to"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setRangeError(null);
              }}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#F47216] bg-white"
            />
          </div>
        </div>

        {/* Range error */}
        {rangeError && (
          <p role="alert" className="text-red-500 text-xs font-semibold">
            ⚠️ {rangeError}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleApplyFilter}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
            style={{ backgroundColor: "#F47216" }}
          >
            Apply
          </button>
          {(fromDate || toDate) && (
            <button
              onClick={handleClearFilter}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-gray-600 border border-gray-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2 animate-spin">⏳</div>
          <p className="text-xs">Loading earnings…</p>
        </div>
      )}

      {/* Error state */}
      {!loading && fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 text-center">
          ❌ {fetchError}
        </div>
      )}

      {/* Earnings content */}
      {!loading && !fetchError && earnings && (
        <>
          {/* Total earnings card */}
          <div
            className="rounded-2xl p-5 text-white text-center shadow-md"
            style={{ backgroundColor: "#F47216" }}
          >
            <p className="text-sm font-semibold opacity-90">Total Earnings</p>
            <p className="text-3xl font-extrabold mt-1">
              {formatINR(earnings.total)}
            </p>
            {(fromDate || toDate) && (
              <p className="text-xs opacity-80 mt-1">
                {fromDate && toDate
                  ? `${fromDate} — ${toDate}`
                  : fromDate
                  ? `From ${fromDate}`
                  : `Until ${toDate}`}
              </p>
            )}
          </div>

          {/* Itemised list */}
          {earnings.items.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm font-semibold">No deliveries found</p>
              {(fromDate || toDate) && (
                <p className="text-xs mt-1">
                  Try clearing the date filter
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500">
                {earnings.items.length} delivery
                {earnings.items.length !== 1 ? "ies" : "y"}
              </p>
              {earnings.items.map((item: RiderEarningsItem) => (
                <div
                  key={item.delivery_order_id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-gray-700 truncate max-w-[160px]">
                      #{item.delivery_order_id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(item.completion_date).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </div>
                  <p className="font-extrabold text-sm" style={{ color: "#F47216" }}>
                    {formatINR(item.delivery_fee)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
