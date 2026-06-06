"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import Link from "next/link";
import Loading from "@/app/components/Loading";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "";

type OrderItem = {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  thumbnail?: string;
};

type Order = {
  id: string;
  display_id: number;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  total: number;
  subtotal: number;
  created_at: string;
  items: OrderItem[];
  shipping_address?: {
    first_name: string;
    last_name: string;
    address_1: string;
    city: string;
  };
  metadata?: { tracking_number?: string };
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-purple-100 text-purple-800",
};

const STATUS_ICON: Record<string, string> = {
  pending: "⏳",
  processing: "🔄",
  completed: "✅",
  cancelled: "❌",
  refunded: "↩️",
};

export default function OrdersPage() {
  const { customer, token, loading: authLoading } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !customer) {
      router.push("/auth/login?from=/orders");
    }
  }, [customer, authLoading]);

  useEffect(() => {
    if (!token) return;
    fetch(`${MEDUSA_URL}/store/orders?limit=20`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-publishable-api-key": PK,
      },
    })
      .then(r => r.json())
      .then(d => {
        setOrders(d.orders || []);
        setLoading(false);
      })
      .catch(() => {
        setError(t("ऑर्डर लोड नहीं हो सके", "Could not load orders"));
        setLoading(false);
      });
  }, [token]);

  if (authLoading || loading) return <Loading />;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="text-white/70 hover:text-white text-sm">←</button>
        <h1 className="text-2xl font-extrabold text-white">{t("मेरे ऑर्डर", "My Orders")}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">⚠️ {error}</div>
      )}

      {!error && orders.length === 0 && (
        <div className="text-center py-20">
          <div className="text-7xl mb-4">📦</div>
          <h2 className="text-xl font-extrabold text-white mb-2">{t("कोई ऑर्डर नहीं", "No orders yet")}</h2>
          <p className="text-white/70 text-sm mb-6">{t("अभी तक कोई ऑर्डर नहीं किया", "You haven't placed any orders yet")}</p>
          <Link href="/"
            className="inline-block bg-[#00A650] text-white px-8 py-3 rounded-full font-extrabold hover:bg-white hover:text-[#00A650] transition-all">
            {t("खरीदारी शुरू करें", "Start Shopping")}
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            {/* Order header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-extrabold text-gray-800 text-base">
                  {t("ऑर्डर नं.", "Order #")}{order.display_id}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {new Date(order.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_COLOR[order.status] || "bg-gray-100 text-gray-600"}`}>
                {STATUS_ICON[order.status] || "📦"} {order.status}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-1.5 mb-3">
              {(order.items || []).slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {item.thumbnail
                      ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xs">🛍️</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">{item.title}</p>
                    <p className="text-[10px] text-gray-400">
                      {t("मात्रा", "Qty")}: {item.quantity} × ₹{Math.round((item.unit_price || 0) / 100)}
                    </p>
                  </div>
                </div>
              ))}
              {order.items && order.items.length > 3 && (
                <p className="text-[10px] text-gray-400 ml-10">+{order.items.length - 3} {t("और", "more items")}</p>
              )}
            </div>

            {/* Delivery address */}
            {order.shipping_address && (
              <p className="text-xs text-gray-500 mb-2">
                📍 {order.shipping_address.first_name} {order.shipping_address.last_name} · {order.shipping_address.address_1}, {order.shipping_address.city}
              </p>
            )}

            {/* Total + actions */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
              <div>
                <p className="text-xs text-gray-500">{t("कुल", "Total")}</p>
                <p className="font-extrabold text-[#F47216] text-base">₹{Math.round((order.total || 0) / 100)}</p>
              </div>
              <div className="flex gap-2">
                {order.metadata?.tracking_number && (
                  <Link href={`/track/${order.metadata.tracking_number}`}
                    className="bg-[#F47216] text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-[#00A650] transition-all">
                    🚴 {t("ट्रैक करें", "Track")}
                  </Link>
                )}
                <span className={`text-[10px] font-bold px-2 py-1.5 rounded-xl ${
                  order.fulfillment_status === "fulfilled" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {order.fulfillment_status === "fulfilled" ? `✅ ${t("डिलीवर्ड", "Delivered")}` : `📦 ${order.fulfillment_status}`}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
