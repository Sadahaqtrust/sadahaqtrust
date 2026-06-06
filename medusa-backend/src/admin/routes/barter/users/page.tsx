import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

const PK = "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8"
const hdrs = { "x-publishable-api-key": PK, "Content-Type": "application/json" }

const BarterUsersPage = () => {
  const [userId, setUserId] = useState("")
  const [profile, setProfile] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [error, setError] = useState("")
  const [bonusAmount, setBonusAmount] = useState(25)
  const [bonusReason, setBonusReason] = useState("Welcome bonus")
  const [successMsg, setSuccessMsg] = useState("")

  const lookupUser = async (uid?: string) => {
    const lookupId = uid || userId
    if (!lookupId.trim()) return
    setError("")
    setProfile(null)
    setWallet(null)
    setTransactions([])
    setSuccessMsg("")

    try {
      const walletRes = await fetch(`/store/barter-wallet?user_id=${lookupId}`, { headers: { "x-publishable-api-key": PK } })
      const walletData = await walletRes.json()
      if (walletData.error) { setError(walletData.error); return }
      setWallet(walletData.wallet)

      const profileRes = await fetch(`/store/barter-gamification?user_id=${lookupId}`, { headers: { "x-publishable-api-key": PK } })
      const profileData = await profileRes.json()
      if (profileData.profile) setProfile(profileData.profile)

      const txnRes = await fetch(`/store/barter-wallet/transactions?user_id=${lookupId}&limit=10`, { headers: { "x-publishable-api-key": PK } })
      const txnData = await txnRes.json()
      setTransactions(txnData.transactions || [])
    } catch (e: any) {
      setError(e.message)
    }
  }

  const giveBonus = async () => {
    setSuccessMsg("")
    const res = await fetch("/store/barter-wallet/credit", {
      method: "POST", headers: hdrs,
      body: JSON.stringify({ user_id: userId, amount: bonusAmount, reference_type: "bonus", description: bonusReason })
    })
    const data = await res.json()
    if (data.error) { setError(data.error); return }
    setSuccessMsg(`✅ Credited ${bonusAmount} Ⓢ to ${userId}`)
    lookupUser()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">👥 Barter Users</h1>
      <p className="text-gray-500 mb-4">Look up user profiles, wallets, and give bonus credits</p>

      <div className="bg-gray-50 border rounded-lg p-3 mb-4">
        <p className="text-xs text-gray-500 mb-2">Quick lookup — click a sample user:</p>
        <div className="flex gap-2 flex-wrap">
          {["teen_rahul_16m", "teen_priya_15f", "teen_amit_17m", "teen_neha_14f", "teen_vikram_16m", "test_teen_001", "teen_e2e_final"].map(u => (
            <button key={u} onClick={() => { setUserId(u); lookupUser(u) }} className="bg-white border px-2 py-1 rounded text-xs hover:bg-violet-50 font-mono">{u}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <input placeholder="Enter user_id" value={userId} onChange={e => setUserId(e.target.value)} className="border rounded p-2 flex-1 font-mono" onKeyDown={e => e.key === "Enter" && lookupUser()} />
        <button onClick={() => lookupUser()} className="bg-violet-600 text-white px-4 py-2 rounded hover:bg-violet-700">Look Up</button>
      </div>

      {error && <p className="text-red-500 mb-4 bg-red-50 border border-red-200 rounded p-2 text-sm">{error}</p>}
      {successMsg && <p className="text-green-700 mb-4 bg-green-50 border border-green-200 rounded p-2 text-sm">{successMsg}</p>}

      {wallet && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Wallet */}
          <div className="bg-white border rounded-lg p-4">
            <h2 className="font-bold text-lg mb-3">💰 Wallet</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Balance:</span><span className="font-bold text-green-600 text-lg">{wallet.balance} Ⓢ</span></div>
              <div className="flex justify-between"><span>Available:</span><span>{wallet.available} Ⓢ</span></div>
              <div className="flex justify-between"><span>Frozen (escrow):</span><span>{wallet.frozen} Ⓢ</span></div>
              <div className="flex justify-between border-t pt-2"><span>Lifetime Earned:</span><span className="text-green-600">{wallet.lifetime_earned} Ⓢ</span></div>
              <div className="flex justify-between"><span>Lifetime Spent:</span><span className="text-red-600">{wallet.lifetime_spent} Ⓢ</span></div>
            </div>
            <hr className="my-3" />
            <h3 className="font-medium mb-2 text-sm">Give Bonus Credits</h3>
            <div className="flex gap-2">
              <input type="number" value={bonusAmount} onChange={e => setBonusAmount(Number(e.target.value))} className="border rounded p-1 w-20 text-sm" />
              <input placeholder="Reason" value={bonusReason} onChange={e => setBonusReason(e.target.value)} className="border rounded p-1 flex-1 text-sm" />
              <button onClick={giveBonus} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Give</button>
            </div>
          </div>

          {/* Gamification */}
          {profile && (
            <div className="bg-white border rounded-lg p-4">
              <h2 className="font-bold text-lg mb-3">🎮 Gamification</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Level:</span><span className="font-bold text-violet-600">{profile.level} — {profile.level_name}</span></div>
                <div className="flex justify-between"><span>XP:</span><span>{profile.xp_total} XP</span></div>
                <div className="flex justify-between"><span>Tasks Completed:</span><span>{profile.tasks_completed}</span></div>
                <div className="flex justify-between"><span>Current Streak:</span><span>🔥 {profile.current_streak_days} days</span></div>
                <div className="flex justify-between"><span>Longest Streak:</span><span>{profile.longest_streak_days} days</span></div>
                <div className="flex justify-between"><span>Reputation:</span><span>{profile.reputation_score}/100</span></div>
              </div>
              {profile.next_level && (
                <div className="mt-3 bg-violet-50 rounded p-2 text-xs">
                  <div className="flex justify-between mb-1">
                    <span>Next: Lv.{profile.next_level.level} "{profile.next_level.name}"</span>
                    <span>{profile.progress_percent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-violet-600 h-2 rounded-full" style={{ width: `${profile.progress_percent}%` }}></div>
                  </div>
                </div>
              )}
              {profile.badges?.length > 0 && (
                <div className="mt-3">
                  <h3 className="font-medium text-sm">🏅 Badges ({profile.badges.length})</h3>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {profile.badges.map((b: any) => (
                      <span key={b.id} className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">🏅</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div className="bg-white border rounded-lg p-4 mt-6">
          <h2 className="font-bold mb-3">📜 Recent Transactions</h2>
          <table className="w-full text-xs">
            <thead className="bg-gray-50"><tr><th className="p-2 text-left">Type</th><th className="p-2 text-left">Amount</th><th className="p-2 text-left">Description</th><th className="p-2 text-left">Date</th></tr></thead>
            <tbody>
              {transactions.map((t: any) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2"><span className={t.type === "credit" ? "text-green-600" : "text-red-600"}>{t.type}</span></td>
                  <td className="p-2 font-bold">{t.type === "credit" ? "+" : "-"}{Number(t.amount)} Ⓢ</td>
                  <td className="p-2 text-gray-600">{t.description}</td>
                  <td className="p-2 text-gray-400">{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Barter Users",
})

export default BarterUsersPage
