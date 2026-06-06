"use client";
/**
 * TrackingMap — Leaflet map component for customer order tracking.
 *
 * Uses OpenStreetMap tiles (no API key needed).
 * Only displays when lifecycle_status ∈ {assigned, picked_up}.
 * Shows only { lat, lng } — never driver name or phone.
 * Shows a pulsing "Location updating..." overlay when GPS is stale (> 60 s).
 *
 * This file is loaded with `dynamic(() => import(...), { ssr: false })` so it
 * is never executed during server-side rendering.
 *
 * Requirements: 9.5, 9.6, 9.7
 */

import { useEffect, useRef } from "react";

interface TrackingMapProps {
  lat: number;
  lng: number;
  /** Unix timestamp (ms) of the GPS reading */
  ts: number;
  /** Whether the GPS location is stale (> 60 s old) */
  isStale: boolean;
}

export default function TrackingMap({ lat, lng, ts, isStale }: TrackingMapProps) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let L: any;

    async function initMap() {
      // Dynamic import so this code only runs in the browser
      L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!containerRef.current) return;

      // Avoid double-init on fast re-renders
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      mapRef.current = map;

      // OpenStreetMap tiles — no API key required
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom delivery marker
      const deliveryIcon = L.divIcon({
        className: "",
        html: `
          <div style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 40px;
              height: 40px;
              background-color: #F47216;
              border: 3px solid #fff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              font-size: 20px;
            ">🛵</div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -24],
      });

      const marker = L.marker([lat, lng], { icon: deliveryIcon }).addTo(map);
      markerRef.current = marker;
    }

    initMap().catch(console.error);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  // Update marker position when coordinates change (without full re-init)
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.panTo([lat, lng], { animate: true, duration: 1 });
    }
  }, [lat, lng]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ height: "220px" }}>
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Stale location overlay — shown when GPS is > 60 s old */}
      {isStale && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg">
            {/* Pulsing dot */}
            <span
              className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0"
              style={{
                animation: "pulse 1.2s ease-in-out infinite",
              }}
            />
            <span className="text-xs font-semibold text-gray-700">
              Location updating…
            </span>
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(1.4); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
