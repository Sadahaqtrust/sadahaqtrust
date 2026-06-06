"use client";
import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useLang } from "@/lib/lang";
import { MARKETS } from "@/app/components/MarketsGrid";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "";

const GOOGLE_BUSINESS_CATEGORIES = [
  { group: "Food & Beverage", cats: ["Restaurant","Fast Food Restaurant","Cafe","Bakery","Sweet Shop","Juice Bar","Grocery Store","Supermarket","Meat Shop","Dairy Store","Dry Fruits Shop"] },
  { group: "Retail & Shopping", cats: ["Clothing Store","Shoe Store","Jewellery Store","Electronics Store","Mobile Phone Shop","Computer Store","Furniture Store","Hardware Store","Stationery Store","Book Store","Toy Store","Sports Goods Store","Gift Shop","Optical Store","Pharmacy","General Store"] },
  { group: "Health & Beauty", cats: ["Beauty Salon","Hair Salon / Barber Shop","Spa","Gym / Fitness Center","Clinic","Dental Clinic","Eye Care Center","Physiotherapy Center","Ayurvedic Center"] },
  { group: "Automotive", cats: ["Car Dealer","Motorcycle Dealer","Auto Parts Store","Car Repair Shop","Tyre Shop","Car Wash","Petrol Pump"] },
  { group: "Professional Services", cats: ["Lawyer / Legal Services","Chartered Accountant","Tax Consultant","Insurance Agency","Real Estate Agency","Travel Agency","Courier Service","Photography Studio","IT Services"] },
  { group: "Home Services", cats: ["Plumber","Electrician","Carpenter","Painter","AC Repair","Appliance Repair","Pest Control","Cleaning Service","Interior Designer","Architect"] },
  { group: "Agriculture & Wholesale", cats: ["Agricultural Supply Store","Seed Store","Fertilizer Shop","Wholesale Market","Cold Storage","Mandi / Grain Market"] },
  { group: "Other", cats: ["Tailor / Boutique","Laundry / Dry Cleaning","Flower Shop","Pet Shop","Tent House","Other"] },
];

export default function SellerOnboardingPage() {
  const { token } = useAuth();
  const { t } = useLang();
  const [form, setForm] = useState({
    shop_name: "", category: "", market_slug: "",
    gst_number: "", fssai_license: "", pan_number: "",
    shop_address: "", opening_time: "09:00", closing_time: "21:00",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [scId, setScId] = useState("");

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.shop_name.trim()) { setError(t("दुकान का नाम आवश्यक है", "Shop name is required")); return; }
    if (!form.category) { setError(t("श्रेणी चुनें", "Select a category")); return; }
    if (!token) { setError("Not logged in"); return; }

    setLoading(true); setError("");
    const res = await fetch(`${MEDUSA_URL}/store/dr/me/seller-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-publishable-api-key": PK },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Failed"); return; }
    setScId(data.sales_channel_id);
    setDone(true);
  }

  if (done) return (
    <div className="min-h-screen bg-[#F47216] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-extrabold text-[#00A650] mb-2">{t("दुकान रजिस्टर हो गई!", "Shop Registered!")}</h1>
        <p className="text-gray-600 text-sm mb-6">
          <span className="font-bold text-[#F47216]">{form.shop_name}</span> {t("को डिजिटल रोहतक पर रजिस्टर किया गया।", "has been registered on Digital Rohtak.")}
        </p>
        <div className="flex flex-col gap-3">
          <a href="https://api.digitalrohtak.online/app"
            className="block w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold hover:bg-[#F47216] transition-all">
            ⚙️ {t("एडमिन पैनल खोलें", "Open Admin Panel")}
          </a>
          <a href="/auth/account"
            className="block w-full border-2 border-gray-200 text-gray-600 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">
            ← {t("डैशबोर्ड पर जाएं", "Go to Dashboard")}
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F47216] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="text-4xl mb-1">🏪</div>
          <h1 className="text-xl font-extrabold text-white">{t("दुकान पंजीकरण", "Shop Registration")}</h1>
          <p className="text-white/80 text-xs">{t("डिजिटल रोहतक मार्केट प्लेटफॉर्म", "Digital Rohtak Market Platform")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">⚠️ {error}</div>}

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("दुकान का नाम *", "Shop Name *")}</label>
              <input value={form.shop_name} onChange={e => set("shop_name", e.target.value)}
                placeholder={t("जैसे: राम जनरल स्टोर", "e.g. Ram General Store")}
                className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>

            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("व्यवसाय श्रेणी * (Google Business)", "Business Category *")}</label>
              <select value={form.category} onChange={e => set("category", e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2.5 text-sm outline-none bg-white text-gray-900">
                <option value="">{t("— श्रेणी चुनें —", "— Select Category —")}</option>
                {GOOGLE_BUSINESS_CATEGORIES.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.cats.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("बाज़ार (वैकल्पिक)", "Market (optional)")}</label>
              <select value={form.market_slug} onChange={e => set("market_slug", e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2.5 text-sm outline-none bg-white text-gray-900">
                <option value="">{t("— बाज़ार चुनें —", "— Select Market —")}</option>
                {MARKETS.map(m => <option key={m.slug} value={m.slug}>{m.name_en}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("दुकान का पता", "Shop Address")}</label>
              <input value={form.shop_address} onChange={e => set("shop_address", e.target.value)}
                placeholder={t("दुकान नं., गली, कॉलोनी", "Shop No., Street, Colony")}
                className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2.5 text-sm outline-none" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">GST</label>
                <input value={form.gst_number} onChange={e => set("gst_number", e.target.value.toUpperCase())}
                  placeholder="06AABCU..." className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">FSSAI</label>
                <input value={form.fssai_license} onChange={e => set("fssai_license", e.target.value)}
                  placeholder="12345..." className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">PAN</label>
                <input value={form.pan_number} onChange={e => set("pan_number", e.target.value.toUpperCase())}
                  placeholder="AABCU..." className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("खुलने का समय", "Opening Time")}</label>
                <input type="time" value={form.opening_time} onChange={e => set("opening_time", e.target.value)}
                  className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("बंद होने का समय", "Closing Time")}</label>
                <input type="time" value={form.closing_time} onChange={e => set("closing_time", e.target.value)}
                  className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2.5 text-sm outline-none" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-base hover:bg-[#F47216] transition-all disabled:opacity-60 mt-2">
              {loading ? t("रजिस्टर हो रहा है...", "Registering...") : t("दुकान रजिस्टर करें ✓", "Register Shop ✓")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
