"use client";
/**
 * Customer Order Tracking Page — /track/[number]
 *
 * Polls GET /store/delivery?action=track&tracking={number} every 8 seconds.
 * Maps lifecycle_status to bilingual STATUS_LABELS (English + Hindi).
 * Shows "Reconnecting…" banner if no successful poll for > 30 seconds.
 * Redirects to /auth if unauthenticated.
 * Displays a TrackingEvent timeline sorted chronologically (oldest first).
 * Shows a Leaflet map when lifecycle_status ∈ {assigned, picked_up}.
 * Stale GPS (> 60 s): pulsing "Location updating..." overlay on map marker.
 * Shows "No active delivery" with link to order history for authenticated
 * customers with no active order.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9
 */

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { useAuth } from "@/app/context/AuthContext";
import { isLocationStale } from "@/lib/utils/gps";
import type {
  OrderTrackingResponse,
  TrackingEventRecord,
  DeliveryLifecycleStatus,
} from "@/lib/types/platform";

// ── Constants ─────────────────────────────────────────────────────────────────

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

/** Polling interval: 8 seconds (Req 9.1) */
const POLL_INTERVAL_MS = 8_000;

/** Show "Reconnecting…" banner after 30 s without a successful poll (Req 9.3) */
const RECONNECTING_THRESHOLD_MS = 30_000;

/** GPS reading older than 60 s is considered stale (Req 9.7) */
const GPS_STALE_THRESHOLD_MS = 60_000;

// ── Bilingual status labels (Req 9.2) ─────────────────────────────────────────

const STATUS_LABELS: Record<string, { en: string; hi: string }> = {
  // Synthetic — before DeliveryOrder is created (Req 9.2)
  payment_pending: { en: "Payment Pending", hi: "भुगतान लंबित" },
  // Standard lifecycle statuses
  broadcast: { en: "Waiting for Rider", hi: "राइडर की प्रतीक्षा" },
  assigned: { en: "Rider Assigned", hi: "राइडर असाइन हुआ" },
  ready_for_pickup: { en: "Rider Assigned", hi: "राइडर असाइन हुआ" },
  picked_up: { en: "Out for Delivery", hi: "डिलीवरी के लिए निकला" },
  delivered: { en: "Delivered", hi: "डिलीवर हुआ" },
  complete: { en: "Order Complete", hi: "ऑर्डर पूर्ण" },
  // Fallbacks
  unassigned: { en: "Finding Rider…", hi: "राइडर खोज रहे हैं…" },
  expired: { en: "Order Expired", hi: "ऑर्डर समाप्त" },
};

/**
 * Derive the effective status key from the tracking response.
 *
 * Pre-DeliveryOrder synthetic states (no lifecycle_status yet):
 *  - utr_status = "pending"       → "payment_pending"   (Payment Pending)
 *  - utr_status = "utr_submitted" → "broadcast"         (Waiting for Rider —
 *    cart completion subscriber triggered but DeliveryOrder not yet created)
 */
function deriveStatusKey(data: OrderTrackingResponse): string {
  if (!data.lifecycle_status) {
    if (data.utr_status === "pending") {
      return "payment_pending";
    }
    if (data.utr_status === "utr_submitted") {
      // UTR submitted: subscriber is creating the DeliveryOrder — show
      // "Waiting for Rider" until lifecycle_status arrives.
      return "broadcast";
    }
  }
  return data.lifecycle_status ?? "broadcast";
}

/** Status keys for which the Leaflet map should be visible (Req 9.5) */
const MAP_VISIBLE_STATUSES: Set<string> = new Set(["assigned", "picked_up"]);

// ── Map component (dynamic import, SSR disabled) ──────────────────────────────

const TrackingMap = dynamic(
  () => import("@/app/components/TrackingMap"),
  { ssr: false }
);

// ── Timeline event label ───────────────────────────────────────────────────────

function eventLabel(status: string): string {
  const label = STATUS_LABELS[status];
  if (label) return label.en;
  // Humanize unknown statuses
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Page component ─────────────────────────────────────────────────────────────

export default function TrackingPage({
  params,
}: {
  params: { number: string };
}) {
  const router = useRouter();
  const { t } = useLang();
  const { customer, token, loading: authLoading } = useAuth();

  const [trackingData, setTrackingData] = useState<OrderTrackingResponse | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showReconnecting, setShowReconnecting] = useState(false);

  /** Timestamp (ms) of the last successful poll */
  const lastSuccessRef = useRef<number>(Date.now());
  /** ref for the reconnecting-check interval */
  const reconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** ref for the poll interval */
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auth guard: redirect to /auth if not authenticated ──────────────────────
  useEffect(() => {
    if (!authLoading && !customer) {
      router.replace("/auth");
    }
  }, [authLoading, customer, router]);

  // ── Poll function ────────────────────────────────────────────────────────────
  const poll = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(
        `${MEDUSA_URL}/store/delivery?action=track&tracking=${encodeURIComponent(params.number)}`,
        {
          headers: {
            "x-publishable-api-key": PUB_KEY,
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 401) {
        // Token expired — redirect to auth
        router.replace("/auth");
        return;
      }

      if (!res.ok) {
        if (res.status === 404) {
          setFetchError("not_found");
        } else {
          setFetchError("api_error");
        }
        return;
      }

      const data: OrderTrackingResponse = await res.json();
      setTrackingData(data);
      setFetchError(null);
      lastSuccessRef.current = Date.now();
      setShowReconnecting(false);
    } catch {
      // Network error — do not overwrite existing data, banner will appear if
      // 30 s elapses without success
    } finally {
      setLoadingData(false);
    }
  }, [params.number, token, router]);

  // ── Start polling when authenticated ────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !customer || !token) return;

    // Initial fetch
    poll();

    // Polling every 8 seconds
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    // Reconnecting banner check every second
    reconnectTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastSuccessRef.current;
      setShowReconnecting(elapsed > RECONNECTING_THRESHOLD_MS);
    }, 1_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (reconnectTimerRef.current) clearInterval(reconnectTimerRef.current);
    };
  }, [authLoading, customer, token, poll]);

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (authLoading || (loadingData && !trackingData)) {
    return (
      <div className="max-w-[480px] mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-white border-t-[#F47216] rounded-full animate-spin" />
        <p className="text-white/80 text-sm font-semibold">
          {t("लोड हो रहा है…", "Loading…")}
        </p>
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (fetchError === "not_found") {
    return (
      <div className="max-w-[480px] mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-white font-bold text-lg mb-2">
          {t("ट्रैकिंग नंबर नहीं मिला", "Tracking number not found")}
        </p>
        <p className="text-white/70 text-sm mb-6">
          {t("कृपया अपना ट्रैकिंग नंबर जाँचें।", "Please check your tracking number.")}
        </p>
        <Link
          href="/orders"
          className="inline-block bg-white text-[#F47216] font-bold px-6 py-3 rounded-xl text-sm"
        >
          {t("ऑर्डर इतिहास", "Order History")}
        </Link>
      </div>
    );
  }

  // ── No active delivery (authenticated customer, empty/null tracking data) ────
  if (!trackingData) {
    return (
      <div className="max-w-[480px] mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">📦</div>
        <p className="text-white font-bold text-lg mb-2">
          {t("कोई सक्रिय डिलीवरी नहीं", "No active delivery")}
        </p>
        <p className="text-white/70 text-sm mb-6">
          {t(
            "अभी कोई सक्रिय ऑर्डर नहीं है।",
            "You don't have any active orders right now."
          )}
        </p>
        <Link
          href="/orders"
          className="inline-block bg-white text-[#F47216] font-bold px-6 py-3 rounded-xl text-sm"
        >
          {t("ऑर्डर इतिहास देखें", "View Order History")}
        </Link>
      </div>
    );
  }

  // ── Derive current status ────────────────────────────────────────────────────
  const statusKey = deriveStatusKey(trackingData);
  const statusLabel = STATUS_LABELS[statusKey] ?? STATUS_LABELS.broadcast;
  const showMap =
    MAP_VISIBLE_STATUSES.has(statusKey) && trackingData.driver_location !== null;
  const driverLoc = trackingData.driver_location;
  const gpsStale =
    driverLoc !== null && driverLoc
      ? isLocationStale(driverLoc.ts, GPS_STALE_THRESHOLD_MS)
      : false;

  // Events sorted chronologically ascending (oldest first) (Req 9.8)
  const sortedEvents: TrackingEventRecord[] = [...(trackingData.events ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[480px] mx-auto px-4 py-4 pb-8">
      {/* ── Reconnecting banner (Req 9.3) ─────────────────────────────────── */}
      {showReconnecting && (
        <div className="mb-3 bg-yellow-400 text-yellow-900 rounded-xl px-4 py-2 flex items-center gap-2 font-semibold text-sm shadow">
          <span className="animate-pulse">⚡</span>
          <span>
            {t("पुनः कनेक्ट हो रहा है…", "Reconnecting…")}
          </span>
        </div>
      )}

      {/* ── Status card ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-gray-400 text-xs">
              {t("ट्रैकिंग नं.", "Tracking No.")}
            </p>
            <p className="font-mono font-bold text-[#F47216] text-base leading-tight">
              {trackingData.tracking_number}
            </p>
          </div>
          <span className="text-3xl">
            {statusKey === "payment_pending"
              ? "💳"
              : statusKey === "broadcast"
              ? "📡"
              : statusKey === "assigned" || statusKey === "ready_for_pickup"
              ? "🛵"
              : statusKey === "picked_up"
              ? "📦"
              : statusKey === "delivered"
              ? "✅"
              : statusKey === "complete"
              ? "🎉"
              : "📋"}
          </span>
        </div>

        {/* Bilingual status label (Req 9.2) */}
        <p className="font-extrabold text-xl text-[#F47216] mt-1">
          {t(statusLabel.hi, statusLabel.en)}
        </p>
        <p className="text-gray-400 text-xs mt-0.5">
          {t(statusLabel.en, statusLabel.hi)}
        </p>
      </div>

      {/* ── Leaflet map (Req 9.5, 9.6, 9.7) ──────────────────────────────── */}
      {showMap && driverLoc && (
        <div className="bg-white rounded-2xl shadow p-2 mb-4">
          <p className="text-xs font-bold text-gray-500 mb-2 px-1">
            {t("राइडर की लाइव लोकेशन", "Rider's Live Location")}
          </p>
          <TrackingMap
            lat={driverLoc.lat}
            lng={driverLoc.lng}
            ts={driverLoc.ts}
            isStale={gpsStale}
          />
        </div>
      )}

      {/* ── Timeline of tracking events (Req 9.8) ─────────────────────────── */}
      {sortedEvents.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <h3 className="font-bold text-[#F47216] text-sm mb-3">
            {t("ट्रैकिंग अपडेट", "Tracking Updates")}
          </h3>
          <ol className="flex flex-col gap-3" aria-label="Delivery timeline">
            {sortedEvents.map((ev, idx) => {
              const isLast = idx === sortedEvents.length - 1;
              return (
                <li key={ev.id} className="flex gap-3 items-start">
                  {/* Timeline dot + connector */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-3 h-3 rounded-full border-2 ${
                        isLast
                          ? "bg-[#F47216] border-[#F47216]"
                          : "bg-white border-gray-300"
                      }`}
                    />
                    {!isLast && (
                      <div className="w-0.5 flex-1 bg-gray-200 my-0.5 min-h-[16px]" />
                    )}
                  </div>
                  {/* Event details */}
                  <div className="pb-1">
                    <p className="text-sm font-semibold text-gray-700 leading-tight">
                      {eventLabel(ev.status)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(ev.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* ── "No active delivery" fallback when no events either ───────────── */}
      {sortedEvents.length === 0 && statusKey === "payment_pending" && (
        <div className="bg-white rounded-2xl shadow p-4 mb-4 text-center">
          <div className="text-3xl mb-2">💳</div>
          <p className="text-sm font-semibold text-gray-600">
            {t(
              "भुगतान की पुष्टि का इंतज़ार हो रहा है।",
              "Waiting for payment confirmation."
            )}
          </p>
        </div>
      )}

      {/* ── Link to order history ─────────────────────────────────────────── */}
      <div className="text-center mt-2">
        <Link
          href="/orders"
          className="text-white/70 text-xs underline underline-offset-2"
        >
          {t("ऑर्डर इतिहास देखें", "View Order History")}
        </Link>
      </div>
    </div>
  );
}
