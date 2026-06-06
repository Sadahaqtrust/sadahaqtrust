"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useLang, LangToggle } from "@/lib/lang";
import { useEditLayout } from "@/app/components/EditLayout";

const ROOT_DOMAIN = "https://digitalrohtak.online";

export default function Navbar() {
  const { customer, logout } = useAuth();
  const { t } = useLang();
  const { showAdmin, editMode, toggleEditMode } = useEditLayout();
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
      <div className="px-3 py-1.5 flex items-center justify-between">

        {/* Logo — LEFT */}
        <Link href={isSubdomain ? ROOT_DOMAIN : "/"} className="flex items-center gap-1">
          <span className="text-base font-extrabold text-white tracking-tight">Digital</span>
          <span className="text-base font-extrabold text-[#00A650] tracking-tight">Rohtak</span>
        </Link>

        {/* RIGHT — lang toggle + profile (always visible on mobile + desktop) */}
        <div className="flex items-center gap-2">
          <LangToggle />

          {customer ? (
            /* Profile button — always visible */
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-1.5 bg-[#00A650] text-white px-2.5 py-1.5 rounded-full font-bold text-sm hover:bg-white hover:text-[#00A650] transition-all"
              >
                <span className="w-6 h-6 rounded-full bg-white text-[#00A650] flex items-center justify-center text-xs font-extrabold flex-shrink-0">
                  {customer.first_name?.[0]?.toUpperCase() || "?"}
                </span>
                <span className="hidden sm:block">{customer.first_name}</span>
              </button>

              {/* Profile dropdown — appears below, full width of mobile frame */}
              {profileOpen && (
                <div
                  className="absolute right-0 top-10 bg-white rounded-2xl z-[300] overflow-hidden overflow-y-auto"
                  style={{ width: "min(320px, calc(100vw - 24px))", maxHeight: "80vh", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", border: "2px solid #00A650" }}
                >
                  {/* Header */}
                  <div className="bg-[#1a1a1a] px-5 py-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#F47216] flex items-center justify-center text-white text-xl font-extrabold flex-shrink-0 border-2 border-white">
                      {customer.first_name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="text-white font-extrabold text-sm">{customer.first_name} {customer.last_name}</p>
                      <p className="text-white/60 text-xs">{customer.email}</p>
                    </div>
                  </div>

                  {/* Account info */}
                  <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs font-semibold uppercase">{t("खाता नं.", "Account No")}</span>
                      <span className="text-gray-700 text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{customer.id?.slice(-12).toUpperCase()}</span>
                    </div>
                    {customer.created_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-xs font-semibold uppercase">{t("सदस्य बने", "Since")}</span>
                        <span className="text-gray-700 text-xs">{new Date(customer.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-3 flex flex-col gap-2">
                    {/* Change PIN */}
                    <button onClick={() => { setProfileOpen(false); router.push("/auth/forgot-pin"); }}
                      className="w-full text-left bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all">
                      🔑 {t("PIN बदलें", "Change PIN")}
                    </button>

                    {/* Admin options */}
                    {showAdmin && (
                      <>
                        <div className="text-[10px] text-gray-400 font-bold uppercase px-1 mt-1">{t("प्रशासक", "Admin")}</div>
                        <button onClick={() => { setProfileOpen(false); router.push("/edit-services"); }}
                          className="w-full text-left bg-orange-50 hover:bg-orange-100 text-[#F47216] px-3 py-2.5 rounded-xl text-sm font-semibold transition-all">
                          🛠️ {t("सेवाएं संपादित करें", "Edit Services")}
                        </button>
                        <button onClick={() => { setProfileOpen(false); toggleEditMode(); }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${editMode ? "bg-green-100 text-[#00A650] border-[#00A650]" : "bg-green-50 hover:bg-green-100 text-[#00A650] border-green-200"}`}>
                          🖼️ {editMode ? t("बैनर संपादन बंद करें", "Stop Editing Banners") : t("बैनर संपादित करें", "Edit Banners")}
                        </button>
                        <button onClick={() => { setProfileOpen(false); router.push("/admin/banners"); }}
                          className="w-full text-left bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all">
                          📁 {t("बैनर प्रबंधक", "Banner Manager")}
                        </button>
                      </>
                    )}

                    {/* Sign Out */}
                    {showSignOutConfirm ? (
                      <div className="bg-red-50 rounded-xl p-3 mt-1">
                        <p className="text-red-600 text-xs font-semibold mb-2">{t("साइन आउट करें?", "Sign out?")}</p>
                        <div className="flex gap-2">
                          <button onClick={() => { logout(); setProfileOpen(false); setShowSignOutConfirm(false); router.push("/"); }}
                            className="flex-1 bg-red-500 text-white py-2 rounded-xl font-bold text-xs">
                            {t("हाँ", "Yes")}
                          </button>
                          <button onClick={() => setShowSignOutConfirm(false)}
                            className="flex-1 bg-gray-200 text-gray-600 py-2 rounded-xl font-bold text-xs">
                            {t("नहीं", "No")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowSignOutConfirm(true)}
                        className="w-full border-2 border-red-300 text-red-500 py-2.5 rounded-xl font-bold text-sm hover:bg-red-50 transition-all mt-1">
                        {t("साइन आउट", "Sign Out")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Not logged in — show login link */
            <Link href="/auth/customer"
              className="bg-white text-[#F47216] px-3 py-1.5 rounded-full font-bold text-xs hover:bg-[#00A650] hover:text-white transition-all">
              {t("लॉगिन", "Login")}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
