"use client";
import Link from "next/link";
import { useLang } from "@/lib/lang";

export default function RiderAuthPage() {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a237e] to-[#FFF8F0] px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">🛵</div>
          <h1 className="text-2xl font-extrabold text-white">
            {t("डिलीवरी पार्टनर", "Delivery Partner")}
          </h1>
          <p className="text-white/80 text-sm mt-1">
            {t("रोहतक में डिलीवरी करें — अपनी शर्तों पर कमाएं", "Deliver in Rohtak — Earn on your terms")}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-5 space-y-3">

          {/* Register */}
          <a href="https://fleet.digitalrohtak.online/auth/sign-up" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 w-full bg-[#1a237e] p-4 rounded-xl hover:bg-[#283593] active:scale-95 transition-all">
            <span className="text-2xl">＋</span>
            <div className="flex-1 text-left">
              <div className="font-extrabold text-white text-sm">{t("नया राइडर रजिस्ट्रेशन", "New Rider Registration")}</div>
              <div className="text-white/70 text-[10px]">{t("वाहन सत्यापन · KYC · नि:शुल्क जुड़ें", "Vehicle verification · KYC · Join free")}</div>
            </div>
            <span className="text-white font-bold">→</span>
          </a>

          {/* Login */}
          <a href="https://fleet.digitalrohtak.online/auth/login" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 w-full bg-[#00A650] p-4 rounded-xl hover:bg-[#007A3D] active:scale-95 transition-all">
            <span className="text-2xl">🔐</span>
            <div className="flex-1 text-left">
              <div className="font-extrabold text-white text-sm">{t("राइडर लॉगिन", "Rider Login")}</div>
              <div className="text-white/70 text-[10px]">{t("ऑर्डर देखें · स्थिति अपडेट करें · कमाई देखें", "View orders · Update status · Track earnings")}</div>
            </div>
            <span className="text-white font-bold">→</span>
          </a>

          {/* PWA Rider App */}
          <Link href="/rider"
            className="flex items-center gap-3 w-full bg-[#F47216] p-4 rounded-xl hover:bg-[#E06010] active:scale-95 transition-all">
            <span className="text-2xl">📲</span>
            <div className="flex-1 text-left">
              <div className="font-extrabold text-white text-sm">{t("डिलीवरी ऐप खोलें", "Open Delivery App")}</div>
              <div className="text-white/70 text-[10px]">{t("PWA — बिना इंस्टॉल · सीधे ब्राउज़र से", "PWA — No install · Works in browser")}</div>
            </div>
            <span className="text-white font-bold">→</span>
          </Link>

          {/* What you get */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-extrabold text-gray-700">{t("राइडर को क्या मिलता है:", "What riders get:")}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                ["🗺️", t("लाइव नेविगेशन", "Live Navigation")],
                ["📦", t("ऑर्डर असाइनमेंट", "Order Assignment")],
                ["📍", t("रियल-टाइम ट्रैकिंग", "Real-time Tracking")],
                ["✅", t("डिलीवरी पुष्टि", "Delivery Proof")],
                ["💰", t("सीधे बैंक पेमेंट", "Direct Bank Pay")],
                ["📊", t("कमाई रिपोर्ट", "Earnings Report")],
              ].map(([icon, label]) => (
                <div key={String(label)} className="flex items-center gap-1.5 text-[10px] text-gray-600 font-semibold">
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <Link href="/" className="text-white/80 text-xs hover:text-white">
            ← {t("मुख्य पृष्ठ पर वापस", "Back to Home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
