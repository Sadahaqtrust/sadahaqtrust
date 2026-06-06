"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "";

export default function WalletPage() {
  const { customer, token, loading } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !customer) router.push("/auth/login?from=/barter/wallet");
  }, [loading, customer]);

  useEffect(() => {
    if (!customer) return;
    fetch(`${API}/store/barter-wallet?user_id=${customer.id}`, { headers: { "x-publishable-api-key": PK } })
      .then(r => r.json()).then(d => setWallet(d.wallet)).catch(() => {});
    fetch(`${API}/store/barter-wallet/transactions?user_id=${customer.id}&limit=15`, { headers: { "x-publishable-api-key": PK } })
      .then(r => r.json()).then(d => setTransactions(d.transactions || [])).catch(() => {});
  }, [customer]);

  if (loading || !customer) return <div className="p-4 text-white text-center">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-sm opacity-80">Available Balance</p>
        <p className="text-4xl font-extrabold mt-1">{wallet?.balance || 0} <span className="text-lg">Ⓢ</span></p>
        <div className="flex justify-between mt-4 text-sm opacity-80">
          <span>Earned: {wallet?.lifetime_earned || 0}</span>
          <span>Spent: {wallet?.lifetime_spent || 0}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => router.push("/barter/tasks")} className="bg-white rounded-xl p-3 text-center shadow">
          <p className="text-2xl">📋</p>
          <p className="text-xs font-bold text-gray-700 mt-1">Earn Ⓢ</p>
        </button>
        <button onClick={() => router.push("/barter/rewards")} className="bg-white rounded-xl p-3 text-center shadow">
          <p className="text-2xl">🎁</p>
          <p className="text-xs font-bold text-gray-700 mt-1">Spend Ⓢ</p>
        </button>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-2xl p-4 shadow">
        <h2 className="font-bold text-gray-800 mb-3">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No transactions yet. Complete a task to earn!</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((t: any) => (
              <div key={t.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-700">{t.description || t.reference_type}</p>
                  <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`font-bold text-sm ${t.type === "credit" ? "text-green-600" : "text-red-500"}`}>
                  {t.type === "credit" ? "+" : "-"}{Number(t.amount)} Ⓢ
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
