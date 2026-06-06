"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang";
import Link from "next/link";

interface FruitProduct {
  id: string;
  title: string;
  subtitle: string | null;
  handle: string;
  metadata: {
    fruit_type?: string;
    season?: string;
    origin_state?: string;
  };
}

interface Category {
  id: string;
  name: string;
  handle: string;
}

export default function FruitsPage() {
  const { t } = useLang();
  const [products, setProducts] = useState<FruitProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [customerType, setCustomerType] = useState<"retail" | "wholesale">("retail");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fruits/products")
      .then((r) => r.json())
      .then((data) => {
        if (data.products) setProducts(data.products);
        if (data.categories) setCategories(data.categories);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "whole") return !p.handle.startsWith("chopped-");
    if (activeCategory === "chopped") return p.handle.startsWith("chopped-") || ["mixed-fruit-bowl", "pomegranate-arils", "coconut-water-pack", "fruit-salad-pack"].includes(p.handle);
    return true;
  });

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <div className="bg-[#00A650] px-4 pt-6 pb-8">
        <div className="max-w-2xl mx-auto text-center pt-2">
          <div className="text-4xl mb-1">🍎</div>
          <h1 className="text-2xl font-extrabold text-white mb-1">
            {t("रोहतक फ्रूट्स", "Rohtak Fruits")}
          </h1>
          <p className="text-white/80 text-sm">
            {t(
              "ताज़े फल — साबुत या कटे हुए — रिटेल और होलसेल",
              "Fresh fruits — whole or chopped — retail & wholesale"
            )}
          </p>
        </div>
      </div>

      {/* Customer type toggle */}
      <div className="px-4 py-3 bg-white border-b sticky top-0 z-10">
        <div className="flex gap-2 justify-center max-w-sm mx-auto">
          <button
            onClick={() => setCustomerType("retail")}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
              customerType === "retail"
                ? "bg-[#00A650] text-white shadow"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            🛒 {t("रिटेल", "Retail")}
            <span className="block text-[10px] font-normal opacity-70">500gm · 1kg · 2kg · 5kg</span>
          </button>
          <button
            onClick={() => setCustomerType("wholesale")}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all ${
              customerType === "wholesale"
                ? "bg-[#F47216] text-white shadow"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            📦 {t("होलसेल", "Wholesale")}
            <span className="block text-[10px] font-normal opacity-70">10kg · 25kg · 50kg · Box · Crate</span>
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-4 py-2 bg-white border-b">
        <div className="flex gap-2 overflow-x-auto max-w-lg mx-auto">
          {[
            { key: "all", label: t("सभी", "All"), icon: "🍇" },
            { key: "whole", label: t("साबुत फल", "Whole Fruits"), icon: "🥭" },
            { key: "chopped", label: t("कटे/पैक", "Chopped & Packed"), icon: "🥗" },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeCategory === cat.key
                  ? "bg-[#00A650] text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="text-center py-12 text-gray-400 font-semibold">
            {t("लोड हो रहा है...", "Loading...")}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 font-semibold">
            {t("कोई फल नहीं मिला", "No fruits found")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
              >
                <div className="bg-gradient-to-br from-green-50 to-yellow-50 p-4 text-center">
                  <span className="text-3xl">
                    {getFruitEmoji(product.metadata?.fruit_type)}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm text-gray-900 leading-tight">
                    {product.title}
                  </h3>
                  {product.subtitle && (
                    <p className="text-[10px] text-gray-500 mt-0.5">{product.subtitle}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {product.metadata?.season && (
                      <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
                        {product.metadata.season}
                      </span>
                    )}
                    {product.metadata?.origin_state && (
                      <span className="text-[9px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">
                        {product.metadata.origin_state}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-[10px] text-gray-400">
                    {customerType === "retail"
                      ? "500gm · 1kg · 2kg · 5kg"
                      : "10kg · 25kg · 50kg · Box · Crate"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getFruitEmoji(fruitType?: string): string {
  const map: Record<string, string> = {
    Mango: "🥭",
    Banana: "🍌",
    Apple: "🍎",
    Papaya: "🍈",
    Guava: "🍐",
    Pomegranate: "🫐",
    Watermelon: "🍉",
    Muskmelon: "🍈",
    Grapes: "🍇",
    Orange: "🍊",
    "Sweet Lime": "🍋",
    Lemon: "🍋",
    Kinnow: "🍊",
    Coconut: "🥥",
    Pineapple: "🍍",
    Sapota: "🫒",
    "Custard Apple": "🍏",
    Jackfruit: "🍈",
    Litchi: "🍒",
    Jamun: "🫐",
    Pear: "🍐",
    Plum: "🍑",
    Ber: "🫒",
    Amla: "🟢",
    Mixed: "🥗",
  };
  return map[fruitType || ""] || "🍎";
}
