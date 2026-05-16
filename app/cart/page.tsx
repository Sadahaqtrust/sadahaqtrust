"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, Suspense } from "react";
import { getCart, removeFromCart } from "@/lib/medusa";
import { useLang } from "@/lib/lang";
import Loading from "../components/Loading";
import Link from "next/link";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";
const SHIPPING_OPTION_ID = "so_01KQWVZ6T6CTY5E1S5J5KZ6R70";

type Step = "cart" | "address" | "confirm";

export default function CartPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CartInner />
    </Suspense>
  );
}

function CartInner() {
  const { t } = useLang();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("cart");
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<any>(null);
  const [error, setError] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState("quick_commerce");
  const [logs, setLogs] = useState<string[]>([]);

  function log(msg: string) {
    const ts = new Date().toISOString().slice(11, 23);
    setLogs(prev => [`[${ts}] [CART] ${msg}`, ...prev].slice(0, 40));
    console.log(`[CART] ${msg}`);
  }

  // Address form
  const [address, setAddress] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address_1: "",
    address_2: "",
    city: "Rohtak",
    province: "Haryana",
    postal_code: "124001",
    country_code: "in",
  });
  const [colonyQuery, setColonyQuery] = useState("");
  const [colonies, setColonies] = useState<{colony_id: number; colony_name: string}[]>([]);
  const [showColonies, setShowColonies] = useState(false);

  useEffect(() => {
    const paramId = new URLSearchParams(window.location.search).get("cart_id");
    const cartId = paramId || localStorage.getItem("cart_id");
    log(`Cart page loaded. URL cart_id=${paramId || "none"}, localStorage cart_id=${localStorage.getItem("cart_id") || "none"}`);
    if (paramId) localStorage.setItem("cart_id", paramId);
    if (cartId) {
      log(`Fetching cart ${cartId}...`);
      getCart(cartId).then((c) => {
        if (!c) {
          log(`getCart returned null — cart not found or API error`);
          localStorage.removeItem("cart_id");
          setLoading(false);
          return;
        }
        log(`Cart fetched: region=${c.region_id} items=${c.items?.length} total=${c.total}`);
        if (c.region_id !== "reg_01KQWNSTAGQKVSV63B12QMC5EJ") {
          log(`WRONG REGION: ${c.region_id} — clearing cart`);
          localStorage.removeItem("cart_id");
          setLoading(false);
          return;
        }
        setCart(c);
        setLoading(false);
      });
    } else {
      log("No cart_id found anywhere — showing empty cart");
      setLoading(false);
    }
  }, []);

  function authHeaders() {
    const token = localStorage.getItem("dr_token");
    return {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUB_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async function handleRemove(lineItemId: string) {
    const cartId = localStorage.getItem("cart_id");
    if (!cartId) return;
    const updated = await removeFromCart(cartId, lineItemId);
    setCart(updated);
  }

  useEffect(() => {
    if (!colonyQuery) { setColonies([]); return; }
    const t_ = setTimeout(() => {
      fetch(`/api/colonies?q=${encodeURIComponent(colonyQuery)}`)
        .then(r => r.json()).then(d => setColonies(d.colonies || []));
    }, 250);
    return () => clearTimeout(t_);
  }, [colonyQuery]);

  function validateAddress() {
    if (!address.first_name.trim()) return t("नाम आवश्यक है", "First name is required");
    if (!address.phone.trim()) return t("फ़ोन आवश्यक है", "Phone is required");
    if (!address.address_1.trim()) return t("पता आवश्यक है", "Address is required");
    if (!address.city.trim()) return t("शहर आवश्यक है", "City is required");
    return "";
  }

  async function proceedToConfirm() {
    const err = validateAddress();
    if (err) { setError(err); return; }
    setError("");
    setStep("confirm");
  }

  async function placeOrder() {
    setPlacing(true);
    setError("");
    const cartId = localStorage.getItem("cart_id");
    log(`placeOrder: cart_id=${cartId}`);
    if (!cartId) { setError("Cart not found"); setPlacing(false); return; }

    try {
      log("Step 1: Setting shipping address...");
      const addrRes = await fetch(`${MEDUSA_URL}/store/carts/${cartId}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          shipping_address: address,
          billing_address: address,
          email: cart.email || "customer@digitalrohtak.online",
        }),
      });
      const addrData = await addrRes.json();
      if (!addrRes.ok) { log(`Step 1 FAILED: ${addrData.message}`); throw new Error(addrData.message || "Failed to set address"); }
      log("Step 1 OK");

      log(`Step 2: Adding shipping method ${SHIPPING_OPTION_ID}...`);
      const shipRes = await fetch(`${MEDUSA_URL}/store/carts/${cartId}/shipping-methods`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ option_id: SHIPPING_OPTION_ID }),
      });
      const shipData = await shipRes.json();
      if (!shipRes.ok) { log(`Step 2 FAILED: ${shipData.message}`); throw new Error(shipData.message || "Failed to set shipping"); }
      log("Step 2 OK");

      log("Step 3: Create payment collection...");
      const payColRes = await fetch(`${MEDUSA_URL}/store/payment-collections`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ cart_id: cartId }),
      });
      const payColData = await payColRes.json();
      if (!payColRes.ok) { log(`Step 3 FAILED: ${payColData.message}`); throw new Error(payColData.message || "Failed to create payment collection"); }
      const payColId = payColData.payment_collection?.id;
      log(`Step 3 OK: ${payColId}`);

      log("Step 4: Create payment session...");
      const sesRes = await fetch(`${MEDUSA_URL}/store/payment-collections/${payColId}/payment-sessions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ provider_id: "pp_system_default" }),
      });
      const sesData = await sesRes.json();
      if (!sesRes.ok) { log(`Step 4 FAILED: ${sesData.message}`); throw new Error(sesData.message || "Failed to create payment session"); }
      log("Step 4 OK");

      log("Step 5: Completing cart...");
      const completeRes = await fetch(`${MEDUSA_URL}/store/carts/${cartId}/complete`, {
        method: "POST",
        headers: authHeaders(),
      });
      const completeData = await completeRes.json();
      log(`Step 5 result: type=${completeData.type} msg=${completeData.message || "none"}`);

      if (completeData.type === "order" && (completeData.order || completeData.data)) {
        log(`ORDER PLACED: #${(completeData.order || completeData.data).display_id}`);
        setOrderPlaced(completeData.order || completeData.data);
        localStorage.removeItem("cart_id");
      } else {
        throw new Error(completeData.message || "Order completion failed");
      }
    } catch (err: any) {
      log(`placeOrder ERROR: ${err.message}`);
      setError(err.message || t("ऑर्डर विफल हुआ", "Order failed. Please try again."));
    }
    setPlacing(false);
  }

  if (loading) return <Loading />;

  const DebugPanel = () => logs.length > 0 ? (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 text-green-400 font-mono text-xs p-3 max-h-52 overflow-y-auto border-t-2 border-green-500">
      <div className="flex justify-between items-center mb-1">
        <span className="text-green-300 font-bold">🛒 CART PAGE — DEBUG TRACE</span>
        <button onClick={() => setLogs([])} className="text-red-400 text-xs">✕ clear</button>
      </div>
      {logs.map((l, i) => <div key={i} className="leading-5">{l}</div>)}
    </div>
  ) : null;

  // ── Order Success ──────────────────────────────────────────────────────────
  if (orderPlaced) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <DebugPanel />
        <div className="text-7xl mb-4">✅</div>
        <h2 className="text-3xl font-extrabold text-white mb-2">
          {t("ऑर्डर सफल!", "Order Placed!")}
        </h2>
        <p className="text-white/80 mb-4">
          {t("ऑर्डर नं.", "Order #")}{orderPlaced.display_id}
        </p>
        <div className="bg-white rounded-2xl p-5 mb-6 text-left shadow-xl">
          <p className="text-gray-500 text-sm font-semibold mb-2">
            📍 {t("डिलीवरी पता", "Delivery Address")}
          </p>
          <p className="text-gray-700 text-sm">
            {address.first_name} {address.last_name}<br />
            {address.address_1}{address.address_2 ? `, ${address.address_2}` : ""}, {address.city}<br />
            {address.province} - {address.postal_code}<br />
            📞 {address.phone}
          </p>
          <div className="border-t mt-3 pt-3">
            <p className="text-[#00A650] font-bold text-sm">
              💵 {t("भुगतान: कैश ऑन डिलीवरी", "Payment: Cash on Delivery")}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              ⚡ {t("30-60 मिनट में डिलीवरी", "Delivery in 30-60 minutes")}
            </p>
          </div>
        </div>
        {orderPlaced.metadata?.tracking_number && (
          <Link href={`/track/${orderPlaced.metadata.tracking_number}`}
            className="block bg-[#F47216] text-white px-8 py-3 rounded-full font-bold hover:bg-white hover:text-[#F47216] transition-all mb-3">
            🚴 {t("ऑर्डर ट्रैक करें", "Track Order")}
          </Link>
        )}
        <Link href="/" className="block bg-[#00A650] text-white px-8 py-3 rounded-full font-bold hover:bg-[#F47216] transition-all">
          {t("होम पर जाएं", "Back to Home")}
        </Link>
      </div>
    );
  }

  // ── Empty Cart ─────────────────────────────────────────────────────────────
  if (!cart || !cart.items?.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <DebugPanel />
        <div className="text-7xl mb-6">🛒</div>
        <h2 className="text-3xl font-extrabold text-white mb-4">
          {t("टोकरी खाली है", "Your cart is empty")}
        </h2>
        <Link href="/" className="inline-block bg-[#00A650] text-white px-8 py-3 rounded-full font-bold hover:bg-white hover:text-[#00A650] transition-all">
          {t("खरीदारी शुरू करें", "Start Shopping")}
        </Link>
      </div>
    );
  }

  const total = Math.round((cart.total || 0) / 100);

  // ── Step: Cart ─────────────────────────────────────────────────────────────
  if (step === "cart") {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <DebugPanel />
        <h1 className="text-2xl font-extrabold text-white mb-1">{t("आपकी टोकरी", "Your Cart")}</h1>
        <div className="w-10 h-1 bg-[#00A650] rounded mb-4"></div>

        <div className="flex flex-col gap-3 mb-4">
          {cart.items.map((item: any) => (
            <div key={item.id} className="bg-white rounded-2xl p-3 flex items-center justify-between shadow">
              <div>
                <p className="text-[#F47216] font-bold text-sm">{item.title}</p>
                <p className="text-gray-500 text-xs">{item.variant?.title}</p>
                <p className="text-[#00A650] font-semibold text-xs mt-0.5">
                  {t("मात्रा", "Qty")}: {item.quantity} × ₹{Math.round((item.unit_price || 0) / 100)}
                </p>
              </div>
              <button onClick={() => handleRemove(item.id)} className="text-red-400 hover:text-red-600 font-bold text-lg ml-2">✕</button>
            </div>
          ))}
        </div>

        {/* Delivery type */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow">
          <h3 className="text-[#F47216] font-extrabold text-sm mb-3">{t("डिलीवरी का तरीका", "Delivery Method")}</h3>
          {[
            { type: "quick_commerce", icon: "⚡", label_hi: "तुरंत डिलीवरी", label_en: "Quick Delivery", desc_hi: "30-60 मिनट", desc_en: "30-60 min" },
            { type: "scheduled", icon: "📅", label_hi: "समय निर्धारित", label_en: "Scheduled", desc_hi: "समय चुनें", desc_en: "Choose time" },
            { type: "pickup", icon: "🏪", label_hi: "स्वयं उठाएं", label_en: "Self Pickup", desc_hi: "स्टोर से", desc_en: "From store" },
          ].map(opt => (
            <button key={opt.type} onClick={() => setFulfillmentType(opt.type)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left mb-2 transition-all ${
                fulfillmentType === opt.type ? "border-[#F47216] bg-[#F47216]/5" : "border-gray-200"
              }`}>
              <span className="text-xl">{opt.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-sm">{t(opt.label_hi, opt.label_en)}</p>
                <p className="text-gray-500 text-xs">{t(opt.desc_hi, opt.desc_en)}</p>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 ${fulfillmentType === opt.type ? "border-[#F47216] bg-[#F47216]" : "border-gray-300"}`} />
            </button>
          ))}
        </div>

        {/* Total */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow">
          <div className="flex justify-between text-gray-600 text-sm mb-1">
            <span>{t("उप-कुल", "Subtotal")}</span>
            <span>₹{Math.round((cart.subtotal || 0) / 100)}</span>
          </div>
          <div className="flex justify-between text-gray-600 text-sm mb-1">
            <span>{t("शिपिंग", "Shipping")}</span>
            <span>₹{Math.round((cart.shipping_total || 0) / 100)}</span>
          </div>
          <div className="flex justify-between text-[#F47216] font-extrabold text-lg border-t pt-2 mt-2">
            <span>{t("कुल", "Total")}</span>
            <span>₹{total}</span>
          </div>
        </div>

        <button onClick={() => setStep("address")}
          className="w-full bg-[#00A650] text-white py-4 rounded-2xl text-lg font-extrabold hover:bg-[#F47216] transition-colors shadow-lg">
          {t("पता दर्ज करें →", "Enter Address →")}
        </button>
      </div>
    );
  }

  // ── Step: Address ──────────────────────────────────────────────────────────
  if (step === "address") {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <DebugPanel />
        <button onClick={() => setStep("cart")} className="text-white/70 hover:text-white text-sm mb-4 block">
          ← {t("वापस", "Back")}
        </button>
        <h1 className="text-2xl font-extrabold text-white mb-1">{t("डिलीवरी पता", "Delivery Address")}</h1>
        <div className="w-10 h-1 bg-[#00A650] rounded mb-4"></div>

        <div className="bg-white rounded-2xl p-5 shadow mb-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("नाम *", "First Name *")}</label>
              <input value={address.first_name} onChange={e => setAddress({...address, first_name: e.target.value})}
                placeholder="Rahul" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-gray-700 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("उपनाम", "Last Name")}</label>
              <input value={address.last_name} onChange={e => setAddress({...address, last_name: e.target.value})}
                placeholder="Kumar" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-gray-700 text-sm outline-none" />
            </div>
          </div>

          <div>
            <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("फ़ोन *", "Phone *")}</label>
            <input value={address.phone} onChange={e => setAddress({...address, phone: e.target.value})}
              placeholder="+91-9876543210" type="tel"
              className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-gray-700 text-sm outline-none" />
          </div>

          <div>
            <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("कॉलोनी / मोहल्ला", "Colony / Locality")}</label>
            <div className="relative">
              <input
                value={colonyQuery}
                onChange={e => { setColonyQuery(e.target.value); setShowColonies(true); setAddress({...address, address_2: e.target.value}); }}
                onFocus={() => setShowColonies(true)}
                onBlur={() => setTimeout(() => setShowColonies(false), 150)}
                placeholder={t("कॉलोनी खोजें...", "Search colony...")}
                className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-gray-700 text-sm outline-none" />
              {showColonies && colonies.length > 0 && (
                <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {colonies.map(c => (
                    <li key={c.colony_id}
                      onMouseDown={() => { setColonyQuery(c.colony_name); setAddress({...address, address_2: c.colony_name}); setShowColonies(false); }}
                      className="px-3 py-2 text-sm text-gray-700 hover:bg-[#F47216]/10 cursor-pointer">
                      {c.colony_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("पता *", "Address *")}</label>
            <input value={address.address_1} onChange={e => setAddress({...address, address_1: e.target.value})}
              placeholder="House No, Street"
              className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-gray-700 text-sm outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("शहर *", "City *")}</label>
              <input value={address.city} onChange={e => setAddress({...address, city: e.target.value})}
                placeholder="Rohtak" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-gray-700 text-sm outline-none" />
            </div>
            <div>
              <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("पिन कोड", "PIN Code")}</label>
              <input value={address.postal_code} onChange={e => setAddress({...address, postal_code: e.target.value})}
                placeholder="124001" className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-gray-700 text-sm outline-none" />
            </div>
          </div>

          {/* Payment method - COD only */}
          <div className="border-2 border-[#00A650] rounded-xl p-3 bg-[#00A650]/5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#00A650] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white"></div>
              </div>
              <p className="font-bold text-gray-800 text-sm">💵 {t("कैश ऑन डिलीवरी", "Cash on Delivery")}</p>
            </div>
            <p className="text-gray-500 text-xs mt-1 ml-6">{t("डिलीवरी पर नकद भुगतान करें", "Pay cash when order is delivered")}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-3 text-sm">⚠️ {error}</div>
        )}

        <button onClick={proceedToConfirm}
          className="w-full bg-[#00A650] text-white py-4 rounded-2xl text-lg font-extrabold hover:bg-[#F47216] transition-colors shadow-lg">
          {t("समीक्षा करें →", "Review Order →")}
        </button>
      </div>
    );
  }

  // ── Step: Confirm ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <DebugPanel />
      <button onClick={() => setStep("address")} className="text-white/70 hover:text-white text-sm mb-4 block">
        ← {t("वापस", "Back")}
      </button>
      <h1 className="text-2xl font-extrabold text-white mb-1">{t("ऑर्डर समीक्षा", "Order Review")}</h1>
      <div className="w-10 h-1 bg-[#00A650] rounded mb-4"></div>

      {/* Items summary */}
      <div className="bg-white rounded-2xl p-4 shadow mb-3">
        <p className="text-[#F47216] font-bold text-sm mb-2">{t("आइटम", "Items")} ({cart.items.length})</p>
        {cart.items.map((item: any) => (
          <div key={item.id} className="flex justify-between text-sm text-gray-700 mb-1">
            <span>{item.title} × {item.quantity}</span>
            <span>₹{Math.round((item.unit_price || 0) * item.quantity / 100)}</span>
          </div>
        ))}
        <div className="border-t pt-2 mt-2 flex justify-between font-extrabold text-[#F47216]">
          <span>{t("कुल", "Total")}</span>
          <span>₹{total}</span>
        </div>
      </div>

      {/* Address summary */}
      <div className="bg-white rounded-2xl p-4 shadow mb-3">
        <p className="text-[#F47216] font-bold text-sm mb-1">📍 {t("डिलीवरी पता", "Delivery Address")}</p>
        <p className="text-gray-700 text-sm">
          {address.first_name} {address.last_name} · {address.phone}<br />
          {address.address_1}{address.address_2 ? `, ${address.address_2}` : ""}, {address.city} - {address.postal_code}
        </p>
      </div>

      {/* Payment + delivery */}
      <div className="bg-white rounded-2xl p-4 shadow mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500">{t("भुगतान", "Payment")}</span>
          <span className="font-bold text-gray-700">💵 {t("कैश ऑन डिलीवरी", "Cash on Delivery")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{t("डिलीवरी", "Delivery")}</span>
          <span className="font-bold text-gray-700">
            {fulfillmentType === "quick_commerce" ? "⚡ 30-60 min" : fulfillmentType === "pickup" ? "🏪 Pickup" : "📅 Scheduled"}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-3 text-sm">⚠️ {error}</div>
      )}

      <button onClick={placeOrder} disabled={placing}
        className="w-full bg-[#00A650] text-white py-4 rounded-2xl text-lg font-extrabold hover:bg-[#F47216] transition-colors shadow-lg disabled:opacity-60">
        {placing
          ? t("ऑर्डर हो रहा है...", "Placing order...")
          : `✅ ${t("ऑर्डर करें — ₹", "Place Order — ₹")}${total}`}
      </button>
    </div>
  );
}
