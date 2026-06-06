"use client";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { useLang } from "@/lib/lang";

// Indian tricolor — Saffron #FF9933 | White #FFFFFF | Green #138808 | Navy #000080
export default function HomepageHero() {
  const { customer, loading } = useAuth();
  const { t } = useLang();

  // Hide entirely for signed-in users
  if (loading || customer) return null;

  return (
    <section className="px-3 pt-3 pb-2">
      {/* Headline */}
      <div className="text-center mb-3">
        <h1 className="text-2xl font-extrabold text-white leading-tight">
          {t("रोहतक का अपना डिजिटल बाज़ार", "Rohtak's Own Digital Market")}
        </h1>
      </div>

      {/* Limited-time offer banner — Indian tricolor */}
      <div className="bg-white rounded-2xl mb-3 shadow-lg overflow-hidden border-2 border-[#FF9933]">
        {/* Saffron strip */}
        <div className="bg-[#FF9933] px-3 py-1.5 text-center">
          <span className="inline-block bg-white text-[#FF9933] text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
            ⏳ {t("सीमित समय का ऑफर", "Limited-Time Offer")}
          </span>
        </div>

        {/* White center */}
        <div className="text-center px-3 py-2.5">
          <h2 className="text-[#000080] font-extrabold text-base leading-tight">
            {t("100% मुफ्त रजिस्ट्रेशन", "100% Free Registration")}
          </h2>
          <p className="text-[#1a1a1a] font-bold text-[11px] mt-1 leading-snug">
            {t(
              "ग्राहक · दुकानदार · रेस्तरां मालिक · डिलीवरी राइडर — सभी के लिए",
              "Customers · Shop Owners · Restaurant Owners · Riders — all welcome"
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-2">
            <span className="bg-[#FFE0B2] text-[#000080] text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-[#FF9933]">
              ✓ {t("कोई सब्सक्रिप्शन शुल्क नहीं", "No subscription fee")}
            </span>
            <span className="bg-[#FFE0B2] text-[#000080] text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-[#FF9933]">
              ✓ {t("कोई कमीशन नहीं", "No commission")}
            </span>
            <span className="bg-[#C8E6C9] text-[#000080] text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-[#138808]">
              ✓ {t("कोई सेटलमेंट नहीं", "No settlement")}
            </span>
            <span className="bg-[#C8E6C9] text-[#000080] text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-[#138808]">
              ✓ {t("सीधे बैंक में पेमेंट", "Direct bank payment")}
            </span>
            <span className="bg-[#C8E6C9] text-[#000080] text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-[#138808]">
              ✓ {t("रियल-टाइम डिस्काउंट", "Real-time discounts")}
            </span>
          </div>
        </div>

        {/* Green strip */}
        <div className="bg-[#138808] px-3 py-1.5 text-center">
          <p className="text-white font-extrabold text-[11px] leading-tight">
            {t(
              "कुछ ही सेकंड में रजिस्टर करें — रोहतक के 1 करोड़+ उत्पादों व सेवाओं पर 90% तक छूट पाएं",
              "Register in seconds — get up to 90% off on 1Cr+ products & services across Rohtak"
            )}
          </p>
        </div>
      </div>

      {/* 3 CTAs — Indian tricolor */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Link href="/auth/customer"
          className="bg-[#FF9933] rounded-xl p-3 text-center shadow-md hover:bg-[#E68A2E] hover:shadow-xl active:scale-95 transition-all border-2 border-white">
          <div className="text-white font-extrabold text-[14px] leading-tight">{t("ग्राहक", "Customer")}</div>
          <div className="text-white/90 text-[10px] leading-tight mt-1 font-semibold">{t("खरीदारी / लॉगिन", "Buy / Login")}</div>
        </Link>
        <Link href="/auth/seller"
          className="bg-white rounded-xl p-3 text-center shadow-md hover:shadow-xl active:scale-95 transition-all border-2 border-[#000080]">
          <div className="text-[#000080] font-extrabold text-[14px] leading-tight">{t("विक्रेता", "Seller")}</div>
          <div className="text-[#000080]/70 text-[10px] leading-tight mt-1 font-semibold">{t("दुकान / रजिस्टर", "Shop / Register")}</div>
        </Link>
        <Link href="/auth/rider"
          className="bg-[#138808] rounded-xl p-3 text-center shadow-md hover:bg-[#0d6606] hover:shadow-xl active:scale-95 transition-all border-2 border-white">
          <div className="text-white font-extrabold text-[14px] leading-tight">{t("डिलीवरी राइडर", "Rider")}</div>
          <div className="text-white/90 text-[10px] leading-tight mt-1 font-semibold">{t("कमाएं / जुड़ें", "Earn / Join")}</div>
        </Link>
      </div>

      {/* Tabs heading */}
      <div className="bg-white/10 rounded-xl px-4 py-2 mb-2 border border-white/20">
        <h2 className="text-white font-extrabold text-sm text-center">
          {t("सेवाएं — श्रेणी से चुनें", "Services — Browse by Category")}
        </h2>
      </div>
    </section>
  );
}
