"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPinForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [valid, setValid] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [newPin, setNewPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const newRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const confRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Verify token on load
  useEffect(() => {
    if (!token) { setValid(false); setError("No reset token found"); return; }
    fetch(`/api/auth/reset-pin?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setValid(true);
          setEmail(data.email);
        } else {
          setValid(false);
          setError(data.error || "Invalid link");
        }
      })
      .catch(() => { setValid(false); setError("Network error"); });
  }, [token]);

  function handlePin(val: string, idx: number, arr: string[], setArr: (a: string[]) => void, refs: any[]) {
    if (!/^\d*$/.test(val)) return;
    const updated = [...arr];
    updated[idx] = val.slice(-1);
    setArr(updated);
    if (val && idx < 3) refs[idx + 1].current?.focus();
  }

  function handleKey(e: React.KeyboardEvent, idx: number, arr: string[], refs: any[]) {
    if (e.key === "Backspace" && !arr[idx] && idx > 0) refs[idx - 1].current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const np = newPin.join("");
    const cp = confirmPin.join("");
    if (np.length < 4) { setError("Enter a 4-digit PIN"); return; }
    if (np !== cp) { setError("PINs do not match"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pin: np }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDone(true);
      } else {
        setError(data.error || "Failed to reset PIN");
      }
    } catch {
      setError("Network error. Check your connection.");
    }
    setLoading(false);
  }

  // Loading state
  if (valid === null) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4 animate-pulse">🔐</div>
        <p className="text-gray-500">Verifying your reset link...</p>
      </div>
    );
  }

  // Invalid token
  if (!valid) {
    return (
      <div className="text-center py-6">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-extrabold text-red-500 mb-2">Invalid Link</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link href="/auth/forgot-pin"
          className="bg-[#F47216] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#00A650] transition-all">
          Request New Link
        </Link>
      </div>
    );
  }

  // Success
  if (done) {
    return (
      <div className="text-center py-6">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-extrabold text-[#00A650] mb-2">PIN Updated!</h2>
        <p className="text-gray-500 mb-6">Your PIN has been changed successfully.</p>
        <Link href="/auth/login"
          className="bg-[#00A650] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#F47216] transition-all">
          Sign In Now
        </Link>
      </div>
    );
  }

  // Reset form
  return (
    <>
      <h1 className="text-3xl font-extrabold text-[#F47216] mb-1">Set New PIN</h1>
      <p className="text-gray-500 text-sm mb-6">
        Choose a new 4-digit PIN for <strong>{email}</strong>
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="text-[#F47216] font-bold text-xs uppercase block mb-2">New PIN</label>
          <div className="flex gap-3">
            {newPin.map((d, i) => (
              <input key={i} ref={newRefs[i]} type="password" inputMode="numeric"
                maxLength={1} value={d}
                onChange={e => handlePin(e.target.value, i, newPin, setNewPin, newRefs)}
                onKeyDown={e => handleKey(e, i, newPin, newRefs)}
                className="w-14 h-14 text-center text-2xl font-extrabold border-2 border-gray-200 focus:border-[#F47216] rounded-xl outline-none text-[#F47216]" />
            ))}
          </div>
        </div>
        <div>
          <label className="text-[#F47216] font-bold text-xs uppercase block mb-2">Confirm New PIN</label>
          <div className="flex gap-3">
            {confirmPin.map((d, i) => (
              <input key={i} ref={confRefs[i]} type="password" inputMode="numeric"
                maxLength={1} value={d}
                onChange={e => handlePin(e.target.value, i, confirmPin, setConfirmPin, confRefs)}
                onKeyDown={e => handleKey(e, i, confirmPin, confRefs)}
                className="w-14 h-14 text-center text-2xl font-extrabold border-2 border-gray-200 focus:border-[#00A650] rounded-xl outline-none text-[#00A650]" />
            ))}
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-lg hover:bg-[#F47216] transition-all disabled:opacity-60">
          {loading ? "Saving..." : "Save New PIN"}
        </button>
      </form>
    </>
  );
}

export default function ResetPinPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <Suspense fallback={<div className="text-center py-12"><p className="text-gray-500">Loading...</p></div>}>
          <ResetPinForm />
        </Suspense>
        <p className="text-center text-gray-400 text-sm mt-6">
          <Link href="/auth/login" className="text-[#00A650] hover:text-[#F47216]">← Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
