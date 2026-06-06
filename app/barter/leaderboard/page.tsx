"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "";

export default function LeaderboardPage() {
  const { customer, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !customer) router.push("/auth/login?from=/barter/leaderboard");
  }, [loading, customer]);

  useEffect(() => {
    // Fetch all known users' gamification profiles for leaderboard
    const fetchLeaderboard = async () => {
      const sampleIds = ["teen_rahul_16m", "teen_priya_15f", "teen_amit_17m", "teen_neha_14f", "teen_vikram_16m"];
      // Also try to get customer-based IDs
      const profiles: any[] = [];
      for (const uid of sampleIds) {
        try {
          const res = await fetch(`${API}/store/barter-gamification?user_id=${uid}`, { headers: { "x-publishable-api-key": PK } });
          const data = await res.json();
          if (data.profile && data.profile.xp_total > 0) profiles.push(data.profile);
        } catch (e) { /* skip */ }
      }
      // Also fetch current user
      if (customer) {
        try {
          const res = await fetch(`${API}/store/barter-gamification?user_id=${customer.id}`, { headers: { "x-publishable-api-key": PK } });
          const data = await res.json();
          if (data.profile) profiles.push(data.profile);
        } catch (e) { /* skip */ }
      }
      // Deduplicate and sort
      const unique = profiles.filter((p, i, arr) => arr.findIndex(x => x.user_id === p.user_id) === i);
      setUsers(unique.sort((a, b) => b.xp_total - a.xp_total));
    };
    fetchLeaderboard();
  }, [customer]);

  if (loading || !customer) return <div className="p-4 text-white text-center">Loading...</div>;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-extrabold text-white">🏆 Leaderboard</h1>
      <p className="text-white/70 text-sm">Top earners this week</p>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {users.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No activity yet. Be the first!</p>
        ) : (
          <div>
            {users.map((u: any, i: number) => {
              const isMe = u.user_id === customer?.id;
              return (
                <div key={u.user_id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 ${isMe ? "bg-violet-50" : ""}`}>
                  <span className="text-xl w-8 text-center">{i < 3 ? medals[i] : `${i + 1}`}</span>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-gray-800">
                      {u.user_id?.replace("teen_", "").replace(/_/g, " ").replace(/\d+[mf]$/, "")}
                      {isMe && <span className="text-violet-600 text-xs ml-1">(You)</span>}
                    </p>
                    <p className="text-xs text-gray-400">Lv.{u.level} {u.level_name} • {u.tasks_completed} tasks • 🔥{u.current_streak_days}</p>
                  </div>
                  <span className="font-extrabold text-violet-600">{u.xp_total} XP</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
