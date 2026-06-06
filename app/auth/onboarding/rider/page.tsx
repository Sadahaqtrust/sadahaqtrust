"use client";
import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useLang } from "@/lib/lang";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "";

const ZONES = ["Sector 1-7","Sector 8-14","Sector 15-21","Sector 22-28","Old City / Railway Road","Model Town","IMT Rohtak","Delhi Road","Sonipat Road","Jind Road"];
const VEHICLES = ["Bicycle","Motorcycle","Scooter","Electric Scooter","Auto Rickshaw","Mini Truck"];

export default function RiderOnboardingPage() {
  const { token } = useAuth();
  const { t } = useLang();
  const [form, setForm] = useState({ vehicle_type: "", vehicle_number: "", license_number: "", zone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicle_type) { setError(t("वाहन प्रकार चुनें", "Select vehicle type")); return; }
    if (!token) { setError("Not logged in"); return; }
    setLoading(true); setError("");
    const res = await fetch(`${MEDUSA_URL}/store/dr/me/rider-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-publishable-api-key": PK },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Failed"); return; }
    setDone(true);
  }

  if (done) return (
    <div className="min-h-screen bg-[#00A650] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="text-6xl mb-4">🛵</div>
        <h1 className="text-2xl font-extrabold text-[#00A650] mb-2">{t("राइडर रजिस्ट्रेशन सफल!", "Rider Registered!")}</h1>
        <p className="text-gray-600 text-sm mb-6">{t("आपका आवेदन समीक्षा में है। सत्यापन के बाद आप डिलीवरी शुरू कर सकते हैं।", "Your application is under review. You can start delivering after verification.")}</p>
        <a href="/auth/account" className="block w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold hover:bg-[#F47216] transition-all">
          ← {t("डैशबोर्ड पर जाएं", "Go to Dashboard")}
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#00A650] py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-4xl mb-1">🛵</div>
          <h1 className="text-xl font-extrabold text-white">{t("राइडर पंजीकरण", "Rider Registration")}</h1>
          <p className="text-white/80 text-xs">{t("डिजिटल रोहतक डिलीवरी नेटवर्क", "Digital Rohtak Delivery Network")}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">⚠️ {error}</div>}
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="text-[#00A650] font-bold text-xs uppercase block mb-1">{t("वाहन प्रकार *", "Vehicle Type *")}</label>
              <select value={form.vehicle_type} onChange={e => set("vehicle_type", e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-[#00A650] rounded-xl px-3 py-2.5 text-sm outline-none bg-white">
                <option value="">{t("— चुनें —", "— Select —")}</option>
                {VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[#00A650] font-bold text-xs uppercase block mb-1">{t("वाहन नंबर", "Vehicle Number")}</label>
              <input value={form.vehicle_number} onChange={e => set("vehicle_number", e.target.value.toUpperCase())}
                placeholder="HR12AB1234" className="w-full border-2 border-gray-200 focus:border-[#00A650] rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[#00A650] font-bold text-xs uppercase block mb-1">{t("ड्राइविंग लाइसेंस", "Driving License")}</label>
              <input value={form.license_number} onChange={e => set("license_number", e.target.value.toUpperCase())}
                placeholder="HR0120XXXXXXXX" className="w-full border-2 border-gray-200 focus:border-[#00A650] rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[#00A650] font-bold text-xs uppercase block mb-1">{t("डिलीवरी ज़ोन", "Delivery Zone")}</label>
              <select value={form.zone} onChange={e => set("zone", e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-[#00A650] rounded-xl px-3 py-2.5 text-sm outline-none bg-white">
                <option value="">{t("— ज़ोन चुनें —", "— Select Zone —")}</option>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-base hover:bg-[#F47216] transition-all disabled:opacity-60 mt-2">
              {loading ? t("रजिस्टर हो रहा है...", "Registering...") : t("राइडर बनें ✓", "Become a Rider ✓")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
