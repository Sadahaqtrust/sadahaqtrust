"use client";
import { useState, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useLang } from "@/lib/lang";

interface Props {
  onSuccess: () => void;
}

export default function MobileAuthModal({ onSuccess }: Props) {
  const { loginWithMobile, registerWithMobile } = useAuth();
  const { t } = useLang();
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [step, setStep] = useState<"mobile" | "pin">("mobile");
  const [isNew, setIsNew] = useState(false);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const confirmRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function log(msg: string) {
    const ts = new Date().toISOString().slice(11, 23);
    setLogs(prev => [`[${ts}] [AUTH] ${msg}`, ...prev].slice(0, 20));
    console.log(`[AUTH] ${msg}`);
  }

  function validateMobile(m: string) {
    return /^[6-9]\d{9}$/.test(m);
  }

  async function handleMobileContinue() {
    const m = mobile.replace(/^\+?91/, "").trim();
    if (!validateMobile(m)) {
      setError(t("सही भारतीय मोबाइल नंबर डालें (10 अंक, 6-9 से शुरू)", "Enter valid Indian mobile (10 digits, starts with 6-9)"));
      log(`Mobile validation FAILED: "${m}"`);
      return;
    }
    log(`Mobile valid: ${m} — moving to PIN step`);
    setError("");
    setMobile(m);
    setStep("pin");
    setTimeout(() => pinRefs[0].current?.focus(), 100);
  }

  function handlePinInput(val: string, idx: number, arr: string[], setArr: (a: string[]) => void, refs: React.RefObject<HTMLInputElement>[]) {
    if (!/^\d*$/.test(val)) return;
    const updated = [...arr];
    updated[idx] = val.slice(-1);
    setArr(updated);
    if (val && idx < 3) refs[idx + 1].current?.focus();
  }

  function handlePinKey(e: React.KeyboardEvent, idx: number, refs: React.RefObject<HTMLInputElement>[]) {
    if (e.key === "Backspace" && !pin[idx] && idx > 0) refs[idx - 1].current?.focus();
  }

  async function handlePinContinue() {
    const pinStr = pin.join("");
    if (pinStr.length < 4) { setError(t("4-अंकीय PIN डालें", "Enter 4-digit PIN")); return; }

    if (isNew) {
      const confirmStr = confirmPin.join("");
      if (confirmStr.length < 4) { setError(t("PIN की पुष्टि करें", "Confirm your PIN")); return; }
      if (pinStr !== confirmStr) { setError(t("PIN मेल नहीं खाता", "PINs do not match")); return; }
    }

    setLoading(true);
    setError("");

    if (isNew) {
      log(`Registering new user: +91${mobile}`);
      const result = await registerWithMobile(mobile, pinStr);
      setLoading(false);
      if (result.error) { log(`Register FAILED: ${result.error}`); setError(result.error); return; }
      log(`Register SUCCESS`);
    } else {
      log(`Logging in: +91${mobile}`);
      const result = await loginWithMobile(mobile, pinStr);
      setLoading(false);
      if (result.error) {
        log(`Login FAILED: ${result.error} — switching to new user flow`);
        if (result.error.toLowerCase().includes("invalid") || result.error.toLowerCase().includes("not found") || result.error.toLowerCase().includes("incorrect")) {
          setIsNew(true);
          setPin(["", "", "", ""]);
          setError(t("नया खाता बनाएं — PIN सेट करें", "New account — set your PIN"));
          setTimeout(() => pinRefs[0].current?.focus(), 100);
          return;
        }
        setError(result.error);
        return;
      }
      log(`Login SUCCESS`);
    }
    log(`Auth complete — calling onSuccess`);
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">

        {/* AUTH DEBUG PANEL */}
        {logs.length > 0 && (
          <div className="bg-black/90 text-green-400 font-mono text-xs p-2 rounded-xl mb-3 max-h-24 overflow-y-auto">
            <div className="flex justify-between items-center mb-1">
              <span className="text-green-300 font-bold">🔐 AUTH MODAL — DEBUG</span>
              <button onClick={() => setLogs([])} className="text-red-400 text-xs">✕</button>
            </div>
            {logs.map((l, i) => <div key={i} className="leading-4">{l}</div>)}
          </div>
        )}

        <div className="text-center mb-5">
          <div className="text-4xl mb-2">📱</div>
          <h2 className="text-xl font-extrabold text-[#F47216]">
            {t("जारी रखने के लिए साइन इन करें", "Sign in to continue")}
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            {t("डिजिटल रोहतक — साद्दा हक़", "Digital Rohtak — Sadahaq")}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2 mb-4 text-xs">
            {error}
          </div>
        )}

        {step === "mobile" && (
          <>
            <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">
              {t("मोबाइल नंबर", "Mobile Number")}
            </label>
            <div className="flex items-center border-2 border-gray-200 focus-within:border-[#F47216] rounded-xl overflow-hidden mb-4">
              <span className="bg-gray-50 px-3 py-3 text-gray-500 font-semibold text-sm border-r border-gray-200">+91</span>
              <input
                type="tel" inputMode="numeric" maxLength={10}
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && handleMobileContinue()}
                placeholder="9876543210"
                className="flex-1 px-3 py-3 text-gray-700 text-sm outline-none"
                autoFocus
              />
            </div>
            <button onClick={handleMobileContinue}
              className="w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-base hover:bg-[#F47216] transition-all">
              {t("जारी रखें →", "Continue →")}
            </button>
          </>
        )}

        {step === "pin" && (
          <>
            <p className="text-gray-600 text-xs mb-4 text-center">
              +91 {mobile}
              <button onClick={() => { setStep("mobile"); setPin(["","","",""]); setConfirmPin(["","","",""]); setIsNew(false); setError(""); }}
                className="text-[#F47216] font-bold ml-2 underline text-xs">
                {t("बदलें", "Change")}
              </button>
            </p>

            <label className="text-[#F47216] font-bold text-xs uppercase block mb-2">
              {isNew ? t("नया PIN सेट करें", "Set new PIN") : t("4-अंकीय PIN", "4-Digit PIN")}
            </label>
            <div className="flex gap-3 justify-center mb-4">
              {pin.map((d, i) => (
                <input key={i} ref={pinRefs[i]} type="password" inputMode="numeric"
                  maxLength={1} value={d}
                  onChange={e => handlePinInput(e.target.value, i, pin, setPin, pinRefs)}
                  onKeyDown={e => handlePinKey(e, i, pinRefs)}
                  className="w-12 h-12 text-center text-2xl font-extrabold border-2 border-gray-200 focus:border-[#F47216] rounded-xl outline-none text-[#F47216]" />
              ))}
            </div>

            {isNew && (
              <>
                <label className="text-[#00A650] font-bold text-xs uppercase block mb-2">
                  {t("PIN की पुष्टि करें", "Confirm PIN")}
                </label>
                <div className="flex gap-3 justify-center mb-4">
                  {confirmPin.map((d, i) => (
                    <input key={i} ref={confirmRefs[i]} type="password" inputMode="numeric"
                      maxLength={1} value={d}
                      onChange={e => handlePinInput(e.target.value, i, confirmPin, setConfirmPin, confirmRefs)}
                      onKeyDown={e => { if (e.key === "Backspace" && !confirmPin[i] && i > 0) confirmRefs[i-1].current?.focus(); }}
                      className="w-12 h-12 text-center text-2xl font-extrabold border-2 border-gray-200 focus:border-[#00A650] rounded-xl outline-none text-[#00A650]" />
                  ))}
                </div>
              </>
            )}

            <button onClick={handlePinContinue} disabled={loading}
              className="w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-base hover:bg-[#F47216] transition-all disabled:opacity-60">
              {loading ? t("जाँच रहे हैं...", "Verifying...") : t("जारी रखें →", "Continue →")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
