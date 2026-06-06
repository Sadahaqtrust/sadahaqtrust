"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang";
import { MARKETS } from "@/app/components/MarketsGrid";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "";

type Price = { amount: number; currency_code: string };
type Variant = { id: string; title: string; calculated_price?: { calculated_amount: number }; prices?: Price[] };
type Product = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnail: string;
  categories: { id: string; name: string }[];
  variants: Variant[];
  metadata: Record<string, string>;
};
type CartItem = { product: Product; qty: number };

function getPrice(v: Variant): number {
  if (v.calculated_price?.calculated_amount) return v.calculated_price.calculated_amount;
  if (v.prices?.length) return v.prices[0].amount;
  return 0;
}

function fmt(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

type ShopMeta = {
  name: string;
  mobile?: string;
  category?: string;
  opening_time?: string;
  closing_time?: string;
  address?: string;
  icon?: string;
};

export default function ShopCatalogPage() {
  const { slug, shopId } = useParams<{ slug: string; shopId: string }>();
  const { t } = useLang();
  const router = useRouter();

  const market = MARKETS.find(m => m.slug === slug);
  const [products, setProducts] = useState<Product[]>([]);
  const [shopMeta, setShopMeta] = useState<ShopMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Load shop metadata from market-shops API
    fetch(`/api/market-shops?shopId=${encodeURIComponent(shopId)}`)
      .then(r => r.json())
      .then(d => { if (d.shop) setShopMeta(d.shop); })
      .catch(() => {});

    fetch(
      `${MEDUSA_URL}/store/products?sales_channel_id[]=${shopId}&limit=50&fields=id,title,subtitle,description,thumbnail,categories,variants,variants.prices,metadata`,
      { headers: { "x-publishable-api-key": PK } }
    )
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [shopId]);

  const categories = ["All", ...Array.from(new Set(products.flatMap(p => p.categories?.map(c => c.name) || [])))];

  const filtered = products.filter(p => {
    const matchCat = activeCategory === "All" || p.categories?.some(c => c.name === activeCategory);
    const matchSearch = !search.trim() || p.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, qty: i.qty + delta } : i)
      .filter(i => i.qty > 0)
    );
  }

  const cartTotal = cart.reduce((sum, i) => sum + getPrice(i.product.variants[0]) * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <div className="bg-[#F47216] px-4 pt-5 pb-6 relative">
        <button onClick={() => router.back()}
          className="absolute top-3 left-3 bg-white/20 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-white/30 transition-all">
          ← {t("वापस", "Back")}
        </button>

        {/* Cart button */}
        {cartCount > 0 && (
          <button onClick={() => setShowCart(true)}
            className="absolute top-3 right-3 bg-white text-[#F47216] px-3 py-1.5 rounded-xl font-extrabold text-xs shadow-md flex items-center gap-1">
            🛒 {cartCount} · {fmt(cartTotal)}
          </button>
        )}

        <div className="text-center pt-4">
          <div className="text-3xl mb-1">{shopMeta?.icon || "🏪"}</div>
          <h1 className="text-xl font-extrabold text-white">{shopMeta?.name || t("दुकान", "Shop")}</h1>
          <p className="text-white/80 text-xs mt-0.5">
            📍 {market?.name_en || "Market"} · Rohtak
          </p>
          {shopMeta && (
            <div className="flex justify-center gap-2 mt-2 flex-wrap">
              {shopMeta.opening_time && (
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  🕐 {shopMeta.opening_time}–{shopMeta.closing_time}
                </span>
              )}
              {shopMeta.mobile && (
                <a href={`tel:+91${shopMeta.mobile}`}
                  className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  📱 {shopMeta.mobile}
                </a>
              )}
              <span className="bg-[#00A650] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">🟢 {t("खुला", "Open")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("उत्पाद खोजें...", "Search products...")}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-[#F47216]/30 bg-white text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:border-[#F47216]" />
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 ${
              activeCategory === cat
                ? "bg-[#F47216] text-white shadow"
                : "bg-white text-gray-600 border border-gray-200"
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div className="px-4 pb-24">
        {loading && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2 animate-pulse">📺</div>
            <p className="text-sm">{t("लोड हो रहा है...", "Loading products...")}</p>
          </div>
        )}

        {!loading && (
          <>
            <p className="text-gray-500 text-xs font-semibold mb-3">{filtered.length} {t("उत्पाद", "products")}</p>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(product => {
                const variant = product.variants?.[0];
                const price = variant ? getPrice(variant) : 0;
                const inCart = cart.find(i => i.product.id === product.id);
                return (
                  <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    {/* Product image */}
                    <div className="bg-gray-50 aspect-[4/3] flex items-center justify-center overflow-hidden">
                      {product.thumbnail
                        ? <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                        : <span className="text-4xl">📺</span>
                      }
                    </div>

                    <div className="p-3 flex flex-col flex-1">
                      {/* Category badge */}
                      {product.categories?.[0] && (
                        <span className="text-[9px] font-bold text-[#F47216] bg-[#FFF3E0] px-1.5 py-0.5 rounded-full self-start mb-1">
                          {product.categories[0].name}
                        </span>
                      )}

                      <p className="font-extrabold text-gray-800 text-xs leading-tight line-clamp-2 mb-0.5">{product.title}</p>
                      {product.subtitle && (
                        <p className="text-gray-400 text-[10px] leading-tight line-clamp-1 mb-1">{product.subtitle}</p>
                      )}

                      <div className="mt-auto">
                        <p className="text-[#F47216] font-extrabold text-sm mb-2">{fmt(price)}</p>

                        {/* Add to cart / qty control */}
                        {!inCart ? (
                          <button onClick={() => addToCart(product)}
                            className="w-full bg-[#F47216] text-white py-1.5 rounded-xl font-extrabold text-xs hover:bg-[#e06810] active:scale-95 transition-all">
                            + {t("कार्ट में जोड़ें", "Add to Cart")}
                          </button>
                        ) : (
                          <div className="flex items-center justify-between bg-[#FFF3E0] rounded-xl px-2 py-1">
                            <button onClick={() => updateQty(product.id, -1)}
                              className="w-7 h-7 bg-[#F47216] text-white rounded-lg font-extrabold text-base flex items-center justify-center">−</button>
                            <span className="font-extrabold text-[#F47216] text-sm">{inCart.qty}</span>
                            <button onClick={() => updateQty(product.id, 1)}
                              className="w-7 h-7 bg-[#F47216] text-white rounded-lg font-extrabold text-base flex items-center justify-center">+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <button onClick={() => setShowCart(true)}
            className="w-full bg-[#F47216] text-white py-3.5 rounded-2xl font-extrabold text-sm shadow-2xl flex items-center justify-between px-5 active:scale-95 transition-all">
            <span>🛒 {cartCount} {t("आइटम", "items")}</span>
            <span>{fmt(cartTotal)}</span>
            <span>{t("कार्ट देखें →", "View Cart →")}</span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={() => setShowCart(false)}>
          <div className="bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-extrabold text-gray-800 text-base">🛒 {t("आपका कार्ट", "Your Cart")}</h2>
              <button onClick={() => setShowCart(false)} className="text-gray-400 text-xl font-bold">✕</button>
            </div>

            <div className="px-5 py-3 space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.product.thumbnail
                      ? <img src={item.product.thumbnail} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xl">🛍️</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-xs line-clamp-2">{item.product.title}</p>
                    <p className="text-[#F47216] font-extrabold text-sm">{fmt(getPrice(item.product.variants[0]) * item.qty)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => updateQty(item.product.id, -1)}
                      className="w-7 h-7 bg-[#F47216] text-white rounded-lg font-extrabold flex items-center justify-center">−</button>
                    <span className="font-extrabold text-gray-800 w-4 text-center text-sm">{item.qty}</span>
                    <button onClick={() => updateQty(item.product.id, 1)}
                      className="w-7 h-7 bg-[#F47216] text-white rounded-lg font-extrabold flex items-center justify-center">+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order total */}
            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-500 text-sm">{t("उप-कुल", "Subtotal")}</span>
                <span className="font-extrabold text-gray-800">{fmt(cartTotal)}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 text-xs">{t("डिलीवरी", "Delivery")}</span>
                <span className="text-gray-400 text-xs">{t("जल्द आ रहा है", "Coming soon")}</span>
              </div>

              {/* ORDER DISABLED — coming soon */}
              <button disabled
                className="w-full bg-gray-200 text-gray-400 py-4 rounded-2xl font-extrabold text-sm cursor-not-allowed flex flex-col items-center gap-0.5">
                <span>🔒 {t("ऑर्डर करें", "Place Order")}</span>
                <span className="text-[10px] font-semibold text-gray-400">{t("जल्द आ रहा है — ऑनलाइन ऑर्डर जल्द शुरू होगा", "Coming soon — online ordering launching shortly")}</span>
              </button>

              <p className="text-center text-gray-400 text-[10px] mt-3">
                📞 {t("अभी ऑर्डर करने के लिए कॉल करें:", "To order now, call:")} <span className="font-bold text-gray-600">9812345678</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
