"use client";
/**
 * BroadcastListener
 *
 * Invisible background component that listens for new delivery order
 * broadcasts for the Rider's zone.
 *
 * Strategy:
 *  1. Attempt SSE via EventSource on GET /store/delivery/broadcast/stream?zone_id=...
 *  2. If SSE is unavailable (EventSource not supported or stream errors),
 *     fall back to 5-second polling on the same endpoint (without streaming).
 *
 * Only active when the Rider is online and has no active delivery.
 *
 * Requirements: 5.1, 5.2
 */

import { useEffect, useRef } from "react";
import { getStoredToken } from "@/lib/authCookies";
import type { BroadcastEvent } from "@/lib/types/platform";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

const POLL_INTERVAL_MS = 5_000;

interface Props {
  zoneId: string;
  driverId: string;
  onBroadcast: (event: BroadcastEvent) => void;
}

export default function BroadcastListener({ zoneId, driverId, onBroadcast }: Props) {
  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeenRef = useRef<string | null>(null);
  const sseFailedRef = useRef(false);

  function startPolling() {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      const token = getStoredToken();
      if (!token) return;

      try {
        const res = await fetch(
          `${MEDUSA_URL}/store/delivery/broadcast/stream?zone_id=${encodeURIComponent(zoneId)}&driver_id=${encodeURIComponent(driverId)}&poll=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "x-publishable-api-key": PUB_KEY,
            },
            cache: "no-store",
          }
        );
        if (!res.ok) return;

        const data = await res.json().catch(() => null);
        if (!data) return;

        const event: BroadcastEvent = data.event ?? data;
        if (
          event?.type === "new_order" &&
          event.delivery_order_id &&
          event.delivery_order_id !== lastSeenRef.current
        ) {
          lastSeenRef.current = event.delivery_order_id;
          onBroadcast(event);
        }
      } catch {
        // Silently ignore polling errors
      }
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startSSE() {
    if (typeof EventSource === "undefined") {
      sseFailedRef.current = true;
      startPolling();
      return;
    }

    const token = getStoredToken();
    if (!token) {
      startPolling();
      return;
    }

    // EventSource doesn't support custom headers directly, so pass token as query
    const url = `${MEDUSA_URL}/store/delivery/broadcast/stream?zone_id=${encodeURIComponent(zoneId)}&driver_id=${encodeURIComponent(driverId)}&token=${encodeURIComponent(token)}`;

    try {
      const es = new EventSource(url);

      es.onmessage = (e) => {
        try {
          const parsed: BroadcastEvent = JSON.parse(e.data);
          if (
            parsed?.type === "new_order" &&
            parsed.delivery_order_id !== lastSeenRef.current
          ) {
            lastSeenRef.current = parsed.delivery_order_id;
            onBroadcast(parsed);
          }
        } catch {
          // ignore malformed SSE data
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (!sseFailedRef.current) {
          sseFailedRef.current = true;
          // Fall back to polling
          startPolling();
        }
      };

      esRef.current = es;
    } catch {
      sseFailedRef.current = true;
      startPolling();
    }
  }

  function cleanup() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    stopPolling();
  }

  useEffect(() => {
    sseFailedRef.current = false;
    lastSeenRef.current = null;
    startSSE();

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, driverId]);

  // This component renders nothing — it's a side-effect-only listener
  return null;
}
