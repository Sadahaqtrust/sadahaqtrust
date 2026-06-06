import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

const PK = "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8"

const BarterGamificationPage = () => {
  const [badges, setBadges] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const badgeRes = await fetch("/store/barter-gamification/badges", { headers: { "x-publishable-api-key": PK } })
      const badgeData = await badgeRes.json()
      setBadges(badgeData.badges || [])

      // Fetch sample users gamification data
      const sampleUsers = ["teen_rahul_16m", "teen_priya_15f", "teen_amit_17m", "teen_neha_14f", "teen_vikram_16m"]
      const userProfiles: any[] = []
      for (const uid of sampleUsers) {
        try {
          const res = await fetch(`/store/barter-gamification?user_id=${uid}`, { headers: { "x-publishable-api-key": PK } })
          const data = await res.json()
          if (data.profile) userProfiles.push(data.profile)
        } catch (e) { /* skip */ }
      }
      setUsers(userProfiles.sort((a: any, b: any) => b.xp_total - a.xp_total))
      setLoading(false)
    }
    fetchData()
  }, [])

  const tierColor = (tier: string) => {
    if (tier === "bronze") return "bg-orange-100 text-orange-800 border-orange-300"
    if (tier === "silver") return "bg-gray-100 text-gray-800 border-gray-300"
    if (tier === "gold") return "bg-yellow-100 text-yellow-800 border-yellow-300"
    if (tier === "platinum") return "bg-purple-100 text-purple-800 border-purple-300"
    return "bg-gray-100 text-gray-800"
  }

  const levelBar = (xp: number, level: number) => {
    const thresholds = [0, 100, 300, 700, 1500, 3000, 6000, 10000, 20000, 50000]
    const current = thresholds[level - 1] || 0
    const next = thresholds[level] || 50000
    const pct = Math.min(100, Math.round(((xp - current) / (next - current)) * 100))
    return pct
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">🎮 Gamification Engine</h1>
      <p className="text-gray-500 mb-6">Temu-style engagement: XP, Levels, Badges, Streaks, Leaderboard</p>

      {loading ? <p>Loading...</p> : (
        <>
          {/* Level System */}
          <div className="bg-white border rounded-lg p-4 mb-6">
            <h2 className="font-bold mb-3">📊 Level System (10 Levels)</h2>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2 text-center text-xs">
              {[
                { level: 1, name: "Newcomer", xp: 0 },
                { level: 2, name: "Starter", xp: 100 },
                { level: 3, name: "Hustler", xp: 300 },
                { level: 4, name: "Achiever", xp: 700 },
                { level: 5, name: "Pro", xp: 1500 },
                { level: 6, name: "Expert", xp: 3000 },
                { level: 7, name: "Champion", xp: 6000 },
                { level: 8, name: "Master", xp: 10000 },
                { level: 9, name: "Legend", xp: 20000 },
                { level: 10, name: "Icon", xp: 50000 },
              ].map(l => (
                <div key={l.level} className="bg-gradient-to-b from-violet-50 to-violet-100 border rounded p-2">
                  <div className="text-lg font-bold text-violet-600">{l.level}</div>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-gray-400">{l.xp} XP</div>
                </div>
              ))}
            </div>
          </div>

          {/* XP Rewards Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <h2 className="font-bold mb-3">⚡ XP Rewards (per action)</h2>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b"><td className="p-2">Task Completed</td><td className="p-2 font-bold text-violet-600">+25 XP</td></tr>
                  <tr className="border-b"><td className="p-2">5-Star Rating Received</td><td className="p-2 font-bold text-violet-600">+10 XP</td></tr>
                  <tr className="border-b"><td className="p-2">First Task Ever</td><td className="p-2 font-bold text-violet-600">+50 XP</td></tr>
                  <tr className="border-b"><td className="p-2">Daily Streak</td><td className="p-2 font-bold text-violet-600">+5 XP</td></tr>
                  <tr className="border-b"><td className="p-2">Referral</td><td className="p-2 font-bold text-violet-600">+50 XP</td></tr>
                  <tr><td className="p-2">Badge Earned</td><td className="p-2 font-bold text-violet-600">+15 XP</td></tr>
                </tbody>
              </table>
            </div>

            {/* Leaderboard */}
            <div className="bg-white border rounded-lg p-4">
              <h2 className="font-bold mb-3">🏆 Leaderboard (Top Users)</h2>
              {users.length === 0 ? <p className="text-gray-400 text-sm">No active users yet</p> : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="p-2 text-left">#</th><th className="p-2 text-left">User</th><th className="p-2 text-left">Level</th><th className="p-2 text-left">XP</th><th className="p-2 text-left">Tasks</th><th className="p-2 text-left">Streak</th></tr></thead>
                  <tbody>
                    {users.map((u: any, i: number) => (
                      <tr key={u.id} className="border-t">
                        <td className="p-2 font-bold">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</td>
                        <td className="p-2 font-mono text-xs">{u.user_id}</td>
                        <td className="p-2">
                          <span className="bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded text-xs">Lv.{u.level} {u.level_name}</span>
                        </td>
                        <td className="p-2 font-bold">{u.xp_total}</td>
                        <td className="p-2">{u.tasks_completed}</td>
                        <td className="p-2">🔥{u.current_streak_days}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Badges Wall */}
          <div className="bg-white border rounded-lg p-4">
            <h2 className="font-bold mb-3">🏅 Badge Collection ({badges.length} badges)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {badges.map((b: any) => (
                <div key={b.id} className={`border rounded-lg p-3 text-center ${tierColor(b.tier)}`}>
                  <div className="text-2xl mb-1">🏅</div>
                  <p className="font-bold text-sm">{b.name}</p>
                  <p className="text-xs mt-1">{b.description}</p>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="capitalize">{b.tier}</span>
                    <span className="font-bold">+{Number(b.bonus_credits)} Ⓢ</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{b.criteria_type}: {b.criteria_value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Gamification",
})

export default BarterGamificationPage
