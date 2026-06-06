"use client";
/**
 * /track — Tracking entry page.
 *
 * For authenticated customers: shows a tracking number input and
 * a "No active delivery" state with a link to order history.
 * Unauthenticated users are redirected to /auth.
 *
 * Requirements: 9.4, 9.9
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { useAuth } from "@/app/context/AuthContext";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

export default function TrackIndexPage() {
  const router = useRouter();
  const { t } = useLang();
  const { customer, token, loading: authLoading } = useAuth();
  const [trackingInput, setTrackingInput] = useState("");
  const [checking, setChecking] = useState(false);

  // Auth guard: redirect to /auth if unauthenticated (Req 9.4)
  useEffect(() => {
    if (!authLoading && !customer) {
      router.replace("/auth");
    }
  }, [authLoading, customer, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = trackingInput.trim();
    if (!num) return;
    router.push(`/track/${encodeURIComponent(num)}`);
  }

  if (authLoading) {
    return (
      <div className="max-w-[480px] mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-white border-t-[#F47216] rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) return null; // redirect in progress

  return (
    <div className="max-w-[480px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">📦</div>
        <h1 className="text-white font-extrabold text-2xl mb-1">
          {t("ऑर्डर ट्रैक करें", "Track Your Order")}
        </h1>
        <p className="text-white/70 text-sm">
          {t(
            "अपना ट्रैकिंग नंबर दर्ज करें",
            "Enter your tracking number below"
          )}
        </p>
      </div>

      {/* Tracking form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="bg-white rounded-2xl shadow-xl p-4 flex gap-2">
          <input
            type="text"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            placeholder={t("ट्रैकिंग नंबर", "Tracking number")}
            className="flex-1 text-sm text-gray-800 bg-transparent outline-none font-mono placeholder-gray-400"
            aria-label={t("ट्रैकिंग नंबर", "Tracking number")}
            autoCapitalize="characters"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={!trackingInput.trim() || checking}
            className="bg-[#F47216] text-white font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-50 transition-opacity"
          >
            {checking ? "…" : t("ट्रैक करें", "Track")}
          </button>
        </div>
      </form>

      {/* No active delivery — with link to order history (Req 9.9) */}
      <div className="bg-white/10 rounded-2xl p-5 text-center">
        <div className="text-3xl mb-2">🔍</div>
        <p className="text-white font-semibold text-sm mb-1">
          {t("कोई सक्रिय डिलीवरी नहीं?", "No active delivery?")}
        </p>
        <p className="text-white/70 text-xs mb-4">
          {t(
            "अपने पिछले ऑर्डर देखने के लिए ऑर्डर इतिहास पर जाएं।",
            "Visit your order history to see past orders."
          )}
        </p>
        <Link
          href="/orders"
          className="inline-block bg-white text-[#F47216] font-bold px-6 py-2.5 rounded-xl text-sm"
        >
          {t("ऑर्डर इतिहास", "Order History")}
        </Link>
      </div>
    </div>
  );
}
