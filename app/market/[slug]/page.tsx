"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang";
import { MARKETS } from "@/app/components/MarketsGrid";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";

type Shop = {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, string>;
};

export default function MarketLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useLang();
  const router = useRouter();

  const market = MARKETS.find(m => m.slug === slug);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!market) return;
    // Use the Next.js API route to avoid exposing admin token client-side
    fetch(`/api/market-shops?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(data => { setShops(data.shops || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, market]);

  if (!market) {
    return (
      <div className="min-h-screen bg-[#F47216] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-bold text-gray-600">{t("बाज़ार नहीं मिला", "Market not found")}</p>
          <button onClick={() => router.back()} className="mt-4 text-[#F47216] font-bold text-sm">← {t("वापस", "Back")}</button>
        </div>
      </div>
    );
  }

  const label = lang === "hi" ? market.name_hi : market.name_en;

  const filtered = search.trim()
    ? shops.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.metadata?.category || "").toLowerCase().includes(search.toLowerCase())
      )
    : shops;

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header — same pattern as food/page.tsx */}
      <div className="bg-[#F47216] px-4 pt-6 pb-8 relative">
        <button
          onClick={() => router.back()}
          className="absolute top-3 left-3 bg-white/20 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-white/30 transition-all"
        >
          ← {t("वापस", "Back")}
        </button>

        <a
          href={`/market/${slug}/register`}
          className="absolute top-3 right-3 bg-white text-[#F47216] px-3 py-1.5 rounded-xl font-extrabold text-[11px] shadow-md hover:bg-[#00A650] hover:text-white transition-all flex items-center gap-1"
        >
          <span className="text-sm leading-none">＋</span>
          <span className="whitespace-nowrap">{t("दुकान जोड़ें", "Add Your Shop")}</span>
        </a>

        <div className="max-w-2xl mx-auto text-center pt-4">
          <div className="text-4xl mb-1">{market.icon}</div>
          <h1 className="text-xl font-extrabold text-white mb-1">{label}</h1>
          <p className="text-white/80 text-xs">
            📍 {market.area} · {t("रोहतक, हरियाणा", "Rohtak, Haryana")}
          </p>
        </div>
      </div>

      {/* Search + shop list */}
      <div className="px-4 py-4 max-w-2xl mx-auto">
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("दुकान या श्रेणी खोजें...", "Search shops or category...")}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-[#F47216]/30 bg-white text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:border-[#F47216]"
          />
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2 animate-pulse">🏪</div>
            <p className="text-sm font-semibold">{t("लोड हो रहा है...", "Loading shops...")}</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🏪</div>
            <p className="font-extrabold text-gray-700 text-base mb-1">
              {t("अभी कोई दुकान नहीं", "No shops yet")}
            </p>
            <p className="text-gray-500 text-sm mb-5">
              {t("इस बाज़ार में पहली दुकान जोड़ें!", "Be the first to add your shop in this market!")}
            </p>
            <a
              href={`/market/${slug}/register`}
              className="inline-block bg-[#F47216] text-white px-6 py-3 rounded-xl font-extrabold text-sm hover:bg-[#00A650] transition-all shadow-md"
            >
              ＋ {t("दुकान जोड़ें", "Add Your Shop")}
            </a>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            <p className="text-gray-500 text-xs font-semibold mb-3">
              {filtered.length} {t("दुकानें", "shops")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(shop => (
                <button key={shop.id}
                  onClick={() => router.push(`/market/${slug}/shop/${shop.id}`)}
                  className="bg-white rounded-2xl shadow-sm border border-[#F47216]/20 p-3 hover:shadow-md transition-all text-left active:scale-95">
                  <div className="text-2xl mb-1">{shop.metadata?.icon || "🏪"}</div>
                  <div className="font-extrabold text-gray-800 text-sm leading-tight line-clamp-2">{shop.name}</div>
                  {shop.metadata?.category && (
                    <span className="inline-block mt-1.5 bg-[#FFF3E0] text-[#F47216] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#F47216]/30">
                      {shop.metadata.category}
                    </span>
                  )}
                  {shop.metadata?.mobile && (
                    <p className="text-gray-500 text-[10px] mt-1">📱 {shop.metadata.mobile}</p>
                  )}
                  {shop.metadata?.opening_time && (
                    <p className="text-gray-400 text-[10px]">🕐 {shop.metadata.opening_time} – {shop.metadata.closing_time}</p>
                  )}
                  <p className="text-[#F47216] text-[10px] font-bold mt-1.5">View Catalog →</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
