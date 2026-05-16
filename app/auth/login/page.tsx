"use client";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useLang } from "@/lib/lang";
import Link from "next/link";

type Step = "mobile" | "pin" | "email" | "otp" | "newpin";

export default function LoginPage() {
  const { loginWithMobile, registerWithMobile, customer } = useAuth();
  const { t } = useLang();
  const [from, setFrom] = useState("/");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [step, setStep] = useState<Step>("mobile");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const confirmRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("from");
    if (f) setFrom(decodeURIComponent(f));
  }, []);

  useEffect(() => {
    if (customer) window.location.href = from;
  }, [customer, from]);

  function handleDigitInput(val: string, idx: number, arr: string[], setArr: (a: string[]) => void, refs: React.RefObject<HTMLInputElement>[]) {
    if (!/^\d*$/.test(val)) return;
    const updated = [...arr];
    updated[idx] = val.slice(-1);
    setArr(updated);
    if (val && idx < refs.length - 1) refs[idx + 1].current?.focus();
  }

  function handleDigitKey(e: React.KeyboardEvent, idx: number, arr: string[], refs: React.RefObject<HTMLInputElement>[]) {
    if (e.key === "Backspace" && !arr[idx] && idx > 0) refs[idx - 1].current?.focus();
  }

  // Step 1: validate mobile, try login
  async function handleMobileContinue() {
    const m = mobile.replace(/^\+?91/, "").trim();
    if (!/^[6-9]\d{9}$/.test(m)) {
      setError(t("सही भारतीय मोबाइल नंबर डालें (10 अंक, 6-9 से शुरू)", "Enter valid Indian mobile (10 digits, starts with 6-9)"));
      return;
    }
    setMobile(m);
    setError("");
    setStep("pin");
    setTimeout(() => pinRefs[0].current?.focus(), 100);
  }

  // Step 2: try login with PIN
  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pinStr = pin.join("");
    if (pinStr.length < 4) { setError(t("4-अंकीय PIN डालें", "Enter 4-digit PIN")); return; }
    setLoading(true); setError("");
    const result = await loginWithMobile(mobile, pinStr);
    setLoading(false);
    if (!result.error) { window.location.href = from; return; }
    // Not registered — move to email verification
    if (result.error.toLowerCase().includes("invalid") || result.error.toLowerCase().includes("incorrect")) {
      setInfo(t(
        "आप पंजीकृत नहीं हैं। पंजीकरण के लिए अपना ईमेल दर्ज करें — OTP भेजा जाएगा।",
        "You are not registered. Enter your email to verify identity — an OTP will be sent."
      ));
      setStep("email");
      return;
    }
    setError(result.error);
  }

  // Step 3: send OTP to email
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) { setError(t("सही ईमेल डालें", "Enter valid email")); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) { setError(t("OTP भेजने में विफल", "Failed to send OTP")); return; }
    setInfo(t(`OTP भेजा गया: ${email}`, `OTP sent to: ${email}`));
    setStep("otp");
    setTimeout(() => otpRefs[0].current?.focus(), 100);
  }

  // Step 4: verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const otpStr = otp.join("");
    if (otpStr.length < 6) { setError(t("6-अंकीय OTP डालें", "Enter 6-digit OTP")); return; }
    setLoading(true); setError("");
    const res = await fetch(`/api/auth/verify-email?email=${encodeURIComponent(email)}&otp=${otpStr}`);
    const data = await res.json();
    setLoading(false);
    if (!data.valid) { setError(data.error || t("गलत OTP", "Incorrect OTP")); return; }
    setInfo(t("ईमेल सत्यापित! अब 4-अंकीय PIN सेट करें।", "Email verified! Now set your 4-digit PIN."));
    setStep("newpin");
    setTimeout(() => pinRefs[0].current?.focus(), 100);
  }

  // Step 5: register with new PIN
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const pinStr = pin.join("");
    const confirmStr = confirmPin.join("");
    if (pinStr.length < 4) { setError(t("4-अंकीय PIN डालें", "Enter 4-digit PIN")); return; }
    if (pinStr !== confirmStr) { setError(t("PIN मेल नहीं खाता", "PINs do not match")); return; }
    setLoading(true); setError("");
    const result = await registerWithMobile(mobile, pinStr);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    window.location.href = from;
  }

  function openEmailApp() {
    const domain = email.split("@")[1]?.toLowerCase() || "";
    if (domain.includes("gmail")) window.open("https://mail.google.com/mail/u/0/#inbox", "_blank");
    else if (domain.includes("outlook") || domain.includes("hotmail")) window.open("https://outlook.live.com/mail/0/inbox", "_blank");
    else if (domain.includes("yahoo")) window.open("https://mail.yahoo.com/d/folders/1", "_blank");
    else window.open("https://mail.google.com/mail/u/0/#inbox", "_blank");
  }

  const stepTitles: Record<Step, string> = {
    mobile: t("साइन इन", "Sign In"),
    pin: t("PIN डालें", "Enter PIN"),
    email: t("ईमेल सत्यापन", "Email Verification"),
    otp: t("OTP डालें", "Enter OTP"),
    newpin: t("PIN सेट करें", "Set PIN"),
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-[#F47216] mb-1">{stepTitles[step]}</h1>
        <p className="text-gray-500 text-sm mb-6">{t("डिजिटल रोहतक — साद्दा हक़", "Digital Rohtak — Sadahaq")}</p>

        {info && <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 mb-4 text-sm">{info}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>}

        {/* Step 1: Mobile */}
        {step === "mobile" && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("मोबाइल नंबर", "Mobile Number")}</label>
              <div className="flex items-center border-2 border-gray-200 focus-within:border-[#F47216] rounded-xl overflow-hidden">
                <span className="bg-gray-50 px-3 py-3 text-gray-500 font-semibold text-sm border-r border-gray-200">+91</span>
                <input type="tel" inputMode="numeric" maxLength={10} value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && handleMobileContinue()}
                  placeholder="9876543210"
                  className="flex-1 px-3 py-3 text-gray-700 text-sm outline-none" autoFocus />
              </div>
            </div>
            <button onClick={handleMobileContinue}
              className="bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-lg hover:bg-[#F47216] transition-all">
              {t("जारी रखें →", "Continue →")}
            </button>
          </div>
        )}

        {/* Step 2: PIN login */}
        {step === "pin" && (
          <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
            <p className="text-gray-600 text-sm">+91 {mobile}
              <button type="button" onClick={() => { setStep("mobile"); setPin(["","","",""]); setError(""); setInfo(""); }}
                className="text-[#F47216] font-bold ml-2 underline text-xs">{t("बदलें", "Change")}</button>
            </p>
            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-2">{t("4-अंकीय PIN", "4-Digit PIN")}</label>
              <div className="flex gap-3">
                {pin.map((d, i) => (
                  <input key={i} ref={pinRefs[i]} type="password" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleDigitInput(e.target.value, i, pin, setPin, pinRefs)}
                    onKeyDown={e => handleDigitKey(e, i, pin, pinRefs)}
                    className="w-14 h-14 text-center text-2xl font-extrabold border-2 border-gray-200 focus:border-[#F47216] rounded-xl outline-none text-[#F47216]" />
                ))}
              </div>
              <div className="text-right mt-1">
                <Link href="/auth/forgot-pin" className="text-[#00A650] text-xs hover:text-[#F47216] font-semibold">{t("PIN भूल गए?", "Forgot PIN?")}</Link>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-lg hover:bg-[#F47216] transition-all disabled:opacity-60">
              {loading ? t("जाँच रहे हैं...", "Verifying...") : t("साइन इन →", "Sign In →")}
            </button>
          </form>
        )}

        {/* Step 3: Email for OTP */}
        {step === "email" && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("ईमेल पता", "Email Address")}</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-4 py-3 text-gray-700 outline-none" autoFocus />
              <p className="text-amber-600 text-xs mt-2">
                ⚠️ {t("किसी और का मोबाइल नंबर उनकी सहमति के बिना उपयोग करना अवैध है।",
                  "Using someone else's mobile number without their consent is illegal.")}
              </p>
            </div>
            <button type="submit" disabled={loading}
              className="bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-lg hover:bg-[#F47216] transition-all disabled:opacity-60">
              {loading ? t("भेज रहे हैं...", "Sending...") : t("OTP भेजें →", "Send OTP →")}
            </button>
          </form>
        )}

        {/* Step 4: OTP verification */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <p className="text-gray-600 text-sm">{t("OTP भेजा गया:", "OTP sent to:")} <span className="font-bold text-[#F47216]">{email}</span></p>
            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-2">{t("6-अंकीय OTP", "6-Digit OTP")}</label>
              <div className="flex gap-2 justify-center">
                {otp.map((d, i) => (
                  <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleDigitInput(e.target.value, i, otp, setOtp, otpRefs)}
                    onKeyDown={e => handleDigitKey(e, i, otp, otpRefs)}
                    className="w-12 h-12 text-center text-xl font-extrabold border-2 border-gray-200 focus:border-[#F47216] rounded-xl outline-none text-[#F47216]" />
                ))}
              </div>
            </div>
            <button type="button" onClick={openEmailApp}
              className="bg-gray-100 text-gray-600 py-2 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all">
              📬 {t("ईमेल खोलें", "Open Email App")}
            </button>
            <button type="submit" disabled={loading}
              className="bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-lg hover:bg-[#F47216] transition-all disabled:opacity-60">
              {loading ? t("सत्यापित हो रहा है...", "Verifying...") : t("OTP सत्यापित करें →", "Verify OTP →")}
            </button>
            <button type="button" onClick={() => { setStep("email"); setOtp(["","","","","",""]); setError(""); }}
              className="text-gray-400 text-sm hover:text-gray-600">{t("दोबारा भेजें", "Resend OTP")}</button>
          </form>
        )}

        {/* Step 5: Set new PIN */}
        {step === "newpin" && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-2">{t("नया PIN सेट करें", "Set new PIN")}</label>
              <div className="flex gap-3">
                {pin.map((d, i) => (
                  <input key={i} ref={pinRefs[i]} type="password" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleDigitInput(e.target.value, i, pin, setPin, pinRefs)}
                    onKeyDown={e => handleDigitKey(e, i, pin, pinRefs)}
                    className="w-14 h-14 text-center text-2xl font-extrabold border-2 border-gray-200 focus:border-[#F47216] rounded-xl outline-none text-[#F47216]" />
                ))}
              </div>
            </div>
            <div>
              <label className="text-[#00A650] font-bold text-xs uppercase block mb-2">{t("PIN की पुष्टि करें", "Confirm PIN")}</label>
              <div className="flex gap-3">
                {confirmPin.map((d, i) => (
                  <input key={i} ref={confirmRefs[i]} type="password" inputMode="numeric" maxLength={1} value={d}
                    onChange={e => handleDigitInput(e.target.value, i, confirmPin, setConfirmPin, confirmRefs)}
                    onKeyDown={e => handleDigitKey(e, i, confirmPin, confirmRefs)}
                    className="w-14 h-14 text-center text-2xl font-extrabold border-2 border-gray-200 focus:border-[#00A650] rounded-xl outline-none text-[#00A650]" />
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-lg hover:bg-[#F47216] transition-all disabled:opacity-60">
              {loading ? t("रजिस्टर हो रहा है...", "Registering...") : t("रजिस्टर करें →", "Register →")}
            </button>
          </form>
        )}

        <p className="text-center text-gray-400 text-xs mt-6">
          {t("डिजिटल रोहतक — साद्दा हक़ इंटरनेशनल", "Digital Rohtak — Sadahaq International")}
        </p>
      </div>
    </div>
  );
}
