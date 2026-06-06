"use client";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";

export default function ServiceProviderOnboardingPage() {
  const { t } = useLang();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F47216] py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-4xl mb-1">🏛️</div>
          <h1 className="text-xl font-extrabold text-white">{t("सेवा प्रदाता पोर्टल", "Service Provider Portal")}</h1>
          <p className="text-white/80 text-xs mt-1">{t("डिजिटल रोहतक — सेवा प्रदाता", "Digital Rohtak — Service Providers")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-5 space-y-3">
          <a
            href="/professionalservices/register"
            className="flex items-center gap-3 w-full bg-orange-50 border-2 border-[#F47216] p-4 rounded-xl hover:bg-orange-100 active:scale-95 transition-all"
          >
            <span className="text-2xl">＋</span>
            <div className="flex-1 text-left">
              <div className="font-extrabold text-[#F47216] text-sm">{t("नया प्रोफाइल बनाएं", "Create New Profile")}</div>
              <div className="text-gray-500 text-[10px]">{t("वकील, सीए, डॉक्टर, इलेक्ट्रीशियन आदि", "Lawyer, CA, Doctor, Electrician etc.")}</div>
            </div>
            <span className="text-[#F47216] font-bold">→</span>
          </a>

          <a
            href="/professionalservices"
            className="flex items-center gap-3 w-full bg-green-50 border-2 border-[#00A650] p-4 rounded-xl hover:bg-green-100 active:scale-95 transition-all"
          >
            <span className="text-2xl">🔍</span>
            <div className="flex-1 text-left">
              <div className="font-extrabold text-[#00A650] text-sm">{t("सेवा प्रदाता खोजें", "Browse Providers")}</div>
              <div className="text-gray-500 text-[10px]">{t("रोहतक में पंजीकृत सभी प्रदाता", "All registered providers in Rohtak")}</div>
            </div>
            <span className="text-[#00A650] font-bold">→</span>
          </a>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-extrabold text-gray-700 mb-2">{t("प्रदाता को क्या मिलता है:", "What providers get:")}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                ["📋", t("ऑनलाइन प्रोफाइल", "Online Profile")],
                ["📅", t("अपॉइंटमेंट बुकिंग", "Appointment Booking")],
                ["🔍", t("खोज में दिखें", "Appear in Search")],
                ["📱", t("ग्राहक संपर्क", "Client Contact")],
                ["⭐", t("रेटिंग व समीक्षा", "Ratings & Reviews")],
                ["✓", t("सत्यापन बैज", "Verified Badge")],
              ].map(([icon, label]) => (
                <div key={String(label)} className="flex items-center gap-1.5 text-[10px] text-gray-600 font-semibold">
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <button onClick={() => router.back()} className="text-white/70 text-xs hover:text-white">
            ← {t("वापस", "Back")}
          </button>
        </div>
      </div>
    </div>
  );
}
