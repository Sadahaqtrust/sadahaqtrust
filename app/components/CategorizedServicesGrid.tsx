"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang";

type Service = { id: string; label_hi: string; label_en: string; icon: string; url: string };
type Category = {
  id: string;
  name_hi: string;
  name_en: string;
  icon: string;
  color: string;
  sort_order: number;
  services: Service[];
};

export default function CategorizedServicesGrid() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLang();

  useEffect(() => {
    fetch("/api/merged-services", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        const cats = (data.categories || []).sort(
          (a: Category, b: Category) => a.sort_order - b.sort_order
        );
        setCategories(cats);
        const allOpen: Record<string, boolean> = {};
        cats.forEach((c: Category) => { allOpen[c.id] = true; });
        setExpanded(allOpen);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggle = (catId: string) => setExpanded(e => ({ ...e, [catId]: !e[catId] }));
  const toggleAll = () => {
    const allOpen = Object.values(expanded).every(v => v);
    const newState: Record<string, boolean> = {};
    categories.forEach(c => { newState[c.id] = !allOpen; });
    setExpanded(newState);
  };

  const matchService = (s: Service, q: string) =>
    s.label_hi.toLowerCase().includes(q) || s.label_en.toLowerCase().includes(q);

  const filtered = search.trim()
    ? categories.map(cat => ({
        ...cat,
        services: cat.services.filter(s => matchService(s, search.toLowerCase())),
      })).filter(cat => cat.services.length > 0)
    : categories;

  const total = categories.reduce((sum, c) => sum + c.services.length, 0);
  const allExpanded = categories.length > 0 && Object.values(expanded).every(v => v);

  if (loading) {
    return (
      <section className="w-full px-3 py-8">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🔄</div>
          <p className="text-white/80 font-semibold text-sm">{t("लोड हो रहा है...", "Loading...")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full px-3 py-3">
      {/* Search bar */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("सेवाएं खोजें...", "Search services...")}
          className="w-full pl-9 pr-10 py-2.5 rounded-xl border-2 border-white/30 bg-white/20 text-white placeholder-white/60 font-semibold text-sm focus:outline-none focus:border-white focus:bg-white/30"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white font-bold">✕</button>
        )}
      </div>

      {/* Stats + Expand/Collapse */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-white/70 text-[11px] font-semibold">
          {total} {t("सेवाएं", "services")} · {categories.length} {t("श्रेणियां", "categories")}
        </p>
        <button onClick={toggleAll}
          className="text-white/90 text-[11px] font-bold bg-white/15 px-3 py-1 rounded-lg hover:bg-white/25 transition">
          {allExpanded ? t("सब बंद", "Collapse") : t("सब खोलें", "Expand")}
        </button>
      </div>

      {/* Categories accordion */}
      <div className="space-y-2">
        {filtered.map(cat => {
          const isOpen = !!expanded[cat.id];
          const catName = lang === "hi" ? cat.name_hi : cat.name_en;
          return (
            <div key={cat.id} className="rounded-2xl overflow-hidden border border-white/20 bg-white/5">
              <button
                onClick={() => toggle(cat.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="text-left">
                    <span className="font-extrabold text-white text-sm block">{catName}</span>
                    <span className="text-white/50 text-[10px]">{cat.services.length} {t("सेवाएं", "services")}</span>
                  </div>
                </div>
                <div className={`w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4L6 8L10 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>

              {isOpen && (
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-3 gap-2">
                    {cat.services.map(svc => {
                      const label = lang === "hi" ? svc.label_hi : svc.label_en;
                      return (
                        <a key={svc.id} href={svc.url}
                          className="flex flex-col items-center justify-center bg-white rounded-xl py-2.5 px-1 shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-95 transition-all">
                          <span className="text-2xl mb-0.5">{svc.icon}</span>
                          <span className="text-[#F47216] font-bold text-[10px] text-center leading-tight px-0.5 line-clamp-2">{label}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!loading && filtered.length === 0 && search && (
        <div className="text-center text-white/70 py-10 text-sm">
          {t("कोई सेवा नहीं मिली", "No services found")} &quot;{search}&quot;
        </div>
      )}
    </section>
  );
}
