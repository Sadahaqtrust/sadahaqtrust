"use client";
/**
 * BroadcastCard
 *
 * Bottom-sheet modal that appears when a new delivery order is broadcast.
 *
 * Shows:
 *  - Store name, pickup address, estimated distance, delivery fee
 *  - 45-second animated countdown ring around the Accept button
 *  - Reject button
 *  - Auto-dismisses after 45 seconds
 *
 * Accept flow:
 *  - POST /store/delivery/accept
 *  - On 200 → calls onAccepted(order)
 *  - On API error → reset countdown to 45s, show error toast; up to 3 attempts
 *    then auto-dismiss
 *  - On 409 already_claimed → dismiss with "Order no longer available"
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 5.8
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getStoredToken } from "@/lib/authCookies";
import { formatINR } from "@/lib/utils/currency";
import type { BroadcastEvent, DeliveryOrderSummary } from "@/lib/types/platform";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

const COUNTDOWN_SEC = 45;
const MAX_ATTEMPTS = 3;

// SVG circle parameters
const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  event: BroadcastEvent;
  driverId: string;
  onAccepted: (order: DeliveryOrderSummary) => void;
  onDismissed: () => void;
}

export default function BroadcastCard({
  event,
  driverId,
  onAccepted,
  onDismissed,
}: Props) {
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SEC);
  const [accepting, setAccepting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dismissMsg, setDismissMsg] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback((seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);
  }, []);

  // Auto-dismiss when countdown reaches 0
  useEffect(() => {
    if (timeLeft === 0) {
      onDismissed();
    }
  }, [timeLeft, onDismissed]);

  // Start countdown on mount
  useEffect(() => {
    startTimer(COUNTDOWN_SEC);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const strokeDashoffset =
    CIRCUMFERENCE - (timeLeft / COUNTDOWN_SEC) * CIRCUMFERENCE;

  async function handleAccept() {
    if (accepting) return;

    const token = getStoredToken();
    if (!token) {
      onDismissed();
      return;
    }

    setAccepting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${MEDUSA_URL}/store/delivery/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-publishable-api-key": PUB_KEY,
        },
        body: JSON.stringify({
          delivery_order_id: event.delivery_order_id,
          driver_id: driverId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const order: DeliveryOrderSummary =
          data.delivery_order ?? data;
        onAccepted(order);
        return;
      }

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        const reason = (data as any).reason;
        if (reason === "already_claimed" || reason === "expired") {
          setDismissMsg("Order no longer available");
          setTimeout(onDismissed, 2_000);
          return;
        }
      }

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setDismissMsg("Too many failed attempts. Dismissing.");
        setTimeout(onDismissed, 2_000);
        return;
      }

      const errorData = await res.json().catch(() => ({}));
      const msg =
        (errorData as any).error ||
        (errorData as any).message ||
        `Failed to accept (${res.status}). Try again.`;
      setErrorMsg(msg);

      // Reset countdown on error (per requirement 5.7)
      startTimer(COUNTDOWN_SEC);
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setDismissMsg("Network error. Dismissing.");
        setTimeout(onDismissed, 2_000);
        return;
      }

      setErrorMsg(err.message || "Network error. Please try again.");
      startTimer(COUNTDOWN_SEC);
    } finally {
      setAccepting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onDismissed}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto bg-white rounded-t-3xl shadow-2xl"
        style={{ maxWidth: "480px" }}
        role="dialog"
        aria-modal="true"
        aria-label="New delivery order"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pb-8 pt-2">
          {/* Header */}
          <div className="text-center mb-4">
            <p className="text-xs font-semibold text-[#F47216] uppercase tracking-wide">
              New Delivery Request
            </p>
            <h2 className="text-lg font-extrabold text-gray-900 mt-0.5">
              {event.store_name}
            </h2>
          </div>

          {/* Order details */}
          <div className="bg-[#FFF8F0] rounded-2xl p-4 mb-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-green-600 font-bold text-base mt-0.5">↑</span>
              <div>
                <p className="text-xs text-gray-500">Pickup</p>
                <p className="text-sm font-semibold text-gray-800">
                  {event.pickup_address}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 text-xs">
                Distance: ~{event.estimated_distance_km.toFixed(1)} km
              </span>
              <span className="font-extrabold text-[#F47216]">
                {formatINR(event.delivery_fee)}
              </span>
            </div>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 mb-4 text-xs text-red-600 font-semibold text-center">
              {errorMsg}
              {attempts < MAX_ATTEMPTS && (
                <span className="ml-1">
                  ({MAX_ATTEMPTS - attempts} attempt
                  {MAX_ATTEMPTS - attempts !== 1 ? "s" : ""} left)
                </span>
              )}
            </div>
          )}

          {/* Dismiss message */}
          {dismissMsg && (
            <div className="bg-gray-100 rounded-xl px-4 py-2 mb-4 text-xs text-gray-600 font-semibold text-center">
              {dismissMsg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-4">
            {/* Reject */}
            <button
              onClick={onDismissed}
              disabled={accepting}
              className="flex-1 py-4 rounded-2xl border-2 border-gray-300 text-gray-600 font-bold text-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
            >
              Reject
            </button>

            {/* Accept with countdown ring */}
            <div className="relative flex items-center justify-center">
              {/* SVG countdown ring */}
              <svg
                width={96}
                height={96}
                className="absolute -rotate-90"
                aria-hidden="true"
              >
                {/* Track */}
                <circle
                  cx={48}
                  cy={48}
                  r={RADIUS}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={5}
                />
                {/* Progress */}
                <circle
                  cx={48}
                  cy={48}
                  r={RADIUS}
                  fill="none"
                  stroke="#F47216"
                  strokeWidth={5}
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>

              <button
                onClick={handleAccept}
                disabled={accepting || !!dismissMsg}
                aria-label={`Accept order, ${timeLeft} seconds remaining`}
                className="relative z-10 w-24 h-24 rounded-full bg-green-500 hover:bg-green-600 text-white font-extrabold text-sm flex flex-col items-center justify-center shadow-lg disabled:opacity-60 transition-colors"
              >
                {accepting ? (
                  <span className="text-xs">...</span>
                ) : (
                  <>
                    <span>Accept</span>
                    <span className="text-lg font-black tabular-nums">
                      {timeLeft}s
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
