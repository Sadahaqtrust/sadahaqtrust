"use client";
import { useState, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "" });
  const [pin, setPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const confirmRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function handlePinInput(val: string, idx: number, arr: string[], setArr: (a: string[]) => void, refs: any[]) {
    if (!/^\d*$/.test(val)) return;
    const updated = [...arr];
    updated[idx] = val.slice(-1);
    setArr(updated);
    if (val && idx < 3) refs[idx + 1].current?.focus();
  }

  function handlePinKey(e: React.KeyboardEvent, idx: number, refs: any[]) {
    if (e.key === "Backspace" && idx > 0) refs[idx - 1].current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const pinStr = pin.join("");
    const confirmStr = confirmPin.join("");
    if (pinStr.length < 4) { setError("Enter a 4-digit PIN"); return; }
    if (pinStr !== confirmStr) { setError("PINs do not match"); return; }
    setLoading(true);
    const result = await register(form.email, pinStr, form.firstName, form.lastName);
    setLoading(false);
    if (result.error) setError(result.error);
    else router.push("/auth/account");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-[#F47216] mb-1">Create Account</h1>
        <p className="text-gray-500 text-sm mb-6">One account for all Digital Rohtak services</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">First Name</label>
              <input type="text" required value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                placeholder="Rahul"
                className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-3 text-gray-700 outline-none" />
            </div>
            <div className="flex-1">
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">Last Name</label>
              <input type="text" required value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                placeholder="Sharma"
                className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-3 text-gray-700 outline-none" />
            </div>
          </div>

          <div>
            <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">Email</label>
            <input type="email" required value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-4 py-3 text-gray-700 outline-none" />
          </div>

          {/* 4-digit PIN */}
          <div>
            <label className="text-[#F47216] font-bold text-xs uppercase block mb-2">4-Digit PIN</label>
            <div className="flex gap-3 justify-start">
              {pin.map((d, i) => (
                <input key={i} ref={pinRefs[i]} type="password" inputMode="numeric"
                  maxLength={1} value={d}
                  onChange={e => handlePinInput(e.target.value, i, pin, setPin, pinRefs)}
                  onKeyDown={e => handlePinKey(e, i, pinRefs)}
                  className="w-14 h-14 text-center text-2xl font-extrabold border-2 border-gray-200 focus:border-[#F47216] rounded-xl outline-none text-[#F47216]" />
              ))}
            </div>
          </div>

          {/* Confirm PIN */}
          <div>
            <label className="text-[#F47216] font-bold text-xs uppercase block mb-2">Confirm PIN</label>
            <div className="flex gap-3 justify-start">
              {confirmPin.map((d, i) => (
                <input key={i} ref={confirmRefs[i]} type="password" inputMode="numeric"
                  maxLength={1} value={d}
                  onChange={e => handlePinInput(e.target.value, i, confirmPin, setConfirmPin, confirmRefs)}
                  onKeyDown={e => handlePinKey(e, i, confirmRefs)}
                  className="w-14 h-14 text-center text-2xl font-extrabold border-2 border-gray-200 focus:border-[#00A650] rounded-xl outline-none text-[#00A650]" />
              ))}
            </div>
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
              className="w-5 h-5 accent-[#00A650]" />
            <span className="text-gray-600 text-sm">Remember me for 1 year</span>
          </label>

          <button type="submit" disabled={loading}
            className="bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-lg hover:bg-[#F47216] transition-all disabled:opacity-60 mt-1">
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-[#00A650] font-bold hover:text-[#F47216]">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
