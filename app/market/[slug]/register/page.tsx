"use client";
import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { MARKETS } from "@/app/components/MarketsGrid";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";

// Google Business Categories — grouped
const GOOGLE_BUSINESS_CATEGORIES: { group: string; categories: string[] }[] = [
  {
    group: "Food & Beverage",
    categories: [
      "Restaurant", "Fast Food Restaurant", "Cafe", "Bakery", "Sweet Shop",
      "Juice Bar", "Ice Cream Shop", "Dhaba", "Caterer", "Food Truck",
      "Grocery Store", "Supermarket", "Convenience Store", "Liquor Store",
      "Meat Shop / Butcher", "Fish Market", "Dairy Store", "Dry Fruits Shop",
    ],
  },
  {
    group: "Retail & Shopping",
    categories: [
      "Clothing Store", "Shoe Store", "Jewellery Store", "Electronics Store",
      "Mobile Phone Shop", "Computer Store", "Furniture Store", "Home Decor Store",
      "Hardware Store", "Stationery Store", "Book Store", "Toy Store",
      "Sports Goods Store", "Gift Shop", "Optical Store", "Watch Store",
      "Cosmetics Store", "Pharmacy / Medical Store", "General Store",
    ],
  },
  {
    group: "Health & Beauty",
    categories: [
      "Beauty Salon", "Hair Salon / Barber Shop", "Spa", "Gym / Fitness Center",
      "Yoga Studio", "Clinic", "Dental Clinic", "Eye Care Center",
      "Physiotherapy Center", "Ayurvedic Center", "Homeopathy Clinic",
      "Nursing Home", "Diagnostic Lab", "Blood Bank",
    ],
  },
  {
    group: "Automotive",
    categories: [
      "Car Dealer", "Motorcycle Dealer", "Auto Parts Store", "Car Repair Shop",
      "Tyre Shop", "Car Wash", "Petrol Pump / Gas Station", "Auto Accessories Store",
      "Electric Vehicle Dealer", "Truck Dealer",
    ],
  },
  {
    group: "Professional Services",
    categories: [
      "Lawyer / Legal Services", "Chartered Accountant", "Tax Consultant",
      "Insurance Agency", "Real Estate Agency", "Travel Agency",
      "Courier Service", "Printing & Copying", "Photography Studio",
      "Advertising Agency", "IT Services", "Web Design",
    ],
  },
  {
    group: "Education",
    categories: [
      "School", "College", "Coaching Center / Tuition", "Computer Training Institute",
      "Driving School", "Music School", "Dance Academy", "Art Classes",
      "Language School", "Vocational Training Center",
    ],
  },
  {
    group: "Home Services",
    categories: [
      "Plumber", "Electrician", "Carpenter", "Painter", "AC Repair",
      "Appliance Repair", "Pest Control", "Cleaning Service",
      "Interior Designer", "Architect", "Construction Company",
    ],
  },
  {
    group: "Finance & Banking",
    categories: [
      "Bank", "ATM", "Money Transfer Service", "Loan Agency",
      "Microfinance", "Investment Advisor", "Mutual Fund Agent",
    ],
  },
  {
    group: "Hospitality & Travel",
    categories: [
      "Hotel", "Guest House", "Lodge", "Hostel", "Banquet Hall",
      "Event Venue", "Tour Operator", "Bus Service", "Taxi Service",
    ],
  },
  {
    group: "Agriculture & Wholesale",
    categories: [
      "Agricultural Supply Store", "Seed Store", "Fertilizer Shop",
      "Farm Equipment Dealer", "Wholesale Market", "Cold Storage",
      "Warehouse", "Mandi / Grain Market",
    ],
  },
  {
    group: "Religious & Community",
    categories: [
      "Temple", "Mosque", "Church", "Gurudwara", "NGO",
      "Community Center", "Library", "Government Office",
    ],
  },
  {
    group: "Other",
    categories: [
      "Tailor / Boutique", "Laundry / Dry Cleaning", "Cobbler / Shoe Repair",
      "Cycle Shop", "Tent House", "Flower Shop", "Nursery / Plant Shop",
      "Pet Shop", "Lottery Shop", "Paan Shop", "Other",
    ],
  },
];

type Step = "details" | "auth" | "done";

export default function ShopRegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLang();
  const router = useRouter();

  const market = MARKETS.find(m => m.slug === slug);

  const [step, setStep] = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const confirmRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const [form, setForm] = useState({
    shop_name: "",
    owner_name: "",
    mobile: "",
    email: "",
    category: "",
    address: "",
    gst_number: "",
    opening_time: "09:00",
    closing_time: "21:00",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function validate() {
    if (!form.shop_name.trim()) return t("दुकान का नाम आवश्यक है", "Shop name is required");
    if (!form.owner_name.trim()) return t("मालिक का नाम आवश्यक है", "Owner name is required");
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return t("सही मोबाइल नंबर डालें", "Enter valid 10-digit mobile");
    if (!form.email.includes("@")) return t("सही ईमेल डालें", "Enter valid email");
    if (!form.category) return t("श्रेणी चुनें", "Select a category");
    if (!form.address.trim()) return t("पता आवश्यक है", "Address is required");
    return "";
  }

  function handlePinInput(
    val: string, idx: number,
    arr: string[], setArr: (a: string[]) => void,
    refs: React.RefObject<HTMLInputElement>[]
  ) {
    if (!/^\d*$/.test(val)) return;
    const updated = [...arr];
    updated[idx] = val.slice(-1);
    setArr(updated);
    if (val && idx < 3) refs[idx + 1].current?.focus();
  }

  async function handleRegister() {
    const pinStr = pin.join("");
    const confirmStr = confirmPin.join("");
    if (pinStr.length < 4) { setError(t("4-अंकीय PIN डालें", "Enter 4-digit PIN")); return; }
    if (pinStr !== confirmStr) { setError(t("PIN मेल नहीं खाता", "PINs do not match")); return; }

    setLoading(true); setError("");
    try {
      // Step 1: Register auth identity
      const authRes = await fetch(`${MEDUSA_URL}/auth/user/emailpass/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: pinStr }),
      });
      const authData = await authRes.json();
      if (!authRes.ok) throw new Error(authData.message || "Registration failed");
      const token = authData.token;

      // Step 2: Create user profile
      const userRes = await fetch(`${MEDUSA_URL}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: form.email,
          first_name: form.owner_name.split(" ")[0],
          last_name: form.owner_name.split(" ").slice(1).join(" ") || "",
        }),
      });
      if (!userRes.ok) { const e = await userRes.json(); throw new Error(e.message || "User creation failed"); }

      // Step 3: Create sales channel (Medusa product catalog framework)
      const scRes = await fetch(`${MEDUSA_URL}/admin/sales-channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.shop_name,
          description: `${form.category} | ${market?.name_en} | ${form.address}, Rohtak`,
          metadata: {
            type: "market_shop",
            market_slug: slug,
            market_name: market?.name_en || "",
            market_area: market?.area || "",
            owner_name: form.owner_name,
            mobile: form.mobile,
            email: form.email,
            category: form.category,
            address: form.address,
            city: "Rohtak",
            state: "Haryana",
            pincode: "124001",
            gst_number: form.gst_number || "",
            opening_time: form.opening_time,
            closing_time: form.closing_time,
            icon: market?.icon || "🏪",
            platform: "digitalrohtak.online",
            registered_at: new Date().toISOString(),
          },
        }),
      });
      if (!scRes.ok) { const e = await scRes.json(); throw new Error(e.message || "Shop registration failed"); }

      setStep("done");
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-[#F47216] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="font-bold text-gray-600">{t("बाज़ार नहीं मिला", "Market not found")}</p>
          <button onClick={() => router.back()} className="mt-4 text-[#F47216] font-bold text-sm">← {t("वापस", "Back")}</button>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#F47216] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-extrabold text-[#00A650] mb-2">{t("रजिस्ट्रेशन सफल!", "Registration Successful!")}</h1>
          <p className="text-gray-600 text-sm mb-2">
            <span className="font-bold text-[#F47216]">{form.shop_name}</span>{" "}
            {t("को", "has been registered in")}{" "}
            <span className="font-bold text-[#F47216]">{market.name_en}</span>{" "}
            {t("में रजिस्टर किया गया।", ".")}
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left text-sm mb-6">
            <p className="text-gray-500 font-semibold mb-2">📋 {t("अगले कदम", "Next Steps")}</p>
            <ol className="text-gray-600 space-y-1 list-decimal list-inside">
              <li>{t("एडमिन पैनल में लॉगिन करें", "Login to admin panel with your email")}</li>
              <li>{t("अपने उत्पाद / सेवाएं जोड़ें", "Add your products or services")}</li>
              <li>{t("ग्राहकों से ऑर्डर लेना शुरू करें", "Start receiving orders from customers")}</li>
            </ol>
          </div>
          <a
            href="https://api.digitalrohtak.online/app"
            className="block w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold hover:bg-[#F47216] transition-all mb-3"
          >
            🔑 {t("एडमिन पैनल खोलें", "Open Admin Panel")}
          </a>
          <button
            onClick={() => router.push(`/market/${slug}`)}
            className="w-full border-2 border-gray-200 text-gray-600 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
          >
            ← {t("बाज़ार पर वापस जाएं", "Back to Market")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F47216] py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-1">{market.icon}</div>
          <h1 className="text-xl font-extrabold text-white">{t("दुकान रजिस्ट्रेशन", "Shop Registration")}</h1>
          <p className="text-white/80 text-xs mt-1">{market.name_en} · {market.area} · Rohtak</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {(["details", "auth"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                step === s ? "bg-white text-[#F47216]"
                : (s === "details" && step === "auth") ? "bg-[#00A650] text-white"
                : "bg-white/30 text-white"
              }`}>
                {s === "details" && step === "auth" ? "✓" : i + 1}
              </div>
              <span className="text-white text-xs font-semibold">
                {s === "details" ? t("विवरण", "Details") : t("PIN सेट करें", "Set PIN")}
              </span>
              {i === 0 && <div className="w-8 h-0.5 bg-white/40" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">⚠️ {error}</div>
          )}

          {/* Step 1: Shop Details */}
          {step === "details" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-extrabold text-[#F47216]">🏪 {t("दुकान की जानकारी", "Shop Details")}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("दुकान का नाम *", "Shop Name *")}</label>
                  <input value={form.shop_name} onChange={e => set("shop_name", e.target.value)}
                    placeholder={t("जैसे: राम जनरल स्टोर", "e.g. Ram General Store")}
                    className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                </div>

                <div>
                  <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("मालिक का नाम *", "Owner Name *")}</label>
                  <input value={form.owner_name} onChange={e => set("owner_name", e.target.value)}
                    placeholder="Ramesh Kumar"
                    className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                </div>

                <div>
                  <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("मोबाइल *", "Mobile *")}</label>
                  <div className="flex items-center border-2 border-gray-200 focus-within:border-[#F47216] rounded-xl overflow-hidden">
                    <span className="bg-gray-50 px-2 py-2 text-gray-500 text-xs border-r border-gray-200">+91</span>
                    <input type="tel" inputMode="numeric" maxLength={10} value={form.mobile}
                      onChange={e => set("mobile", e.target.value.replace(/\D/g, ""))}
                      placeholder="9876543210" className="flex-1 px-2 py-2 text-sm outline-none" />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("ईमेल * (लॉगिन के लिए)", "Email * (used for login)")}</label>
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                    placeholder="shop@example.com"
                    className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                </div>

                {/* Google Business Category dropdown */}
                <div className="sm:col-span-2">
                  <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("व्यवसाय श्रेणी * (Google Business)", "Business Category * (Google Business)")}</label>
                  <select
                    value={form.category}
                    onChange={e => set("category", e.target.value)}
                    className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none bg-white text-gray-900"
                  >
                    <option value="">{t("— श्रेणी चुनें —", "— Select Category —")}</option>
                    {GOOGLE_BUSINESS_CATEGORIES.map(group => (
                      <optgroup key={group.group} label={group.group}>
                        {group.categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("दुकान का पता *", "Shop Address *")}</label>
                  <input value={form.address} onChange={e => set("address", e.target.value)}
                    placeholder={t("दुकान नं., गली, कॉलोनी", "Shop No., Street, Colony")}
                    className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                </div>

                <div>
                  <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("GST नंबर (वैकल्पिक)", "GST Number (optional)")}</label>
                  <input value={form.gst_number} onChange={e => set("gst_number", e.target.value.toUpperCase())}
                    placeholder="06AABCU9603R1ZX"
                    className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                </div>

                <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("खुलने का समय", "Opening Time")}</label>
                    <input type="time" value={form.opening_time} onChange={e => set("opening_time", e.target.value)}
                      className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("बंद होने का समय", "Closing Time")}</label>
                    <input type="time" value={form.closing_time} onChange={e => set("closing_time", e.target.value)}
                      className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => { const err = validate(); if (err) { setError(err); return; } setError(""); setStep("auth"); }}
                className="w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-base hover:bg-[#F47216] transition-all mt-2"
              >
                {t("आगे बढ़ें →", "Continue →")}
              </button>
            </div>
          )}

          {/* Step 2: Set PIN */}
          {step === "auth" && (
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-extrabold text-[#F47216]">🔐 {t("लॉगिन PIN सेट करें", "Set Login PIN")}</h2>
              <p className="text-gray-500 text-sm">{t("यह PIN एडमिन पैनल में लॉगिन के लिए उपयोग होगा।", "You will use this PIN to login to the admin panel.")}</p>
              <p className="text-[#F47216] font-semibold text-sm">📧 {form.email}</p>

              <div>
                <label className="text-[#F47216] font-bold text-xs uppercase block mb-2">{t("4-अंकीय PIN", "4-Digit PIN")}</label>
                <div className="flex gap-3">
                  {pin.map((d, i) => (
                    <input key={i} ref={pinRefs[i]} type="password" inputMode="numeric" maxLength={1} value={d}
                      onChange={e => handlePinInput(e.target.value, i, pin, setPin, pinRefs)}
                      onKeyDown={e => { if (e.key === "Backspace" && !pin[i] && i > 0) pinRefs[i - 1].current?.focus(); }}
                      className="w-14 h-14 text-center text-2xl font-extrabold border-2 border-gray-200 focus:border-[#F47216] rounded-xl outline-none text-[#F47216]" />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[#00A650] font-bold text-xs uppercase block mb-2">{t("PIN की पुष्टि करें", "Confirm PIN")}</label>
                <div className="flex gap-3">
                  {confirmPin.map((d, i) => (
                    <input key={i} ref={confirmRefs[i]} type="password" inputMode="numeric" maxLength={1} value={d}
                      onChange={e => handlePinInput(e.target.value, i, confirmPin, setConfirmPin, confirmRefs)}
                      onKeyDown={e => { if (e.key === "Backspace" && !confirmPin[i] && i > 0) confirmRefs[i - 1].current?.focus(); }}
                      className="w-14 h-14 text-center text-2xl font-extrabold border-2 border-gray-200 focus:border-[#00A650] rounded-xl outline-none text-[#00A650]" />
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setStep("details"); setError(""); }}
                  className="flex-1 border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all">
                  ← {t("वापस", "Back")}
                </button>
                <button onClick={handleRegister} disabled={loading}
                  className="flex-1 bg-[#00A650] text-white py-3 rounded-xl font-extrabold hover:bg-[#F47216] transition-all disabled:opacity-60">
                  {loading ? t("रजिस्टर हो रहा है...", "Registering...") : t("रजिस्टर करें ✓", "Register ✓")}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-white/60 text-xs mt-4">
          {t("पहले से रजिस्टर्ड हैं?", "Already registered?")}{" "}
          <a href="https://api.digitalrohtak.online/app" className="text-white font-bold underline">
            {t("एडमिन पैनल खोलें", "Open Admin Panel")}
          </a>
        </p>
      </div>
    </div>
  );
}
