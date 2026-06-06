"use client";
import Link from "next/link";
import { useLang } from "@/lib/lang";

export default function CustomerAuthPage() {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F47216] to-[#FFF8F0] px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-6xl mb-2">🛒</div>
          <h1 className="text-2xl font-extrabold text-white">{t("ग्राहक पोर्टल", "Customer Portal")}</h1>
          <p className="text-white/80 text-sm">{t("खरीदारी, बुकिंग व डिलीवरी", "Shop, Book & Track Delivery")}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-3">
          <Link href="/auth/login"
            className="block w-full bg-[#F47216] text-white py-3 rounded-xl font-extrabold text-center hover:bg-[#00A650] transition">
            🔐 {t("लॉगिन करें", "Login")}
          </Link>
          <Link href="/auth/register"
            className="block w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-center hover:bg-[#F47216] transition">
            ＋ {t("नया खाता बनाएं", "Create Account")}
          </Link>
          <p className="text-gray-400 text-xs text-center pt-2">
            {t("Medusa द्वारा संचालित · सुरक्षित ग्राहक सत्र", "Powered by Medusa · Secure customer session")}
          </p>
        </div>
        <div className="text-center mt-4">
          <Link href="/" className="text-white/80 text-xs hover:text-white">← {t("मुख्य पृष्ठ पर वापस", "Back to Home")}</Link>
        </div>
      </div>
    </div>
  );
}
