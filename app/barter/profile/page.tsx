"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "";

export default function ProfilePage() {
  const { customer, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [allBadges, setAllBadges] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !customer) router.push("/auth/login?from=/barter/profile");
  }, [loading, customer]);

  useEffect(() => {
    if (!customer) return;
    fetch(`${API}/store/barter-gamification?user_id=${customer.id}`, { headers: { "x-publishable-api-key": PK } })
      .then(r => r.json()).then(d => setProfile(d.profile)).catch(() => {});
    fetch(`${API}/store/barter-gamification/badges`, { headers: { "x-publishable-api-key": PK } })
      .then(r => r.json()).then(d => setAllBadges(d.badges || [])).catch(() => {});
  }, [customer]);

  if (loading || !customer) return <div className="p-4 text-white text-center">Loading...</div>;

  const earnedBadgeIds = (profile?.badges || []).map((b: any) => b.badge_id);
  const tierColor: any = { bronze: "from-orange-400 to-orange-600", silver: "from-gray-400 to-gray-600", gold: "from-yellow-400 to-yellow-600", platinum: "from-purple-400 to-purple-600" };

  return (
    <div className="p-4 space-y-4">
      {/* Level Card */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-80">Level {profile?.level || 1}</p>
            <p className="text-2xl font-extrabold">{profile?.level_name || "Newcomer"}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold">{profile?.xp_total || 0}</p>
            <p className="text-xs opacity-80">XP</p>
          </div>
        </div>
        {profile?.next_level && (
          <div className="mt-4">
            <div className="flex justify-between text-xs opacity-80 mb-1">
              <span>Next: Lv.{profile.next_level.level} {profile.next_level.name}</span>
              <span>{profile.xp_to_next_level} XP to go</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${profile.progress_percent || 0}%` }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-3 text-center shadow">
          <p className="text-2xl font-extrabold text-[#F47216]">{profile?.tasks_completed || 0}</p>
          <p className="text-[10px] text-gray-500 font-bold">Tasks Done</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow">
          <p className="text-2xl font-extrabold text-[#F47216]">🔥{profile?.current_streak_days || 0}</p>
          <p className="text-[10px] text-gray-500 font-bold">Day Streak</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center shadow">
          <p className="text-2xl font-extrabold text-[#F47216]">{profile?.reputation_score || 0}</p>
          <p className="text-[10px] text-gray-500 font-bold">Reputation</p>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl p-4 shadow">
        <h2 className="font-bold text-gray-800 mb-3">🏅 Badges ({earnedBadgeIds.length}/{allBadges.length})</h2>
        <div className="grid grid-cols-3 gap-2">
          {allBadges.map((b: any) => {
            const earned = earnedBadgeIds.includes(b.id);
            return (
              <div key={b.id} className={`rounded-xl p-2 text-center ${earned ? `bg-gradient-to-b ${tierColor[b.tier] || "from-gray-400 to-gray-600"} text-white` : "bg-gray-100 text-gray-400"}`}>
                <p className="text-xl">{earned ? "🏅" : "🔒"}</p>
                <p className="text-[9px] font-bold mt-1 leading-tight">{b.name}</p>
                {!earned && <p className="text-[8px] mt-0.5">{b.criteria_value} {b.criteria_type?.replace("_", " ")}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
