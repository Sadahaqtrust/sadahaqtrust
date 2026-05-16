"use client";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

const STATUS_STEPS = ["pending", "dispatched", "en_route", "picked_up", "completed"];

const STATUS_INFO: Record<string, { icon: string; label_en: string; label_hi: string; color: string }> = {
  pending:    { icon: "⏳", label_en: "Order Received",     label_hi: "ऑर्डर प्राप्त",        color: "text-yellow-500" },
  dispatched: { icon: "🚀", label_en: "Driver Assigned",    label_hi: "ड्राइवर नियुक्त",       color: "text-blue-500" },
  en_route:   { icon: "🚴", label_en: "Out for Delivery",   label_hi: "डिलीवरी के लिए निकला", color: "text-orange-500" },
  arrived:    { icon: "📍", label_en: "Driver Arrived",     label_hi: "ड्राइवर पहुंचा",        color: "text-purple-500" },
  picked_up:  { icon: "📦", label_en: "Order Picked Up",    label_hi: "ऑर्डर उठाया",           color: "text-indigo-500" },
  completed:  { icon: "✅", label_en: "Delivered",          label_hi: "डिलीवर हुआ",            color: "text-green-500" },
  cancelled:  { icon: "❌", label_en: "Cancelled",          label_hi: "रद्द",                  color: "text-red-500" },
  failed:     { icon: "⚠️", label_en: "Failed",             label_hi: "विफल",                  color: "text-red-500" },
};

export default function TrackingPage({ params }: { params: { number: string } }) {
  const { t } = useLang();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${MEDUSA_URL}/store/delivery?action=track&tracking=${params.number}`, {
          headers: { "x-publishable-api-key": PUB_KEY },
        });
        if (!res.ok) { setError(t("ट्रैकिंग नंबर नहीं मिला", "Tracking number not found")); return; }
        const d = await res.json();
        setData(d);
      } catch { setError(t("नेटवर्क त्रुटि", "Network error")); }
      finally { setLoading(false); }
    }
    load();
    const interval = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [params.number]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-white border-t-[#00A650] rounded-full animate-spin"></div>
    </div>
  );

  if (error) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">🔍</div>
      <p className="text-white font-bold text-lg">{error}</p>
    </div>
  );

  const { delivery, events, driver_location } = data;
  const statusInfo = STATUS_INFO[delivery.status] || STATUS_INFO.pending;
  const currentStep = STATUS_STEPS.indexOf(delivery.status);

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-gray-400 text-xs">{t("ट्रैकिंग नं.", "Tracking No.")}</p>
            <p className="font-mono font-bold text-[#F47216] text-lg">{delivery.tracking_number}</p>
          </div>
          <div className={`text-3xl ${statusInfo.color}`}>{statusInfo.icon}</div>
        </div>
        <p className={`font-extrabold text-xl ${statusInfo.color}`}>
          {t(statusInfo.label_hi, statusInfo.label_en)}
        </p>
        {delivery.estimated_arrival && delivery.status !== "completed" && (
          <p className="text-gray-500 text-sm mt-1">
            {t("अनुमानित समय", "ETA")}: {new Date(delivery.estimated_arrival).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {/* Progress bar */}
      {delivery.status !== "cancelled" && delivery.status !== "failed" && (
        <div className="bg-white rounded-2xl shadow p-4 mb-4">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                  i <= currentStep ? "bg-[#00A650] border-[#00A650] text-white" : "bg-gray-100 border-gray-200 text-gray-400"
                }`}>
                  {i < currentStep ? "✓" : i + 1}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-1 rounded ${i < currentStep ? "bg-[#00A650]" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Addresses */}
      <div className="bg-white rounded-2xl shadow p-4 mb-4">
        <div className="flex gap-3 mb-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-[#F47216]"></div>
            <div className="w-0.5 h-8 bg-gray-200 my-1"></div>
            <div className="w-3 h-3 rounded-full bg-[#00A650]"></div>
          </div>
          <div className="flex-1">
            <div className="mb-3">
              <p className="text-xs text-gray-400">{t("पिकअप", "Pickup")}</p>
              <p className="text-sm font-semibold text-gray-700">{delivery.pickup_name}</p>
              <p className="text-xs text-gray-500">{delivery.pickup_address}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">{t("डिलीवरी", "Delivery")}</p>
              <p className="text-sm font-semibold text-gray-700">{delivery.dropoff_name}</p>
              <p className="text-xs text-gray-500">{delivery.dropoff_address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-bold text-[#F47216] mb-3 text-sm">{t("अपडेट", "Updates")}</h3>
        <div className="flex flex-col gap-3">
          {events.map((ev: any) => (
            <div key={ev.id} className="flex gap-3 items-start">
              <div className="w-2 h-2 rounded-full bg-[#00A650] mt-1.5 flex-shrink-0"></div>
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  {t(ev.message_hi || ev.message, ev.message)}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(ev.created_at).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
