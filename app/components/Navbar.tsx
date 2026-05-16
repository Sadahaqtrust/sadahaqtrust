"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useLang, LangToggle } from "@/lib/lang";

const ROOT_DOMAIN = "https://digitalrohtak.online";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { customer, logout } = useAuth();
  const { t } = useLang();
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const host = window.location.hostname;
    setIsSubdomain(host.endsWith(".digitalrohtak.online") && host !== "digitalrohtak.online");
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
        setShowSignOutConfirm(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav className="bg-[#F47216] border-b-2 border-[#00A650] shadow-md">
      <div className="max-w-7xl mx-auto px-3 py-1.5 flex items-center justify-between">

        {/* Mobile hamburger — LEFT */}
        <button className="md:hidden text-white text-xl mr-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "✕" : "☰"}
        </button>

        {/* Logo */}
        <Link href={isSubdomain ? ROOT_DOMAIN : "/"} className="flex items-center gap-1">
          <span className="text-base font-extrabold text-white tracking-tight">Digital</span>
          <span className="text-base font-extrabold text-[#00A650] tracking-tight">Rohtak</span>
          <span className="text-[10px] text-white/60 ml-1 hidden sm:block">डिजिटल रोहतक</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-4">
          {isSubdomain && (
            <a href={ROOT_DOMAIN} className="text-white hover:text-[#00A650] font-semibold transition-colors text-sm">
              digitalrohtak
            </a>
          )}
          {!isSubdomain && (
            <>
              <a href="https://shopping.digitalrohtak.online" className="text-white hover:text-[#00A650] font-semibold transition-colors text-sm">
                {t("खरीदारी", "Shopping")}
              </a>
              {customer && (
                <Link href="/cart" className="text-white hover:text-[#00A650] font-semibold transition-colors text-sm">
                  🛒 {t("टोकरी", "Cart")}
                </Link>
              )}
            </>
          )}

          {/* Language toggle */}
          <LangToggle />

          {customer ? (
            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-2 bg-[#00A650] text-white px-3 py-1.5 rounded-full font-semibold hover:bg-white hover:text-[#00A650] transition-all text-sm">
                <span className="w-5 h-5 rounded-full bg-white text-[#00A650] flex items-center justify-center text-xs font-extrabold">
                  {customer.first_name?.[0]?.toUpperCase()}
                </span>
                {customer.first_name}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl z-[300] overflow-hidden" style={{boxShadow: "0 8px 32px rgba(0,0,0,0.25)", border: "2px solid #00A650"}}>
                  <div className="bg-[#1a1a1a] px-6 py-5 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[#F47216] flex items-center justify-center text-white text-2xl font-extrabold mb-2 border-4 border-white">
                      {customer.first_name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <p className="text-white font-extrabold text-lg">{customer.first_name} {customer.last_name}</p>
                    <p className="text-white/60 text-xs mt-1">{customer.email}</p>
                  </div>
                  <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs font-semibold uppercase">{t("खाता नं.", "Account No")}</span>
                      <span className="text-gray-700 text-xs font-mono bg-gray-100 px-2 py-1 rounded-lg">{customer.id?.slice(-12).toUpperCase()}</span>
                    </div>
                    {customer.phone && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs font-semibold uppercase">{t("फ़ोन", "Phone")}</span>
                        <span className="text-gray-700 text-xs">{customer.phone}</span>
                      </div>
                    )}
                    {customer.created_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs font-semibold uppercase">{t("सदस्य बने", "Member Since")}</span>
                        <span className="text-gray-700 text-xs">{new Date(customer.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <button onClick={() => { setProfileOpen(false); router.push("/auth/forgot-pin"); }}
                      className="w-full text-left bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-semibold transition-all">
                      🔑 {t("PIN बदलें", "Change PIN")}
                    </button>
                    {showSignOutConfirm ? (
                      <div className="bg-red-50 rounded-xl p-3">
                        <p className="text-red-600 text-xs font-semibold mb-2">{t("क्या आप साइन आउट करना चाहते हैं?", "Sure you want to sign out?")}</p>
                        <div className="flex gap-2">
                          <button onClick={() => { logout(); setProfileOpen(false); setShowSignOutConfirm(false); router.push("/"); }}
                            className="flex-1 bg-red-500 text-white py-2 rounded-xl font-bold text-xs hover:bg-red-600 transition-all">
                            {t("हाँ, साइन आउट", "Yes, Sign Out")}
                          </button>
                          <button onClick={() => setShowSignOutConfirm(false)}
                            className="flex-1 bg-gray-200 text-gray-600 py-2 rounded-xl font-bold text-xs hover:bg-gray-300 transition-all">
                            {t("रद्द करें", "Cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowSignOutConfirm(true)}
                        className="w-full border-2 border-red-300 text-red-500 py-3 rounded-xl font-bold text-sm hover:bg-red-50 transition-all">
                        {t("साइन आउट", "Sign Out")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/login" className="text-white hover:text-[#00A650] font-semibold transition-colors text-sm">
              {t("साइन इन", "Sign In")}
            </Link>
          )}
        </div>

        {/* Mobile: lang toggle + hamburger already on left */}
        <div className="md:hidden flex items-center gap-2">
          <LangToggle />
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#00A650] px-4 py-3 flex flex-col gap-3">
          {isSubdomain ? (
            <>
              <a href={ROOT_DOMAIN} onClick={() => setMenuOpen(false)} className="text-white font-semibold">digitalrohtak</a>
              {customer && (
                <a href={`${ROOT_DOMAIN}/cart`} onClick={() => setMenuOpen(false)} className="text-white font-semibold">
                  🛒 {t("टोकरी", "Cart")}
                </a>
              )}
            </>
          ) : (
            <>
              <a href="https://shopping.digitalrohtak.online" onClick={() => setMenuOpen(false)} className="text-white font-semibold">
                {t("खरीदारी", "Shopping")}
              </a>
              {customer && (
                <Link href="/cart" onClick={() => setMenuOpen(false)} className="text-white font-semibold">
                  🛒 {t("टोकरी", "Cart")}
                </Link>
              )}
            </>
          )}
          {customer ? (
            <>
              <div className="bg-[#F47216]/20 rounded-xl px-4 py-3">
                <p className="text-white font-bold">{customer.first_name} {customer.last_name}</p>
                <p className="text-white/70 text-xs">{customer.email}</p>
              </div>
              <button onClick={() => { setMenuOpen(false); router.push("/auth/forgot-pin"); }} className="text-white font-semibold text-left">
                🔑 {t("PIN बदलें", "Change PIN")}
              </button>
              <button onClick={() => { logout(); setMenuOpen(false); router.push("/"); }} className="text-white/80 font-semibold text-left">
                {t("साइन आउट", "Sign Out")}
              </button>
            </>
          ) : (
            <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="text-white font-semibold">{t("साइन इन", "Sign In")}</Link>
          )}
        </div>
      )}
    </nav>
  );
}
