"use client";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang";
import RoleSelector from "@/app/components/RoleSelector";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "";

type DashboardData = {
  roles: { id: string; type: string; label_hi: string; label_en: string; icon: string }[];
  seller_profile: any;
  rider_profile: any;
  service_provider_profile: any;
};

const ROLE_ACTIONS: Record<string, { label_hi: string; label_en: string; icon: string; href: string }[]> = {
  customer: [
    { label_hi: "मेरे ऑर्डर", label_en: "My Orders", icon: "📦", href: "/orders" },
    { label_hi: "खरीदारी करें", label_en: "Shop Now", icon: "🛒", href: "/" },
  ],
  seller: [
    { label_hi: "एडमिन पैनल", label_en: "Admin Panel", icon: "⚙️", href: "https://api.digitalrohtak.online/app" },
    { label_hi: "दुकान प्रोफाइल", label_en: "Shop Profile", icon: "🏪", href: "/auth/onboarding/seller" },
  ],
  restaurant_owner: [
    { label_hi: "एडमिन पैनल", label_en: "Admin Panel", icon: "⚙️", href: "https://api.digitalrohtak.online/app" },
    { label_hi: "रेस्तरां जोड़ें", label_en: "Add Restaurant", icon: "🍽️", href: "/food/register" },
  ],
  rider: [
    { label_hi: "राइडर प्रोफाइल", label_en: "Rider Profile", icon: "🛵", href: "/auth/onboarding/rider" },
    { label_hi: "डिलीवरी ट्रैक", label_en: "Track Deliveries", icon: "📍", href: "/track" },
  ],
  professional: [
    { label_hi: "प्रोफाइल बनाएं", label_en: "Create Profile", icon: "💼", href: "/professionalservices/register" },
    { label_hi: "अपॉइंटमेंट", label_en: "Appointments", icon: "📅", href: "/professionalservices" },
  ],
  service_provider: [
    { label_hi: "सेवा प्रदाता पंजीकरण", label_en: "Register as Provider", icon: "🔧", href: "/auth/onboarding/service-provider" },
    { label_hi: "सेवाएं देखें", label_en: "Browse Services", icon: "🏛️", href: "/professionalservices" },
  ],
};

export default function AccountPage() {
  const { customer, token, loading, logout } = useAuth();
  const { t, lang } = useLang();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!loading && !customer) router.push("/auth/login?from=/auth/account");
  }, [customer, loading]);

  useEffect(() => {
    if (!token) return;
    fetch(`${MEDUSA_URL}/store/dr/me/dashboard`, {
      headers: { Authorization: `Bearer ${token}`, "x-publishable-api-key": PK },
    })
      .then(r => r.json())
      .then(d => setDashboard(d))
      .catch(() => {});
  }, [token]);

  if (loading || !customer) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-white border-t-[#00A650] rounded-full animate-spin" />
    </div>
  );

  const roles = dashboard?.roles || [];
  const currentRoleTypes = roles.map(r => r.type);

  // If no roles yet — show role selector
  if (dashboard && roles.length === 0 && !showRoleEditor) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-4">
          <div className="text-4xl mb-1">👋</div>
          <h1 className="text-xl font-extrabold text-white">{t("स्वागत है!", "Welcome!")}</h1>
          <p className="text-white/80 text-sm">{t("अपनी भूमिका चुनें", "Select your role to get started")}</p>
        </div>
        <RoleSelector token={token || ""} onDone={() => { setShowRoleEditor(false); window.location.reload(); }} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-xl p-5 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-[#F47216] flex items-center justify-center text-white text-2xl font-extrabold flex-shrink-0">
            {customer.first_name?.[0]?.toUpperCase() || customer.email[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-gray-800 text-base leading-tight">
              {customer.first_name} {customer.last_name}
            </h1>
            <p className="text-gray-500 text-xs truncate">{customer.email}</p>
          </div>
        </div>

        {/* Active roles */}
        {roles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {roles.map(r => (
              <span key={r.id} className="bg-[#FFF3E0] text-[#F47216] border border-[#F47216]/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {r.icon} {lang === "hi" ? r.label_hi : r.label_en}
              </span>
            ))}
          </div>
        )}

        <button onClick={() => setShowRoleEditor(!showRoleEditor)}
          className="w-full bg-gray-50 text-gray-600 py-2 rounded-xl font-semibold text-xs hover:bg-gray-100 transition-all border border-gray-200">
          ✏️ {t("भूमिकाएं बदलें / जोड़ें", "Edit / Add Roles")}
        </button>
      </div>

      {/* Role editor */}
      {showRoleEditor && (
        <div className="mb-4">
          <RoleSelector
            token={token || ""}
            currentRoles={currentRoleTypes}
            onDone={() => { setShowRoleEditor(false); window.location.reload(); }}
          />
        </div>
      )}

      {/* Role-specific action cards */}
      {roles.map(role => {
        const actions = ROLE_ACTIONS[role.type] || [];
        if (actions.length === 0) return null;
        return (
          <div key={role.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{role.icon}</span>
              <span className="font-extrabold text-gray-700 text-sm">
                {lang === "hi" ? role.label_hi : role.label_en}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {actions.map(a => (
                <a key={a.href} href={a.href}
                  className="flex items-center gap-2 bg-[#FFF8F0] border border-[#F47216]/20 rounded-xl px-3 py-2.5 hover:bg-[#FFF3E0] transition-all">
                  <span className="text-base">{a.icon}</span>
                  <span className="text-[#F47216] font-bold text-[11px] leading-tight">
                    {lang === "hi" ? a.label_hi : a.label_en}
                  </span>
                </a>
              ))}
            </div>
          </div>
        );
      })}

      {/* Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <a href="/auth/forgot-pin"
          className="flex items-center gap-3 py-2.5 border-b border-gray-100 hover:text-[#F47216] transition-all">
          <span>🔑</span>
          <span className="text-gray-700 font-semibold text-sm">{t("PIN बदलें", "Change PIN")}</span>
          <span className="ml-auto text-gray-300">›</span>
        </a>

        {showConfirm ? (
          <div className="pt-3">
            <p className="text-red-600 text-sm font-semibold mb-3">{t("क्या आप साइन आउट करना चाहते हैं?", "Are you sure you want to sign out?")}</p>
            <div className="flex gap-2">
              <button onClick={() => { logout(); router.push("/"); }}
                className="flex-1 bg-red-500 text-white py-2 rounded-xl font-bold text-sm hover:bg-red-600 transition-all">
                {t("हाँ, साइन आउट", "Yes, Sign Out")}
              </button>
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-600 py-2 rounded-xl font-bold text-sm hover:bg-gray-300 transition-all">
                {t("रद्द करें", "Cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowConfirm(true)}
            className="w-full text-red-500 py-2.5 font-bold text-sm hover:text-red-600 transition-all text-left flex items-center gap-3 mt-1">
            <span>🚪</span> {t("साइन आउट", "Sign Out")}
          </button>
        )}
      </div>
    </div>
  );
}
