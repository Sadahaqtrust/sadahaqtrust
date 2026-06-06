"use client";
import Link from "next/link";
import { useLang } from "@/lib/lang";

export default function SellerAuthPage() {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00A650] to-[#FFF8F0] px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">🏪</div>
          <h1 className="text-2xl font-extrabold text-white">{t("विक्रेता पोर्टल", "Seller Portal")}</h1>
          <p className="text-white/80 text-sm">{t("रेस्तरां, सेवा प्रदाता व व्यापारी", "Restaurant, Service Provider & Merchant")}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-3">
          <Link href="https://professionalservices.digitalrohtak.online/register"
            className="flex items-center gap-3 w-full bg-orange-50 border-2 border-[#F47216] p-3 rounded-xl hover:bg-orange-100 transition">
            <span className="text-3xl">🏛️</span>
            <div className="flex-1 text-left">
              <div className="font-extrabold text-[#F47216] text-sm">{t("सेवा प्रदाता रजिस्टर करें", "Register as Service Provider")}</div>
              <div className="text-gray-500 text-[10px]">{t("वकील, सीए, डॉक्टर, इलेक्ट्रीशियन आदि", "Lawyer, CA, Doctor, Electrician etc.")}</div>
            </div>
            <span className="text-[#F47216] font-bold">→</span>
          </Link>

          <Link href="/food/register"
            className="flex items-center gap-3 w-full bg-red-50 border-2 border-red-400 p-3 rounded-xl hover:bg-red-100 transition">
            <span className="text-3xl">🍽️</span>
            <div className="flex-1 text-left">
              <div className="font-extrabold text-red-600 text-sm">{t("रेस्तरां रजिस्टर करें", "Register Restaurant")}</div>
              <div className="text-gray-500 text-[10px]">{t("Medusa रेस्तरां प्रबंधन", "Medusa restaurant management")}</div>
            </div>
            <span className="text-red-600 font-bold">→</span>
          </Link>

          <Link href="/auth/login"
            className="flex items-center gap-3 w-full bg-green-50 border-2 border-[#00A650] p-3 rounded-xl hover:bg-green-100 transition">
            <span className="text-3xl">🔐</span>
            <div className="flex-1 text-left">
              <div className="font-extrabold text-[#00A650] text-sm">{t("मौजूदा विक्रेता लॉगिन", "Existing Seller Login")}</div>
              <div className="text-gray-500 text-[10px]">{t("मोबाइल / ईमेल + 4 अंक PIN", "Mobile / Email + 4-digit PIN")}</div>
            </div>
            <span className="text-[#00A650] font-bold">→</span>
          </Link>

          <p className="text-gray-400 text-xs text-center pt-2">
            {t("Medusa लाइफसाइकल · पूर्ण व्यापारी डैशबोर्ड", "Medusa lifecycle · Full merchant dashboard")}
          </p>
        </div>
        <div className="text-center mt-4">
          <Link href="/" className="text-white/80 text-xs hover:text-white">← {t("मुख्य पृष्ठ पर वापस", "Back to Home")}</Link>
        </div>
      </div>
    </div>
  );
}
