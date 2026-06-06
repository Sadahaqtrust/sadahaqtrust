"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "";

export default function RewardsPage() {
  const { customer, loading } = useAuth();
  const router = useRouter();
  const [rewards, setRewards] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [redeeming, setRedeeming] = useState("");
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!loading && !customer) router.push("/auth/login?from=/barter/rewards");
  }, [loading, customer]);

  useEffect(() => {
    const params = filter === "all" ? "" : `?category=${filter}`;
    fetch(`${API}/store/barter-rewards${params}`, { headers: { "x-publishable-api-key": PK } })
      .then(r => r.json()).then(d => setRewards(d.rewards || [])).catch(() => {});
  }, [filter]);

  useEffect(() => {
    if (!customer) return;
    fetch(`${API}/store/barter-wallet?user_id=${customer.id}`, { headers: { "x-publishable-api-key": PK } })
      .then(r => r.json()).then(d => setWallet(d.wallet)).catch(() => {});
  }, [customer]);

  const redeem = async (rewardId: string) => {
    if (!customer) return;
    setRedeeming(rewardId);
    setMsg("");
    const res = await fetch(`${API}/store/barter-rewards/redeem`, {
      method: "POST",
      headers: { "x-publishable-api-key": PK, "Content-Type": "application/json" },
      body: JSON.stringify({ reward_id: rewardId, user_id: customer.id }),
    });
    const data = await res.json();
    setRedeeming("");
    if (data.error) setMsg(`❌ ${data.error}`);
    else {
      setMsg(`✅ Redeemed! ${data.voucher_code ? `Code: ${data.voucher_code}` : "Check your email."}`);
      // Refresh wallet
      fetch(`${API}/store/barter-wallet?user_id=${customer.id}`, { headers: { "x-publishable-api-key": PK } })
        .then(r => r.json()).then(d => setWallet(d.wallet)).catch(() => {});
    }
    setTimeout(() => setMsg(""), 5000);
  };

  const categoryIcon: any = { data_pack: "📱", streaming: "🎬", gaming: "🎮", food: "🍕", education: "📚", fashion: "👕", experience: "🎯" };

  if (loading || !customer) return <div className="p-4 text-white text-center">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-extrabold text-white">🎁 Rewards</h1>
        <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold">Ⓢ {wallet?.balance || 0}</span>
      </div>

      {msg && <div className="bg-white rounded-xl p-3 text-sm font-medium text-center">{msg}</div>}

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[{ k: "all", l: "All" }, { k: "data_pack", l: "📱 Data" }, { k: "streaming", l: "🎬 Stream" }, { k: "gaming", l: "🎮 Gaming" }, { k: "food", l: "🍕 Food" }, { k: "education", l: "📚 Learn" }].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filter === f.k ? "bg-white text-[#F47216]" : "bg-white/20 text-white"}`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Reward Cards */}
      <div className="grid grid-cols-2 gap-3">
        {rewards.map(r => {
          const canAfford = (wallet?.balance || 0) >= Number(r.credit_cost);
          return (
            <div key={r.id} className="bg-white rounded-2xl p-3 shadow">
              <p className="text-2xl text-center">{categoryIcon[r.category] || "🎁"}</p>
              <p className="font-bold text-xs text-gray-800 mt-2 text-center leading-tight">{r.title}</p>
              <p className="text-center mt-2">
                <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded text-xs font-bold">Ⓢ {Number(r.credit_cost)}</span>
              </p>
              <p className="text-center text-[10px] text-gray-400 mt-1">Worth ₹{Number(r.retail_value)}</p>
              <button onClick={() => redeem(r.id)} disabled={!canAfford || redeeming === r.id || r.stock_remaining <= 0}
                className={`w-full mt-2 py-1.5 rounded-lg text-xs font-bold ${canAfford && r.stock_remaining > 0 ? "bg-[#00A650] text-white" : "bg-gray-200 text-gray-400"}`}>
                {redeeming === r.id ? "..." : r.stock_remaining <= 0 ? "Out of Stock" : !canAfford ? "Need more Ⓢ" : "Redeem"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
