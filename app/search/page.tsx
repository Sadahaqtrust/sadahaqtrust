"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { createCart, addToCart } from "@/lib/medusa";
import ProductCard from "../components/ProductCard";
import { useLang } from "@/lib/lang";
import MobileAuthModal from "@/app/components/MobileAuthModal";

// Google Business Categories — hardcoded, do not change without instruction
const CATEGORIES: { label: string; keyword: string }[] = [
  { label: "— Select Category —", keyword: "" },
  { label: "Apparel & Fashion", keyword: "shirt" },
  { label: "Apparel & Fashion — For Men", keyword: "men shirt" },
  { label: "Apparel & Fashion — For Women", keyword: "women dress" },
  { label: "Apparel & Fashion — For Kids", keyword: "kids clothes" },
  { label: "Apparel & Fashion — Footwear for Men", keyword: "men shoes" },
  { label: "Apparel & Fashion — Footwear for Women", keyword: "women shoes" },
  { label: "Apparel & Fashion — Footwear for Kids", keyword: "kids shoes" },
  { label: "Apparel & Fashion — Accessories", keyword: "belt" },
  { label: "Automotive", keyword: "car" },
  { label: "Automotive — Auto Parts", keyword: "engine" },
  { label: "Automotive — Motorcycles", keyword: "bike" },
  { label: "Beauty & Personal Care", keyword: "cream" },
  { label: "Beauty & Personal Care — Skin Care for Women", keyword: "face cream" },
  { label: "Beauty & Personal Care — Skin Care for Men", keyword: "men face wash" },
  { label: "Beauty & Personal Care — Hair Care", keyword: "shampoo" },
  { label: "Beauty & Personal Care — Fragrances for Men", keyword: "men perfume" },
  { label: "Beauty & Personal Care — Fragrances for Women", keyword: "women perfume" },
  { label: "Books & Stationery", keyword: "book" },
  { label: "Books & Stationery — Educational", keyword: "textbook" },
  { label: "Computers & Electronics", keyword: "laptop" },
  { label: "Computers & Electronics — Mobile Phones", keyword: "smartphone" },
  { label: "Computers & Electronics — Computers", keyword: "laptop" },
  { label: "Computers & Electronics — Audio", keyword: "headphone" },
  { label: "Computers & Electronics — Cameras", keyword: "camera" },
  { label: "Food & Grocery", keyword: "rice" },
  { label: "Food & Grocery — Beverages", keyword: "tea" },
  { label: "Food & Grocery — Organic & Herbal", keyword: "organic" },
  { label: "Health & Fitness", keyword: "vitamin" },
  { label: "Health & Fitness — Vitamins & Supplements", keyword: "protein" },
  { label: "Health & Fitness — Medical Supplies", keyword: "thermometer" },
  { label: "Home & Garden", keyword: "furniture" },
  { label: "Home & Garden — Furniture", keyword: "sofa" },
  { label: "Home & Garden — Kitchen", keyword: "cookware" },
  { label: "Home & Garden — Bedding", keyword: "pillow" },
  { label: "Home & Garden — Garden", keyword: "plant" },
  { label: "Jewelry & Watches", keyword: "ring" },
  { label: "Jewelry & Watches — For Women", keyword: "women necklace" },
  { label: "Jewelry & Watches — For Men", keyword: "men watch" },
  { label: "Jewelry & Watches — Fine Jewelry", keyword: "gold" },
  { label: "Luggage & Bags", keyword: "bag" },
  { label: "Pet Supplies", keyword: "dog food" },
  { label: "Religious & Ceremonial", keyword: "pooja" },
  { label: "Sporting Goods", keyword: "gym" },
  { label: "Sporting Goods — Cricket", keyword: "cricket bat" },
  { label: "Sporting Goods — Fitness Equipment", keyword: "dumbbell" },
  { label: "Sporting Goods — For Men", keyword: "men gym wear" },
  { label: "Sporting Goods — For Women", keyword: "women yoga pants" },
  { label: "Toys & Games", keyword: "toy" },
  { label: "Toys & Games — For Boys", keyword: "car toy" },
  { label: "Toys & Games — For Girls", keyword: "doll" },
  { label: "Toys & Games — Baby & Infant", keyword: "rattle" },
];

function SearchPageInner() {
  const { t } = useLang();
  const { customer } = useAuth();
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPostCartPopup, setShowPostCartPopup] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  function log(msg: string) {
    const ts = new Date().toISOString().slice(11, 23);
    setLogs(prev => [`[${ts}] [SEARCH] ${msg}`, ...prev].slice(0, 40));
    console.log(`[SEARCH] ${msg}`);
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") || "";
    log(`Page loaded. q=${q || "none"}, cart_id=${localStorage.getItem("cart_id") || "none"}`);
    if (q) { setQuery(q); runSearch(q); }
  }, []);

  async function runSearch(term: string) {
    if (!term.trim()) return;
    setLoading(true); setSearched(true); setQuantities({});
    log(`Searching: "${term}"`);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term.trim())}`);
      const data = await res.json();
      setResults(data.products || []);
      log(`Results: ${(data.products || []).length} products`);
    } catch (e: any) {
      log(`Search ERROR: ${e.message}`);
      setResults([]);
    }
    setLoading(false);
  }

  function handleCategoryChange(val: string) {
    setCategory(val);
    const cat = CATEGORIES.find(c => c.label === val);
    if (cat?.keyword) setQuery(cat.keyword);
    log(`Category: ${val}`);
  }

  function handleQtyChange(variantId: string, qty: number) {
    setQuantities(prev => ({ ...prev, [variantId]: qty }));
  }

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
  const selectedVariants = Object.entries(quantities).filter(([, q]) => q > 0);

  async function handleGoToCart() {
    if (!selectedVariants.length) return;
    if (!customer) { log("Not logged in — showing auth modal"); setShowAuthModal(true); return; }
    await doAddToCart();
  }

  async function doAddToCart() {
    setAdding(true);
    let id = cartId || localStorage.getItem("cart_id");
    if (!id) {
      const cart = await createCart();
      id = cart?.id;
      if (id) { localStorage.setItem("cart_id", id); setCartId(id); }
      log(`Cart created: ${id}`);
    } else { setCartId(id); }

    for (const [variantId, qty] of selectedVariants) {
      log(`Adding variant ${variantId} x${qty}`);
      const result = await addToCart(id!, variantId, qty);
      if (!result) {
        const cart = await createCart();
        id = cart?.id;
        if (id) { localStorage.setItem("cart_id", id); setCartId(id); }
        await addToCart(id!, variantId, qty);
      }
    }
    setAdding(false);
    log("Items added — showing popup");
    setShowPostCartPopup(true);
  }

  return (
    <div className="min-h-screen bg-[#F47216] pb-24">

      {showAuthModal && (
        <MobileAuthModal onSuccess={() => { setShowAuthModal(false); doAddToCart(); }} />
      )}

      {showPostCartPopup && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">🛒</div>
              <h2 className="text-xl font-extrabold text-[#F47216]">{t("टोकरी में जोड़ा गया!", "Added to Cart!")}</h2>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setShowPostCartPopup(false); window.location.href = `https://digitalrohtak.online/cart?cart_id=${localStorage.getItem("cart_id")}`; }}
                className="w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold hover:bg-[#F47216] transition-all">
                ✅ {t("चेकआउट", "Checkout")}
              </button>
              <button onClick={() => setShowPostCartPopup(false)}
                className="w-full border-2 border-[#F47216] text-[#F47216] py-3 rounded-xl font-bold hover:bg-[#F47216] hover:text-white transition-all">
                🔍 {t("उसी खोज जारी रखें", "Continue with same results")}
              </button>
              <button onClick={() => { setShowPostCartPopup(false); setResults([]); setSearched(false); setQuery(""); setCategory(""); setQuantities({}); }}
                className="w-full border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all">
                🔎 {t("नई खोज करें", "New Search")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEBUG PANEL */}
      {logs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 text-green-400 font-mono text-xs p-3 max-h-48 overflow-y-auto border-t-2 border-green-500">
          <div className="flex justify-between items-center mb-1">
            <span className="text-green-300 font-bold">🔍 SEARCH PAGE — DEBUG TRACE</span>
            <button onClick={() => setLogs([])} className="text-red-400 text-xs">✕ clear</button>
          </div>
          {logs.map((l, i) => <div key={i} className="leading-5">{l}</div>)}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 pt-3">

        {/* Search form */}
        <form onSubmit={e => { e.preventDefault(); runSearch(query); }} className="bg-white rounded-2xl shadow-xl p-3 mb-3">
          <div className="flex gap-2 items-center">
            <select value={category} onChange={e => handleCategoryChange(e.target.value)}
              className="w-2/5 border-2 border-[#F47216] rounded-xl px-2 py-2 text-gray-700 text-xs font-semibold focus:outline-none focus:border-[#00A650] bg-white shrink-0">
              {CATEGORIES.map(cat => (
                <option key={cat.label} value={cat.label}>{cat.label}</option>
              ))}
            </select>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder={t("खोजें...", "Search...")}
              className="flex-1 min-w-0 border-2 border-[#00A650] rounded-xl px-2 py-2 text-xs text-gray-700 focus:outline-none focus:border-[#F47216]" />
            <button type="submit"
              className="bg-[#00A650] text-white px-3 py-2 rounded-xl font-bold text-xs shrink-0 hover:bg-[#F47216] transition-colors">
              🔍
            </button>
          </div>
          {loading && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-4 h-4 border-2 border-[#F47216] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[#F47216] text-xs font-semibold">{t("खोज रहे हैं...", "Searching...")}</span>
            </div>
          )}
        </form>

        {/* Results header */}
        {!loading && searched && (
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-white text-xs font-semibold">
              {results.length > 0 ? `${results.length} ${t("परिणाम", "results")} — "${query}"` : `"${query}" — ${t("कोई परिणाम नहीं", "No results found")}`}
            </p>
            <button onClick={() => { setResults([]); setSearched(false); setQuery(""); setCategory(""); setQuantities({}); }}
              className="text-white/70 text-xs underline">{t("साफ करें", "Clear")}</button>
          </div>
        )}

        {/* Product grid */}
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
            {results.map(product => (
              <ProductCard key={product.id} product={product}
                onAddToCart={() => {}} quantities={quantities} onQtyChange={handleQtyChange} />
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="bg-white rounded-xl p-5 text-center">
            <p className="text-[#F47216] font-bold">🔍 {t(`"${query}" के लिए कोई उत्पाद नहीं मिला`, `No products found for "${query}"`)}</p>
            <p className="text-gray-400 text-xs mt-1">{t("कोई अलग शब्द आज़माएं", "Try a different search term")}</p>
          </div>
        )}

        {!searched && (
          <p className="text-center text-white/70 text-sm py-10">
            {t("श्रेणी चुनें या खोजें", "Select a category or search above")}
          </p>
        )}
      </div>

      {/* Sticky cart bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3">
          <button onClick={handleGoToCart} disabled={adding}
            className="w-full bg-[#00A650] text-white py-3.5 rounded-2xl font-extrabold text-base shadow-2xl flex items-center justify-between px-5 disabled:opacity-70">
            <span className="bg-white text-[#00A650] rounded-full w-7 h-7 flex items-center justify-center font-extrabold text-sm">{totalItems}</span>
            <span>{adding ? t("जोड़ रहे हैं...", "Adding...") : t("टोकरी देखें →", "View Cart →")}</span>
            <span className="text-white/80 text-sm">
              ₹{results.reduce((total, p) => total + (p.variants || []).reduce((s: number, v: any) => s + (quantities[v.id] || 0) * (v.prices?.[0]?.amount || 0) / 100, 0), 0).toFixed(0)}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[300px]"><div className="w-8 h-8 border-4 border-white border-t-[#00A650] rounded-full animate-spin"></div></div>}>
      <SearchPageInner />
    </Suspense>
  );
}
