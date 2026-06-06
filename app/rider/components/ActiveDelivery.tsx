"use client";
/**
 * ActiveDelivery
 *
 * Live delivery tracking screen shown after a Rider accepts an order.
 *
 * States within this screen:
 *   "pickup"   → show pickup address + Confirm Pickup button
 *   "dropoff"  → show dropoff address + Confirm Delivery button
 *   "complete" → show earnings / completion screen
 *
 * Features:
 *  - Pickup address + "Navigate to Pickup" link (maps.google.com/maps?daddr=...)
 *  - GPS polling every 10s: POST /store/delivery?action=update-location
 *  - Connectivity warning after 3 consecutive GPS failures
 *  - GPS permission check: if denied → persistent yellow banner, disable actions
 *  - Confirm Pickup: POST /store/delivery?action=update-status { status: "picked_up" }
 *  - Confirm Delivery: POST /store/delivery?action=update-status { status: "delivered" }
 *  - Show delivery fee on completion
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getStoredToken } from "@/lib/authCookies";
import { getCurrentPosition } from "@/lib/utils/gps";
import { formatINR } from "@/lib/utils/currency";
import type { DeliveryOrderSummary } from "@/lib/types/platform";
import type { DriverRecord } from "../page";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

const GPS_INTERVAL_MS = 10_000;
const GPS_FAIL_THRESHOLD = 3;

type DeliveryPhase = "pickup" | "dropoff" | "complete";

interface Props {
  delivery: DeliveryOrderSummary;
  driver: DriverRecord;
  onComplete: () => void;
}

export default function ActiveDelivery({ delivery, driver, onComplete }: Props) {
  const [phase, setPhase] = useState<DeliveryPhase>("pickup");
  const [gpsPermission, setGpsPermission] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const [connectivityWarning, setConnectivityWarning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsFailCountRef = useRef(0);
  const lastPosRef = useRef<{ lat: number; lng: number } | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // ── Check GPS permission ───────────────────────────────────────────────────
  const checkGpsPermission = useCallback(async () => {
    if (typeof navigator === "undefined") return;

    try {
      const result = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      });
      setGpsPermission(result.state as "granted" | "denied" | "prompt");

      result.onchange = () => {
        setGpsPermission(result.state as "granted" | "denied" | "prompt");
      };
    } catch {
      // navigator.permissions not supported — try direct geolocation
      if (navigator.geolocation) {
        setGpsPermission("prompt");
      } else {
        setGpsPermission("denied");
      }
    }
  }, []);

  useEffect(() => {
    checkGpsPermission();
  }, [checkGpsPermission]);

  // ── GPS polling loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "complete") return;
    if (gpsPermission === "denied") return;

    gpsIntervalRef.current = setInterval(async () => {
      const token = getStoredToken();
      if (!token) return;

      try {
        const pos = await getCurrentPosition();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        lastPosRef.current = { lat, lng };

        await fetch(`${MEDUSA_URL}/store/delivery?action=update-location`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-publishable-api-key": PUB_KEY,
          },
          body: JSON.stringify({
            driver_id: driver.id,
            lat,
            lng,
          }),
        });

        gpsFailCountRef.current = 0;
        setConnectivityWarning(false);
      } catch {
        gpsFailCountRef.current += 1;
        if (gpsFailCountRef.current >= GPS_FAIL_THRESHOLD) {
          setConnectivityWarning(true);
        }
        // Silently ignore individual failures (req 6.7)
      }
    }, GPS_INTERVAL_MS);

    return () => {
      if (gpsIntervalRef.current) {
        clearInterval(gpsIntervalRef.current);
        gpsIntervalRef.current = null;
      }
    };
  }, [phase, gpsPermission, driver.id]);

  // ── Confirm Pickup ─────────────────────────────────────────────────────────
  async function handleConfirmPickup() {
    if (confirming) return;
    setConfirming(true);
    setActionError(null);

    const token = getStoredToken();
    if (!token) {
      setActionError("Session expired");
      setConfirming(false);
      return;
    }

    try {
      const pos = await getCurrentPosition().catch(() => null);
      const lat = pos?.coords.latitude ?? lastPosRef.current?.lat ?? null;
      const lng = pos?.coords.longitude ?? lastPosRef.current?.lng ?? null;

      const res = await fetch(
        `${MEDUSA_URL}/store/delivery?action=update-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-publishable-api-key": PUB_KEY,
          },
          body: JSON.stringify({
            delivery_id: delivery.id,
            status: "picked_up",
            lat,
            lng,
          }),
        }
      );

      if (res.ok) {
        setPhase("dropoff");
        showToast("Pickup confirmed ✅");
      } else {
        const err = await res.json().catch(() => ({}));
        setActionError(
          (err as any).error || (err as any).message || `Failed (${res.status})`
        );
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setConfirming(false);
    }
  }

  // ── Confirm Delivery ───────────────────────────────────────────────────────
  async function handleConfirmDelivery() {
    if (confirming) return;
    setConfirming(true);
    setActionError(null);

    const token = getStoredToken();
    if (!token) {
      setActionError("Session expired");
      setConfirming(false);
      return;
    }

    try {
      const pos = await getCurrentPosition().catch(() => null);
      const lat = pos?.coords.latitude ?? lastPosRef.current?.lat ?? null;
      const lng = pos?.coords.longitude ?? lastPosRef.current?.lng ?? null;

      const res = await fetch(
        `${MEDUSA_URL}/store/delivery?action=update-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-publishable-api-key": PUB_KEY,
          },
          body: JSON.stringify({
            delivery_id: delivery.id,
            status: "delivered",
            lat,
            lng,
          }),
        }
      );

      if (res.ok) {
        setPhase("complete");
      } else {
        const err = await res.json().catch(() => ({}));
        setActionError(
          (err as any).error || (err as any).message || `Failed (${res.status})`
        );
      }
    } catch (err: any) {
      setActionError(err.message || "Network error");
    } finally {
      setConfirming(false);
    }
  }

  const gpsBlocked = gpsPermission === "denied";
  const actionsDisabled = gpsBlocked || confirming;

  // ── Completion screen ──────────────────────────────────────────────────────
  if (phase === "complete") {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          Delivery Complete!
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          You've earned
        </p>
        <div
          className="text-3xl font-extrabold mb-8"
          style={{ color: "#F47216" }}
        >
          {formatINR(delivery.delivery_fee)}
        </div>
        <button
          onClick={onComplete}
          className="w-full max-w-xs py-4 rounded-2xl font-extrabold text-white text-base"
          style={{ backgroundColor: "#F47216" }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const navigateAddress =
    phase === "pickup" ? delivery.pickup_address : delivery.dropoff_address;

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-xl z-50 text-sm font-semibold max-w-xs text-center">
          {toast}
        </div>
      )}

      {/* GPS Denied Banner (persistent yellow, req 6.5) */}
      {gpsBlocked && (
        <div
          role="alert"
          className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-4 py-3 text-center"
        >
          📍 Location access is required to confirm pickup and delivery. Please
          enable GPS in your browser settings.
        </div>
      )}

      {/* Connectivity Warning Banner (req 6.7) */}
      {connectivityWarning && !gpsBlocked && (
        <div
          role="alert"
          className="bg-orange-400 text-orange-900 text-xs font-semibold px-4 py-2 text-center"
        >
          ⚠️ GPS signal lost — check your internet connection
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-6 pb-4" style={{ backgroundColor: "#F47216" }}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">
            {phase === "pickup" ? "📦" : "🚴"}
          </span>
          <div>
            <h1 className="text-lg font-extrabold text-white">
              {phase === "pickup" ? "Head to Pickup" : "Out for Delivery"}
            </h1>
            <p className="text-white/80 text-xs">
              {phase === "pickup"
                ? "Collect the order from the store"
                : "Deliver to the customer"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Address card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 mb-1">
            {phase === "pickup" ? "Pickup Address" : "Delivery Address"}
          </p>
          <p className="text-sm font-semibold text-gray-800">{navigateAddress}</p>

          <a
            href={`https://maps.google.com/maps?daddr=${encodeURIComponent(navigateAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-blue-600"
          >
            🗺️ Navigate to {phase === "pickup" ? "Pickup" : "Delivery"} →
          </a>
        </div>

        {/* Delivery fee info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">Delivery Earnings</p>
          <p className="text-lg font-extrabold" style={{ color: "#F47216" }}>
            {formatINR(delivery.delivery_fee)}
          </p>
        </div>

        {/* Action error */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-semibold">
            ❌ {actionError}
          </div>
        )}

        {/* GPS blocked hint */}
        {gpsBlocked && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-800 font-semibold">
            Actions disabled until GPS access is granted.
          </div>
        )}
      </div>

      {/* Fixed bottom action */}
      <div className="px-4 pb-8 pt-2">
        {phase === "pickup" ? (
          <button
            onClick={handleConfirmPickup}
            disabled={actionsDisabled}
            className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#F47216" }}
            aria-disabled={actionsDisabled}
          >
            {confirming ? "Confirming…" : "✅ Confirm Pickup"}
          </button>
        ) : (
          <button
            onClick={handleConfirmDelivery}
            disabled={actionsDisabled}
            className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "#22c55e" }}
            aria-disabled={actionsDisabled}
          >
            {confirming ? "Confirming…" : "🏁 Confirm Delivery"}
          </button>
        )}
      </div>
    </div>
  );
}
