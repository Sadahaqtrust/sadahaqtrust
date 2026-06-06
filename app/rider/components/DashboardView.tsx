"use client";
/**
 * DashboardView
 *
 * Rider dashboard showing:
 *  - Large green/red online/offline toggle pill
 *  - Profile edit form (name, vehicle type, vehicle registration)
 *  - Earnings tab
 *  - BroadcastListener (SSE / polling) active only when online
 *
 * GPS polling at 10s interval is started when online, stopped when offline.
 *
 * Requirements: 6.1, 4.4, 4.7, 5.1–5.8, 10.1–10.6
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getStoredToken } from "@/lib/authCookies";
import { getCurrentPosition } from "@/lib/utils/gps";
import BroadcastListener from "./BroadcastListener";
import ProfileEditForm from "./ProfileEditForm";
import EarningsView from "./EarningsView";
import type { DriverRecord } from "../page";
import type { BroadcastEvent } from "@/lib/types/platform";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

type DashTab = "home" | "earnings" | "profile";

interface Props {
  driver: DriverRecord;
  onStatusChange: (status: "available" | "offline") => void;
  onDriverUpdated: (updated: Partial<DriverRecord>) => void;
  onBroadcast: (event: BroadcastEvent) => void;
}

export default function DashboardView({
  driver,
  onStatusChange,
  onDriverUpdated,
  onBroadcast,
}: Props) {
  const [tab, setTab] = useState<DashTab>("home");
  const [toggling, setToggling] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsFailCount = useRef(0);
  const [gpsWarning, setGpsWarning] = useState(false);

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── GPS polling loop (active when online) ─────────────────────────────────
  const startGpsPolling = useCallback(() => {
    if (gpsIntervalRef.current) return; // already running
    gpsFailCount.current = 0;

    gpsIntervalRef.current = setInterval(async () => {
      const token = getStoredToken();
      if (!token) return;
      try {
        const pos = await getCurrentPosition();
        await fetch(`${MEDUSA_URL}/store/delivery?action=update-location`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-publishable-api-key": PUB_KEY,
          },
          body: JSON.stringify({
            driver_id: driver.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        });
        gpsFailCount.current = 0;
        setGpsWarning(false);
      } catch {
        gpsFailCount.current += 1;
        if (gpsFailCount.current >= 3) {
          setGpsWarning(true);
        }
      }
    }, 10_000);
  }, [driver.id]);

  const stopGpsPolling = useCallback(() => {
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    gpsFailCount.current = 0;
    setGpsWarning(false);
  }, []);

  useEffect(() => {
    if (driver.status === "available") {
      startGpsPolling();
    } else {
      stopGpsPolling();
    }
    return stopGpsPolling;
  }, [driver.status, startGpsPolling, stopGpsPolling]);

  // ── Online/Offline toggle ──────────────────────────────────────────────────
  async function handleToggle() {
    if (toggling) return;
    const newStatus = driver.status === "available" ? "offline" : "available";
    const apiStatus = newStatus === "available" ? "online" : "offline";
    setToggling(true);

    const token = getStoredToken();
    if (!token) {
      showToast("Session expired", "err");
      setToggling(false);
      return;
    }

    try {
      const res = await fetch(`${MEDUSA_URL}/store/delivery/driver/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-publishable-api-key": PUB_KEY,
        },
        body: JSON.stringify({ status: apiStatus }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast((err as any).error || "Failed to update status", "err");
        return;
      }

      onStatusChange(newStatus);
      showToast(
        newStatus === "available" ? "You are now Online 🟢" : "You are now Offline 🔴"
      );
    } catch (err: any) {
      showToast(err.message || "Network error", "err");
    } finally {
      setToggling(false);
    }
  }

  const isOnline = driver.status === "available";

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-xl z-50 text-sm font-semibold max-w-xs text-center ${
            toast.type === "err" ? "bg-red-600 text-white" : "bg-green-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* GPS Warning Banner */}
      {gpsWarning && (
        <div className="bg-yellow-400 text-yellow-900 text-xs font-semibold px-4 py-2 text-center">
          ⚠️ GPS connection issue — check your internet connection
        </div>
      )}

      {/* Header */}
      <div
        className="px-4 pt-6 pb-4"
        style={{ backgroundColor: "#F47216" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-extrabold text-white">🛵 Rider App</h1>
            <p className="text-white/80 text-xs">{driver.name}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs">{driver.vehicle_type}</p>
            <p className="text-white/60 text-xs font-mono">
              {driver.vehicle_number}
            </p>
          </div>
        </div>

        {/* Online / Offline toggle */}
        <div className="flex items-center justify-center">
          <button
            onClick={handleToggle}
            disabled={toggling}
            aria-pressed={isOnline}
            aria-label={isOnline ? "Go Offline" : "Go Online"}
            className={`relative flex items-center gap-3 px-8 py-4 rounded-full text-white font-extrabold text-base shadow-lg transition-all duration-300 disabled:opacity-60 ${
              isOnline
                ? "bg-green-500 hover:bg-green-600"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full ${
                isOnline ? "bg-white animate-pulse" : "bg-white/50"
              }`}
            />
            {toggling ? "Updating…" : isOnline ? "Online" : "Offline"}
          </button>
        </div>
        <p className="text-center text-white/70 text-xs mt-2">
          {isOnline
            ? "You are visible to customers"
            : "Tap to go online and receive orders"}
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 bg-white">
        {(["home", "earnings", "profile"] as DashTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-bold capitalize transition-colors ${
              tab === t
                ? "text-[#F47216] border-b-2 border-[#F47216]"
                : "text-gray-500"
            }`}
          >
            {t === "home" ? "🏠 Home" : t === "earnings" ? "💰 Earnings" : "👤 Profile"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 px-4 py-4">
        {tab === "home" && (
          <div className="space-y-4">
            {/* Status card */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-700 mb-2">
                Current Status
              </h2>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isOnline ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm font-semibold text-gray-800">
                  {isOnline ? "Online — receiving orders" : "Offline"}
                </span>
              </div>
              {isOnline && (
                <p className="text-xs text-gray-500 mt-1">
                  GPS location is being shared every 10 seconds.
                </p>
              )}
            </div>

            {/* Zone info */}
            {driver.zone_id && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500">
                  Service Zone:{" "}
                  <span className="font-semibold text-gray-700">
                    {driver.zone_id}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "earnings" && (
          <EarningsView driverId={driver.id} />
        )}

        {tab === "profile" && (
          <ProfileEditForm
            driver={driver}
            onUpdated={onDriverUpdated}
          />
        )}
      </div>

      {/* BroadcastListener — active only when online */}
      {isOnline && driver.zone_id && (
        <BroadcastListener
          zoneId={driver.zone_id}
          driverId={driver.id}
          onBroadcast={onBroadcast}
        />
      )}
    </div>
  );
}
