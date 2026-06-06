"use client";
import { useState } from "react";
import HomepageHero from "./components/HomepageHero";
import CategorizedServicesGrid from "./components/CategorizedServicesGrid";
import MarketsGrid from "./components/MarketsGrid";
import { useLang } from "@/lib/lang";

export default function HomePage() {
  const [tab, setTab] = useState<"services" | "markets">("services");
  const { t } = useLang();

  return (
    <div className="max-w-lg mx-auto w-full">
      <HomepageHero />

      {/* Tab switcher */}
      <div className="flex mx-3 mb-1 bg-white/15 rounded-xl p-1 gap-1">
        <button
          onClick={() => setTab("services")}
          className={`flex-1 py-2 rounded-lg text-sm font-extrabold transition-all ${
            tab === "services"
              ? "bg-white text-[#F47216] shadow"
              : "text-white/80 hover:text-white"
          }`}
        >
          ⚙️ {t("सेवाएं", "Services")}
        </button>
        <button
          onClick={() => setTab("markets")}
          className={`flex-1 py-2 rounded-lg text-sm font-extrabold transition-all ${
            tab === "markets"
              ? "bg-white text-[#F47216] shadow"
              : "text-white/80 hover:text-white"
          }`}
        >
          🏪 {t("बाज़ार", "Markets")}
        </button>
      </div>

      {tab === "services" ? <CategorizedServicesGrid /> : <MarketsGrid />}
    </div>
  );
}
