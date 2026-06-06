"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/app/components/ProductCard";
import { createCart, addToCart } from "@/lib/medusa";
import { useLang } from "@/lib/lang";
import { useAuth } from "@/app/context/AuthContext";
import MobileAuthModal from "@/app/components/MobileAuthModal";

function ShoppingInner() {
  const { t } = useLang();
  const { customer } = useAuth();
  const searchParams = useSearchParams();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [query, setQuery] = useState("");
  const [input, setInput] = useState("");
  const [category, setCategory] = useState("");
  const [cartId, setCartId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPostAuthPopup, setShowPostAuthPopup] = useState(false);

  function log(msg: string) {
    const ts = new Date().toISOString().slice(11, 23);
    setLogs(prev => [`[${ts}] [SHOPPING] ${msg}`, ...prev].slice(0, 30));
    console.log(`[SHOPPING] ${msg}`);
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") || "";
    log(`Page loaded. localStorage cart_id=${localStorage.getItem("cart_id") || "none"}`);
    if (q) { setInput(q); setQuery(q); runSearch(q); }
  }, []);

  async function runSearch(term: string) {
    if (!term.trim()) return;
    setLoading(true); setSearched(true); setQuantities({});
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term.trim())}`);
      const data = await res.json();
      setResults(data.products || []);
      log(`Search "${term}" → ${(data.products || []).length} products`);
    } catch (e: any) {
      log(`Search ERROR: ${e.message}`);
      setResults([]);
    }
    setLoading(false);
  }

  function handleQtyChange(variantId: string, qty: number) {
    setQuantities(prev => ({ ...prev, [variantId]: qty }));
  }

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);
  const selectedVariants = Object.entries(quantities).filter(([, q]) => q > 0);

  async function handleGoToCart() {
    if (selectedVariants.length === 0) return;
    if (!customer) {
      log("User not logged in — showing auth modal");
      setShowAuthModal(true);
      return;
    }
    await doAddToCart();
  }

  async function doAddToCart() {
    setAdding(true);
    log(`Adding ${selectedVariants.length} variants to cart...`);

    let id = cartId || localStorage.getItem("cart_id");
    if (!id) {
      const cart = await createCart();
      id = cart?.id;
      if (id) { localStorage.setItem("cart_id", id); setCartId(id); }
      log(`Cart created: ${id}`);
    } else {
      setCartId(id);
    }

    for (const [variantId, qty] of selectedVariants) {
      log(`Adding variant ${variantId} x${qty}...`);
      const result = await addToCart(id!, variantId, qty);
      if (!result) {
        log(`Failed for ${variantId} — creating fresh cart`);
        const cart = await createCart();
        id = cart?.id;
        if (id) { localStorage.setItem("cart_id", id); setCartId(id); }
        await addToCart(id!, variantId, qty);
      }
    }
    setAdding(false);
    log(`Items added. Showing post-cart popup.`);
    setShowPostAuthPopup(true);
  }

  return (
    <div className="min-h-screen bg-[#F47216] pb-24">

      {/* AUTH MODAL */}
      {showAuthModal && (
        <MobileAuthModal onSuccess={() => {
          setShowAuthModal(false);
          log("Auth success — proceeding to add to cart");
          doAddToCart();
        }} />
      )}

      {/* POST-CART POPUP */}
      {showPostAuthPopup && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">🛒</div>
              <h2 className="text-xl font-extrabold text-[#F47216]">{t("टोकरी में जोड़ा गया!", "Added to Cart!")}</h2>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => {
                setShowPostAuthPopup(false);
                const id = localStorage.getItem("cart_id");
                window.location.href = `https://digitalrohtak.online/cart?cart_id=${id}`;
              }}
                className="w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold hover:bg-[#F47216] transition-all">
                ✅ {t("चेकआउट", "Checkout")}
              </button>
              <button onClick={() => setShowPostAuthPopup(false)}
                className="w-full border-2 border-[#F47216] text-[#F47216] py-3 rounded-xl font-bold hover:bg-[#F47216] hover:text-white transition-all">
                🔍 {t("उसी खोज जारी रखें", "Continue with same results")}
              </button>
              <button onClick={() => {
                setShowPostAuthPopup(false);
                setResults([]); setSearched(false); setQuery(""); setInput(""); setQuantities({});
              }}
                className="w-full border-2 border-gray-300 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all">
                🔎 {t("नई खोज करें", "New Search")}
              </button>
            </div>
          </div>
        </div>
      )}
      {process.env.NODE_ENV === "development" && logs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 text-green-400 font-mono text-xs p-3 max-h-48 overflow-y-auto border-t-2 border-green-500">
          <div className="flex justify-between items-center mb-1">
            <span className="text-green-300 font-bold">🛒 SHOPPING PAGE — DEBUG TRACE</span>
            <button onClick={() => setLogs([])} className="text-red-400 text-xs">✕ clear</button>
          </div>
          {logs.map((l, i) => <div key={i} className="leading-5">{l}</div>)}
        </div>
      )}

      <div className="bg-[#F47216] px-3 pt-2 pb-2 sticky top-0 z-30 shadow-md">
        <form onSubmit={e => { e.preventDefault(); setQuery(input); runSearch(input); }}
          className="flex gap-1.5 max-w-4xl mx-auto items-center">
          <select value={category} onChange={e => {
            setCategory(e.target.value);
            const cats: Record<string,string[]> = {
              fashion:["shirt","t-shirt","sweatshirt","pants","shorts","jacket","dress"],
              electronics:["phone","laptop","tablet","headphone","charger","speaker"],
              food:["rice","wheat","spice","oil","sugar","tea","coffee","snack","dal"],
              beauty:["cream","shampoo","soap","perfume","makeup","serum"],
              home:["furniture","lamp","chair","table","sofa","bed","curtain"],
              sports:["gym","yoga","cricket","football","dumbbell","fitness"],
              health:["vitamin","supplement","protein","medicine","yoga"],
              books:["book","notebook","pen","pencil","diary"],
              toys:["toy","game","puzzle","doll","board game"],
              jewelry:["ring","necklace","bracelet","earring","watch"],
            };
            const kw = cats[e.target.value]?.[0];
            if (kw) { setInput(kw); }
          }}
            className="bg-white rounded-xl px-2 py-2 text-xs font-semibold outline-none text-gray-700 w-2/5 sm:w-44 shrink-0">
            <option value="">{t("— श्रेणी —", "— Category —")}</option>
            <option value="fashion">{t("कपड़े", "Fashion")}</option>
            <option value="electronics">{t("इलेक्ट्रॉनिक्स", "Electronics")}</option>
            <option value="food">{t("खाना", "Food")}</option>
            <option value="beauty">{t("सौंदर्य", "Beauty")}</option>
            <option value="home">{t("घर", "Home")}</option>
            <option value="sports">{t("खेल", "Sports")}</option>
            <option value="health">{t("स्वास्थ्य", "Health")}</option>
            <option value="books">{t("किताबें", "Books")}</option>
            <option value="toys">{t("खिलौने", "Toys")}</option>
            <option value="jewelry">{t("गहने", "Jewelry")}</option>
          </select>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t("खोजें...", "Search...")}
            className="flex-1 min-w-0 bg-white rounded-xl px-2 py-2 text-xs text-gray-800 outline-none"
          />
          <button type="submit"
            className="bg-[#00A650] text-white px-3 py-2 rounded-xl font-bold text-xs shrink-0 hover:bg-white hover:text-[#00A650] transition-colors">
            {t("खोजें", "Go")}
          </button>
          {cartId && (
            <a href={`https://digitalrohtak.online/cart?cart_id=${cartId}`}
              className="relative bg-white text-[#F47216] px-3 py-2 rounded-xl font-bold text-xs shrink-0 hover:bg-[#00A650] hover:text-white transition-colors">
              🛒 {totalItems > 0 && <span className="absolute -top-1 -right-1 bg-[#F47216] text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-extrabold">{totalItems}</span>}
            </a>
          )}
        </form>
      </div>

      <div className="px-2 pt-2">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <div className="w-5 h-5 border-4 border-white border-t-[#00A650] rounded-full animate-spin"></div>
            <span className="text-white text-sm font-semibold">{t("खोज रहे हैं...", "Searching...")}</span>
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && (
          <div className="bg-white rounded-xl p-5 text-center mt-2">
            <p className="text-[#F47216] font-bold">🔍 {t(`"${query}" नहीं मिला`, `No results for "${query}"`)}</p>
          </div>
        )}

        {/* Results count */}
        {!loading && results.length > 0 && (
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-white text-xs font-semibold">{results.length} {t("परिणाम", "results")} — "{query}"</p>
            <button onClick={() => { setResults([]); setSearched(false); setQuery(""); setInput(""); setQuantities({}); }}
              className="text-white/70 text-xs underline">{t("साफ करें", "Clear")}</button>
          </div>
        )}

        {/* Product grid — 2 col mobile, 3 col sm, 4 col md+ */}
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
            {results.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => {}}
                quantities={quantities}
                onQtyChange={handleQtyChange}
              />
            ))}
          </div>
        )}

        {/* Initial state */}
        {!loading && !searched && (
          <p className="text-center text-white/70 text-sm py-10">
            {t("ऊपर खोजें", "Search above to find products")}
          </p>
        )}
      </div>

      {/* ── Sticky cart bar ── */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3">
          <button
            onClick={handleGoToCart}
            disabled={adding}
            className="w-full bg-[#00A650] text-white py-3.5 rounded-2xl font-extrabold text-base shadow-2xl flex items-center justify-between px-5 disabled:opacity-70">
            <span className="bg-white text-[#00A650] rounded-full w-7 h-7 flex items-center justify-center font-extrabold text-sm">
              {totalItems}
            </span>
            <span>{adding ? t("जोड़ रहे हैं...", "Adding...") : t("टोकरी देखें →", "View Cart →")}</span>
            <span className="text-white/80 text-sm">
              ₹{results.reduce((total, p) => {
                return total + (p.variants || []).reduce((s: number, v: any) => {
                  const q = quantities[v.id] || 0;
                  const amt = v.prices?.[0]?.amount || 0;
                  return s + q * amt / 100;
                }, 0);
              }, 0).toFixed(0)}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ShoppingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-white border-t-[#00A650] rounded-full animate-spin"></div>
      </div>
    }>
      <ShoppingInner />
    </Suspense>
  );
}
