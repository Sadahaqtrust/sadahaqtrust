"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "";

type Role = {
  id: string; type: string;
  label_hi: string; label_en: string;
  icon: string; desc_hi: string; desc_en: string;
};

// Which roles need extra onboarding after selection
const ONBOARDING_ROUTES: Record<string, string> = {
  seller: "/auth/onboarding/seller",
  restaurant_owner: "/food/register",
  rider: "/auth/onboarding/rider",
  professional: "/professionalservices/register",
  service_provider: "/auth/onboarding/service-provider",
};

interface Props {
  token: string;
  currentRoles?: string[];
  onDone?: (roles: string[]) => void;
  compact?: boolean;
}

export default function RoleSelector({ token, currentRoles = [], onDone, compact = false }: Props) {
  const { t, lang } = useLang();
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentRoles));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${MEDUSA_URL}/store/user-roles`, {
      headers: { "x-publishable-api-key": PK },
    })
      .then(r => r.json())
      .then(d => setAllRoles(d.roles || []))
      .catch(() => {});
  }, []);

  function toggle(type: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }

  async function save() {
    if (selected.size === 0) { setError(t("कम से कम एक भूमिका चुनें", "Select at least one role")); return; }
    setSaving(true); setError("");

    const add = Array.from(selected).filter(r => !currentRoles.includes(r));
    const remove = currentRoles.filter(r => !selected.has(r));

    try {
      const res = await fetch(`${MEDUSA_URL}/store/dr/me/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-publishable-api-key": PK,
        },
        body: JSON.stringify({ add, remove }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      const types = (data.roles || []).map((r: any) => r.type) as string[];

      // Navigate to onboarding for new roles that need it
      const newRolesNeedingOnboarding = add.filter(r => ONBOARDING_ROUTES[r]);
      if (newRolesNeedingOnboarding.length > 0) {
        window.location.href = ONBOARDING_ROUTES[newRolesNeedingOnboarding[0]];
        return;
      }

      onDone?.(types);
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  }

  if (allRoles.length === 0) return (
    <div className="text-center py-8 text-white/60 text-sm animate-pulse">
      {t("भूमिकाएं लोड हो रही हैं...", "Loading roles...")}
    </div>
  );

  return (
    <div className={compact ? "" : "bg-white rounded-2xl shadow-xl p-6"}>
      {!compact && (
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-[#F47216]">
            {t("आप क्या करना चाहते हैं?", "What would you like to do?")}
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            {t("एक से अधिक भूमिकाएं चुन सकते हैं — एक ही खाते से सब कुछ", "Select multiple roles — one account for everything")}
          </p>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2 mb-3 text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-2 mb-4">
        {allRoles.map(role => {
          const active = selected.has(role.type);
          const label = lang === "hi" ? role.label_hi : role.label_en;
          const desc = lang === "hi" ? role.desc_hi : role.desc_en;
          return (
            <button
              key={role.id}
              onClick={() => toggle(role.type)}
              className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all active:scale-95 ${
                active
                  ? "border-[#F47216] bg-[#FFF3E0] shadow-sm"
                  : "border-gray-200 bg-white hover:border-[#F47216]/40"
              }`}
            >
              <div className="flex items-center gap-2 w-full mb-1">
                <span className="text-xl">{role.icon}</span>
                <div className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  active ? "border-[#F47216] bg-[#F47216]" : "border-gray-300"
                }`}>
                  {active && <span className="text-white text-[9px] font-black">✓</span>}
                </div>
              </div>
              <span className={`font-extrabold text-xs leading-tight ${active ? "text-[#F47216]" : "text-gray-700"}`}>{label}</span>
              <span className="text-gray-400 text-[9px] leading-tight mt-0.5 line-clamp-2">{desc}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={save}
        disabled={saving || selected.size === 0}
        className="w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-sm hover:bg-[#F47216] transition-all disabled:opacity-50"
      >
        {saving
          ? t("सेव हो रहा है...", "Saving...")
          : t(`${selected.size} भूमिका${selected.size !== 1 ? "एं" : ""} के साथ जारी रखें →`, `Continue with ${selected.size} role${selected.size !== 1 ? "s" : ""} →`)
        }
      </button>
    </div>
  );
}
