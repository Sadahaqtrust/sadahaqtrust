"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useLang } from "@/lib/lang";

const NAV_LINKS = [
  { href: "/",           hi: "होम",        en: "Home" },
  { href: "/ngos",       hi: "एनजीओ",      en: "NGOs" },
  { href: "/mentors",    hi: "मार्गदर्शक",  en: "Mentors" },
  { href: "/volunteers", hi: "स्वयंसेवक",   en: "Volunteers" },
  { href: "/grievances", hi: "शिकायतें",    en: "Grievances" },
  { href: "/citizens",   hi: "नागरिक",      en: "Citizens" },
];

export default function SadahaqNavbar() {
  const [open, setOpen] = useState(false);
  const { customer, logout } = useAuth();
  const { t } = useLang();

  return (
    <nav className="bg-[#F47216] border-b-4 border-[#00A650] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-extrabold text-white">{t("साद्दा हक़", "Sadahaq")}</span>
          <span className="text-2xl font-extrabold text-[#00A650]">{t("इंटरनेशनल", "International")}</span>
        </Link>

        <div className="hidden md:flex items-center gap-5">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className="text-white hover:text-[#00A650] font-semibold transition-colors text-sm">
              {t(l.hi, l.en)}
            </Link>
          ))}
          {customer ? (
            <>
              <Link href="/auth/account"
                className="bg-[#00A650] text-white px-3 py-2 rounded-full text-sm font-bold hover:bg-white hover:text-[#00A650] transition-all">
                👤 {customer.first_name}
              </Link>
              <button onClick={logout} className="text-white/70 hover:text-white text-sm">{t("साइन आउट", "Sign Out")}</button>
            </>
          ) : (
            <Link href="/auth/login"
              className="bg-[#00A650] text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-white hover:text-[#00A650] transition-all">
              {t("साइन इन", "Sign In")}
            </Link>
          )}
        </div>

        <button className="md:hidden text-white text-2xl" onClick={() => setOpen(!open)}>
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#00A650] px-4 py-3 flex flex-col gap-3">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
              className="text-white font-semibold">{t(l.hi, l.en)}</Link>
          ))}
          {customer
            ? <button onClick={() => { logout(); setOpen(false); }} className="text-white/80 text-left">{t("साइन आउट", "Sign Out")}</button>
            : <Link href="/auth/login" onClick={() => setOpen(false)} className="text-white font-semibold">{t("साइन इन", "Sign In")}</Link>
          }
        </div>
      )}
    </nav>
  );
}
