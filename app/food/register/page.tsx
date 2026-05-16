"use client";
import { useState, useRef } from "react";
import { useLang } from "@/lib/lang";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";

type Step = "details" | "auth" | "done";

const CUISINE_TYPES = [
  "North Indian", "South Indian", "Chinese", "Fast Food", "Bakery & Sweets",
  "Beverages & Juice", "Biryani", "Street Food", "Multi-Cuisine", "Other",
];

export default function RestaurantRegisterPage() {
  const { t } = useLang();
  const [step, setStep] = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const confirmRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const [form, setForm] = useState({
    restaurant_name: "",
    owner_name: "",
    mobile: "",
    email: "",
    fssai_license: "",
    gst_number: "",
    pan_number: "",
    address: "",
    city: "Rohtak",
    state: "Haryana",
    pincode: "124001",
    cuisine_type: "",
    veg_nonveg: "Both",
    opening_time: "09:00",
    closing_time: "22:00",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function validateDetails() {
    if (!form.restaurant_name.trim()) return t("रेस्तरां का नाम आवश्यक है", "Restaurant name is required");
    if (!form.owner_name.trim()) return t("मालिक का नाम आवश्यक है", "Owner name is required");
    if (!/^[6-9]\d{9}$/.test(form.mobile)) return t("सही मोबाइल नंबर डालें", "Enter valid 10-digit mobile");
    if (!form.email.includes("@")) return t("सही ईमेल डालें", "Enter valid email");
    if (!form.fssai_license.trim()) return t("FSSAI लाइसेंस नंबर आवश्यक है", "FSSAI license number is required");
    if (!form.address.trim()) return t("पता आवश्यक है", "Address is required");
    if (!form.cuisine_type) return t("भोजन प्रकार चुनें", "Select cuisine type");
    return "";
  }

  function handlePinInput(val: string, idx: number, arr: string[], setArr: (a: string[]) => void, refs: React.RefObject<HTMLInputElement>[]) {
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
      // Step 1: Register admin auth identity
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
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          email: form.email,
          first_name: form.owner_name.split(" ")[0],
          last_name: form.owner_name.split(" ").slice(1).join(" ") || "",
        }),
      });
      if (!userRes.ok) {
        const e = await userRes.json();
        throw new Error(e.message || "User profile creation failed");
      }

      // Step 3: Create sales channel for this restaurant
      const scRes = await fetch(`${MEDUSA_URL}/admin/sales-channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          name: form.restaurant_name,
          description: `${form.cuisine_type} | ${form.veg_nonveg} | ${form.address}, ${form.city}`,
          metadata: {
            owner_name: form.owner_name,
            mobile: form.mobile,
            email: form.email,
            fssai_license: form.fssai_license,
            gst_number: form.gst_number || "",
            pan_number: form.pan_number || "",
            address: form.address,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
            cuisine_type: form.cuisine_type,
            veg_nonveg: form.veg_nonveg,
            opening_time: form.opening_time,
            closing_time: form.closing_time,
            is_open: true,
            platform: "food.digitalrohtak.online",
            google_business_category: "Food & Beverage > Restaurant",
            registered_at: new Date().toISOString(),
          },
        }),
      });
      if (!scRes.ok) {
        const e = await scRes.json();
        throw new Error(e.message || "Sales channel creation failed");
      }

      setStep("done");
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#F47216] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-extrabold text-[#00A650] mb-2">{t("रजिस्ट्रेशन सफल!", "Registration Successful!")}</h1>
          <p className="text-gray-600 text-sm mb-4">
            <span className="font-bold text-[#F47216]">{form.restaurant_name}</span> {t("को डिजिटल रोहतक फूड प्लेटफॉर्म पर रजिस्टर किया गया है।", "has been registered on Digital Rohtak Food Platform.")}
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left text-sm mb-6">
            <p className="text-gray-500 font-semibold mb-2">📋 {t("अगले कदम", "Next Steps")}</p>
            <ol className="text-gray-600 space-y-1 list-decimal list-inside">
              <li>{t("अपने ईमेल से एडमिन पैनल में लॉगिन करें", "Login to admin panel with your email")}</li>
              <li>{t("मेनू आइटम जोड़ें या CSV से इम्पोर्ट करें", "Add menu items or import via CSV")}</li>
              <li>{t("ऑर्डर स्वीकार करना शुरू करें", "Start accepting orders")}</li>
            </ol>
          </div>
          <a href="https://api.digitalrohtak.online/app"
            className="block w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold hover:bg-[#F47216] transition-all">
            🔑 {t("एडमिन पैनल खोलें", "Open Admin Panel")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F47216] py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🍽️</div>
          <h1 className="text-2xl font-extrabold text-white">{t("रेस्तरां रजिस्ट्रेशन", "Restaurant Registration")}</h1>
          <p className="text-white/80 text-sm">{t("डिजिटल रोहतक फूड प्लेटफॉर्म", "Digital Rohtak Food Platform")}</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {["details", "auth"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${step === s ? "bg-white text-[#F47216]" : (s === "details" && step === "auth") ? "bg-[#00A650] text-white" : "bg-white/30 text-white"}`}>
                {(s === "details" && step === "auth") ? "✓" : i + 1}
              </div>
              <span className="text-white text-xs font-semibold">{s === "details" ? t("विवरण", "Details") : t("PIN सेट करें", "Set PIN")}</span>
              {i === 0 && <div className="w-8 h-0.5 bg-white/40"></div>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">

          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">⚠️ {error}</div>}

          {/* Step 1: Restaurant Details */}
          {step === "details" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-extrabold text-[#F47216]">🏪 {t("रेस्तरां की जानकारी", "Restaurant Details")}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("रेस्तरां का नाम *", "Restaurant Name *")}</label>
                  <input value={form.restaurant_name} onChange={e => set("restaurant_name", e.target.value)}
                    placeholder="Maa-Ki-Rasoi" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("मालिक का नाम *", "Owner Name *")}</label>
                  <input value={form.owner_name} onChange={e => set("owner_name", e.target.value)}
                    placeholder="Ramesh Kumar" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
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
                    placeholder="restaurant@example.com" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-[#00A650] font-bold text-sm mb-3">📋 {t("लाइसेंस विवरण", "License Details")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("FSSAI लाइसेंस नं. *", "FSSAI License No. *")}</label>
                    <input value={form.fssai_license} onChange={e => set("fssai_license", e.target.value)}
                      placeholder="12345678901234" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("GST नंबर", "GST Number")}</label>
                    <input value={form.gst_number} onChange={e => set("gst_number", e.target.value.toUpperCase())}
                      placeholder="06AABCU9603R1ZX" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("PAN नंबर", "PAN Number")}</label>
                    <input value={form.pan_number} onChange={e => set("pan_number", e.target.value.toUpperCase())}
                      placeholder="AABCU9603R" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-[#00A650] font-bold text-sm mb-3">📍 {t("पता", "Address")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("पूरा पता *", "Full Address *")}</label>
                    <input value={form.address} onChange={e => set("address", e.target.value)}
                      placeholder="Shop No, Street, Colony" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("शहर", "City")}</label>
                    <input value={form.city} onChange={e => set("city", e.target.value)}
                      className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("पिनकोड", "Pincode")}</label>
                    <input value={form.pincode} onChange={e => set("pincode", e.target.value)}
                      className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-[#00A650] font-bold text-sm mb-3">🍛 {t("रेस्तरां सेटिंग", "Restaurant Settings")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("भोजन प्रकार *", "Cuisine Type *")}</label>
                    <select value={form.cuisine_type} onChange={e => set("cuisine_type", e.target.value)}
                      className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none bg-white text-gray-900">
                      <option value="">{t("— चुनें —", "— Select —")}</option>
                      {CUISINE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("शाकाहारी / मांसाहारी", "Veg / Non-Veg")}</label>
                    <select value={form.veg_nonveg} onChange={e => set("veg_nonveg", e.target.value)}
                      className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none bg-white text-gray-900">
                      <option value="Veg">🟢 {t("शाकाहारी", "Veg Only")}</option>
                      <option value="Non-Veg">🔴 {t("मांसाहारी", "Non-Veg")}</option>
                      <option value="Both">🟢🔴 {t("दोनों", "Both")}</option>
                    </select>
                  </div>
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

              <button onClick={() => {
                const err = validateDetails();
                if (err) { setError(err); return; }
                setError(""); setStep("auth");
              }} className="w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-base hover:bg-[#F47216] transition-all mt-2">
                {t("आगे बढ़ें →", "Continue →")}
              </button>
            </div>
          )}

          {/* Step 2: Set PIN */}
          {step === "auth" && (
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-extrabold text-[#F47216]">🔐 {t("लॉगिन PIN सेट करें", "Set Login PIN")}</h2>
              <p className="text-gray-500 text-sm">{t("यह PIN आप एडमिन पैनल में लॉगिन के लिए उपयोग करेंगे।", "You will use this PIN to login to the admin panel.")}</p>
              <p className="text-[#F47216] font-semibold text-sm">📧 {form.email}</p>

              <div>
                <label className="text-[#F47216] font-bold text-xs uppercase block mb-2">{t("4-अंकीय PIN", "4-Digit PIN")}</label>
                <div className="flex gap-3">
                  {pin.map((d, i) => (
                    <input key={i} ref={pinRefs[i]} type="password" inputMode="numeric" maxLength={1} value={d}
                      onChange={e => handlePinInput(e.target.value, i, pin, setPin, pinRefs)}
                      onKeyDown={e => { if (e.key === "Backspace" && !pin[i] && i > 0) pinRefs[i-1].current?.focus(); }}
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
                      onKeyDown={e => { if (e.key === "Backspace" && !confirmPin[i] && i > 0) confirmRefs[i-1].current?.focus(); }}
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
          {t("पहले से रजिस्टर्ड हैं?", "Already registered?")}
          {" "}<a href="https://api.digitalrohtak.online/app" className="text-white font-bold underline">{t("एडमिन पैनल खोलें", "Open Admin Panel")}</a>
        </p>
      </div>
    </div>
  );
}
