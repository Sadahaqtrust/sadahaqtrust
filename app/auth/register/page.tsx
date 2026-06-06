"use client";
import { useState, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useLang } from "@/lib/lang";
import RoleSelector from "@/app/components/RoleSelector";
import Link from "next/link";

type Step = "details" | "roles" | "done";

export default function RegisterPage() {
  const { register, token } = useAuth();
  const { t } = useLang();
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", mobile: "" });
  const [pin, setPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredToken, setRegisteredToken] = useState("");

  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const confirmRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function handlePinInput(val: string, idx: number, arr: string[], setArr: (a: string[]) => void, refs: any[]) {
    if (!/^\d*$/.test(val)) return;
    const updated = [...arr]; updated[idx] = val.slice(-1); setArr(updated);
    if (val && idx < 3) refs[idx + 1].current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const pinStr = pin.join("");
    if (pinStr.length < 4) { setError(t("4-अंकीय PIN डालें", "Enter a 4-digit PIN")); return; }
    if (pinStr !== confirmPin.join("")) { setError(t("PIN मेल नहीं खाता", "PINs do not match")); return; }
    if (!form.email.includes("@")) { setError(t("सही ईमेल डालें", "Enter valid email")); return; }

    setLoading(true);
    const result = await register(form.email, pinStr, form.firstName || form.mobile, form.lastName || "");
    setLoading(false);

    if (result.error) { setError(result.error); return; }
    setRegisteredToken(token || "");
    setStep("roles");
  }

  if (step === "roles") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-4">
            <div className="text-4xl mb-1">🎉</div>
            <h1 className="text-xl font-extrabold text-white">{t("खाता बन गया!", "Account Created!")}</h1>
            <p className="text-white/80 text-sm">{t("अब अपनी भूमिका चुनें", "Now select your role(s)")}</p>
          </div>
          <RoleSelector
            token={registeredToken || token || ""}
            onDone={() => { window.location.href = "/auth/account"; }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-[#F47216] mb-1">{t("नया खाता बनाएं", "Create Account")}</h1>
        <p className="text-gray-500 text-sm mb-6">{t("एक खाता — सभी सेवाएं", "One account for all Digital Rohtak services")}</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("पहला नाम", "First Name")}</label>
              <input type="text" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                placeholder="Rahul" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2.5 text-gray-700 outline-none text-sm" />
            </div>
            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("अंतिम नाम", "Last Name")}</label>
              <input type="text" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                placeholder="Sharma" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2.5 text-gray-700 outline-none text-sm" />
            </div>
          </div>

          <div>
            <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("ईमेल *", "Email *")}</label>
            <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-4 py-2.5 text-gray-700 outline-none text-sm" />
          </div>

          <div>
            <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("मोबाइल (वैकल्पिक)", "Mobile (optional)")}</label>
            <div className="flex items-center border-2 border-gray-200 focus-within:border-[#F47216] rounded-xl overflow-hidden">
              <span className="bg-gray-50 px-3 py-2.5 text-gray-500 text-sm border-r border-gray-200">+91</span>
              <input type="tel" inputMode="numeric" maxLength={10} value={form.mobile}
                onChange={e => setForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, "") }))}
                placeholder="9876543210" className="flex-1 px-3 py-2.5 text-sm outline-none" />
            </div>
          </div>

          <div>
            <label className="text-[#F47216] font-bold text-xs uppercase block mb-2">{t("4-अंकीय PIN *", "4-Digit PIN *")}</label>
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
            <label className="text-[#00A650] font-bold text-xs uppercase block mb-2">{t("PIN की पुष्टि करें *", "Confirm PIN *")}</label>
            <div className="flex gap-3">
              {confirmPin.map((d, i) => (
                <input key={i} ref={confirmRefs[i]} type="password" inputMode="numeric" maxLength={1} value={d}
                  onChange={e => handlePinInput(e.target.value, i, confirmPin, setConfirmPin, confirmRefs)}
                  onKeyDown={e => { if (e.key === "Backspace" && !confirmPin[i] && i > 0) confirmRefs[i-1].current?.focus(); }}
                  className="w-14 h-14 text-center text-2xl font-extrabold border-2 border-gray-200 focus:border-[#00A650] rounded-xl outline-none text-[#00A650]" />
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-lg hover:bg-[#F47216] transition-all disabled:opacity-60 mt-1">
            {loading ? t("बन रहा है...", "Creating...") : t("खाता बनाएं →", "Create Account →")}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          {t("पहले से खाता है?", "Already have an account?")}{" "}
          <Link href="/auth/login" className="text-[#00A650] font-bold hover:text-[#F47216]">{t("साइन इन करें", "Sign in")}</Link>
        </p>
      </div>
    </div>
  );
}
