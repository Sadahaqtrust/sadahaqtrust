"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPinPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error. Check your connection.");
    }
    setLoading(false);
  }

  function openEmailApp() {
    const domain = email.split("@")[1]?.toLowerCase() || "";
    const isGmail = domain.includes("gmail");
    const isOutlook = domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live");
    const isYahoo = domain.includes("yahoo");

    // Simple web URLs — works on all devices without Play Store redirect
    if (isGmail) {
      window.open("https://mail.google.com/mail/u/0/#search/from%3Adigitalrohtak+reset+pin", "_blank");
    } else if (isOutlook) {
      window.open("https://outlook.live.com/mail/0/inbox", "_blank");
    } else if (isYahoo) {
      window.open("https://mail.yahoo.com/d/folders/1", "_blank");
    } else {
      window.open("https://mail.google.com/mail/u/0/#inbox", "_blank");
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">

        {!sent ? (
          <>
            <h1 className="text-3xl font-extrabold text-[#F47216] mb-1">Forgot PIN?</h1>
            <p className="text-gray-500 text-sm mb-6">
              Enter your email and we'll send you a link to reset your PIN
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">Email</label>
                <input type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-4 py-3 text-gray-700 outline-none" />
              </div>
              <button type="submit" disabled={loading}
                className="bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-lg hover:bg-[#F47216] transition-all disabled:opacity-60">
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-6xl mb-4">📧</div>
            <h2 className="text-2xl font-extrabold text-[#00A650] mb-2">Check Your Email</h2>
            <p className="text-gray-500 mb-1">
              We've sent a reset link to
            </p>
            <p className="font-bold text-[#F47216] mb-4">{email}</p>
            <p className="text-gray-400 text-sm mb-6">
              The link expires in 15 minutes. Check spam if you don't see it.
            </p>

            <div className="flex flex-col gap-3">
              <button onClick={openEmailApp}
                className="bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-lg hover:bg-[#F47216] transition-all flex items-center justify-center gap-2">
                📬 Open Email & Continue
              </button>
              <button onClick={() => { setSent(false); setEmail(""); setError(""); }}
                className="bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all">
                Cancel
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-gray-400 text-xs mb-2">Didn't receive it?</p>
              <button onClick={() => { setSent(false); setError(""); }}
                className="text-[#F47216] font-bold hover:text-[#00A650] text-sm">
                Try again
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-gray-400 text-sm mt-6">
          <Link href="/auth/login" className="text-[#00A650] hover:text-[#F47216]">← Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
