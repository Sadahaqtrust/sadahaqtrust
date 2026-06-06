"use client";
import { useLang } from "@/lib/lang";
import UnifiedFoodSearch from "@/components/food/UnifiedFoodSearch";

export default function FoodPage() {
  const { t } = useLang();

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <div className="bg-[#F47216] px-4 pt-6 pb-8 relative">
        {/* Top-right: Add a Restaurant CTA */}
        <a
          href="/food/register"
          className="absolute top-3 right-3 md:top-4 md:right-4 bg-white text-[#F47216] px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-extrabold text-[11px] md:text-xs shadow-md hover:bg-[#00A650] hover:text-white transition-all flex items-center gap-1"
        >
          <span className="text-sm md:text-base leading-none">＋</span>
          <span className="whitespace-nowrap">
            {t("रेस्तरां जोड़ें", "Add a Restaurant")}
          </span>
        </a>

        <div className="max-w-2xl mx-auto text-center pt-4 md:pt-2">
          <div className="text-4xl mb-1">🍽️</div>
          <h1 className="text-2xl font-extrabold text-white mb-1">
            {t("रोहतक फूड", "Rohtak Food")}
          </h1>
          <p className="text-white/80 text-sm">
            {t(
              "एक ही जगह — रेस्तरां, डिश, या पास के विकल्प खोजें",
              "One search — find restaurants, dishes, or options near you",
            )}
          </p>
        </div>
      </div>

      {/* Single unified search bar + results */}
      <UnifiedFoodSearch />
    </div>
  );
}
