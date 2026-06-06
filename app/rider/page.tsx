"use client";
/**
 * RiderShell — main Rider App entry point.
 *
 * Manages a view state machine:
 *   "registration"    → first-time rider, no Driver record
 *   "dashboard"       → online/offline toggle, earnings tab, profile edit
 *   "broadcast"       → incoming order notification card (overlay)
 *   "active_delivery" → live delivery tracking screen
 *
 * On mount: calls GET /store/delivery?action=my-driver.
 *   - 204 / no driver object → show registration
 *   - 200 with driver → show dashboard
 *
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 5.1–5.8, 6.1–6.7, 10.1–10.6
 */

import { useState, useEffect, useCallback } from "react";
import RegistrationForm from "./components/RegistrationForm";
import DashboardView from "./components/DashboardView";
import BroadcastCard from "./components/BroadcastCard";
import ActiveDelivery from "./components/ActiveDelivery";
import { getStoredToken } from "@/lib/authCookies";
import type {
  BroadcastEvent,
  DeliveryOrderSummary,
} from "@/lib/types/platform";

export type RiderView =
  | "registration"
  | "dashboard"
  | "broadcast"
  | "active_delivery";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

export interface DriverRecord {
  id: string;
  name: string;
  phone: string;
  vehicle_type: string;
  vehicle_number: string;
  status: "available" | "offline" | "busy";
  zone_id: string | null;
  user_id: string | null;
}

export default function RiderShell() {
  const [view, setView] = useState<RiderView | null>(null); // null = loading
  const [driver, setDriver] = useState<DriverRecord | null>(null);
  const [broadcast, setBroadcast] = useState<BroadcastEvent | null>(null);
  const [activeDelivery, setActiveDelivery] =
    useState<DeliveryOrderSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  /** Fetch the current driver record linked to the authenticated customer. */
  const fetchDriver = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      // Redirect handled by layout/middleware; show minimal state
      setView("registration");
      return;
    }

    try {
      const res = await fetch(
        `${MEDUSA_URL}/store/delivery?action=my-driver`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-publishable-api-key": PUB_KEY,
          },
          cache: "no-store",
        }
      );

      if (res.status === 204 || res.status === 404) {
        setView("registration");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setView("registration");
          return;
        }
        throw new Error((err as any).error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const driverData: DriverRecord = data.driver ?? data;

      if (!driverData?.id) {
        setView("registration");
        return;
      }

      setDriver(driverData);

      // If driver is busy and has an active delivery, restore active_delivery view
      if (driverData.status === "busy") {
        try {
          const token2 = getStoredToken();
          const aRes = await fetch(
            `${MEDUSA_URL}/store/delivery?action=my-active-delivery`,
            {
              headers: {
                Authorization: `Bearer ${token2}`,
                "x-publishable-api-key": PUB_KEY,
              },
              cache: "no-store",
            }
          );
          if (aRes.ok) {
            const aData = await aRes.json();
            const order: DeliveryOrderSummary =
              aData.delivery_order ?? aData;
            if (order?.id) {
              setActiveDelivery(order);
              setView("active_delivery");
              return;
            }
          }
        } catch {
          // ignore — fall through to dashboard
        }
      }

      setView("dashboard");
    } catch (err: any) {
      setLoadError(err.message || "Failed to load rider profile");
      setView("dashboard"); // show dashboard with potential error state
    }
  }, []);

  useEffect(() => {
    fetchDriver();
  }, [fetchDriver]);

  /** Called by RegistrationForm on successful registration. */
  function handleRegistered(newDriver: DriverRecord) {
    setDriver(newDriver);
    setView("dashboard");
  }

  /** Called when a broadcast event arrives. */
  function handleBroadcast(event: BroadcastEvent) {
    // Only show broadcast when online and no active delivery
    if (view === "dashboard" && driver?.status === "available") {
      setBroadcast(event);
      setView("broadcast");
    }
  }

  /** Called when Rider accepts a broadcast order. */
  function handleAccepted(order: DeliveryOrderSummary) {
    setActiveDelivery(order);
    setBroadcast(null);
    setView("active_delivery");
  }

  /** Called when broadcast card is dismissed (reject / timeout / taken). */
  function handleBroadcastDismissed() {
    setBroadcast(null);
    setView("dashboard");
  }

  /** Called when delivery is completed. */
  function handleDeliveryComplete() {
    setActiveDelivery(null);
    setDriver((prev) =>
      prev ? { ...prev, status: "offline" } : prev
    );
    setView("dashboard");
    // Refresh driver record so earnings are up to date
    fetchDriver();
  }

  /** Called when driver online/offline status changes. */
  function handleStatusChange(newStatus: "available" | "offline") {
    setDriver((prev) => (prev ? { ...prev, status: newStatus } : prev));
  }

  /** Called after profile update. */
  function handleDriverUpdated(updated: Partial<DriverRecord>) {
    setDriver((prev) => (prev ? { ...prev, ...updated } : prev));
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (view === null) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-spin">⏳</div>
          <p className="text-sm text-gray-500">Loading Rider App…</p>
        </div>
      </div>
    );
  }

  // ── Registration ───────────────────────────────────────────────────────────
  if (view === "registration") {
    return <RegistrationForm onRegistered={handleRegistered} />;
  }

  // ── Active Delivery ────────────────────────────────────────────────────────
  if (view === "active_delivery" && activeDelivery && driver) {
    return (
      <ActiveDelivery
        delivery={activeDelivery}
        driver={driver}
        onComplete={handleDeliveryComplete}
      />
    );
  }

  // ── Dashboard (with optional broadcast overlay) ────────────────────────────
  return (
    <>
      {driver && (
        <DashboardView
          driver={driver}
          onStatusChange={handleStatusChange}
          onDriverUpdated={handleDriverUpdated}
          onBroadcast={handleBroadcast}
        />
      )}

      {/* Broadcast card overlays the dashboard */}
      {view === "broadcast" && broadcast && (
        <BroadcastCard
          event={broadcast}
          driverId={driver?.id ?? ""}
          onAccepted={handleAccepted}
          onDismissed={handleBroadcastDismissed}
        />
      )}

      {loadError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-2 rounded-xl shadow-xl z-50 text-sm max-w-xs text-center">
          {loadError}
        </div>
      )}
    </>
  );
}
