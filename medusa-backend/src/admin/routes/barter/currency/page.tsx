import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

const PK = "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8"

const BarterCurrencyPage = () => {
  const [stats, setStats] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [issueForm, setIssueForm] = useState({ user_id: "", amount: 50, reason: "Platform reward" })
  const [msg, setMsg] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      const statsRes = await fetch("/store/barter-currency/stats", { headers: { "x-publishable-api-key": PK } })
      const statsData = await statsRes.json()
      setStats(statsData.stats || {})

      // Fetch sample accounts
      const sampleUsers = ["teen_rahul_16m", "teen_priya_15f", "teen_amit_17m", "platform"]
      const accs: any[] = []
      for (const uid of sampleUsers) {
        try {
          const res = await fetch(`/store/barter-currency?user_id=${uid}`, { headers: { "x-publishable-api-key": PK } })
          const data = await res.json()
          if (data.account) accs.push({ user_id: uid, ...data.account })
        } catch (e) { /* skip */ }
      }
      setAccounts(accs)
      setLoading(false)
    }
    fetchData()
  }, [])

  const issueCurrency = async () => {
    if (!issueForm.user_id) return
    setMsg("")
    // First ensure account exists
    await fetch("/store/barter-currency", {
      method: "POST",
      headers: { "x-publishable-api-key": PK, "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: issueForm.user_id })
    })
    // Then do a transfer via wallet credit (currency issuance is internal)
    const res = await fetch("/store/barter-wallet/credit", {
      method: "POST",
      headers: { "x-publishable-api-key": PK, "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: issueForm.user_id, amount: issueForm.amount, reference_type: "currency_issue", description: issueForm.reason })
    })
    const data = await res.json()
    if (data.error) setMsg(`❌ ${data.error}`)
    else setMsg(`✅ Issued ${issueForm.amount} Ⓢ to ${issueForm.user_id}`)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">💱 Digital Currency (Ⓢ)</h1>
      <p className="text-gray-500 mb-6">Phase 3: Mutual credit system — WIR/Sardex-inspired digital currency for the platform</p>

      {loading ? <p>Loading...</p> : (
        <>
          {/* Currency Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4 border-l-4 border-l-emerald-500">
              <p className="text-sm text-gray-500">Total Supply</p>
              <p className="text-2xl font-bold text-emerald-600">{stats?.total_supply || 0} Ⓢ</p>
            </div>
            <div className="bg-white border rounded-lg p-4 border-l-4 border-l-red-500">
              <p className="text-sm text-gray-500">Total Debt</p>
              <p className="text-2xl font-bold text-red-600">{stats?.total_debt || 0} Ⓢ</p>
            </div>
            <div className="bg-white border rounded-lg p-4 border-l-4 border-l-blue-500">
              <p className="text-sm text-gray-500">Net Circulation</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.net_circulation || 0} Ⓢ</p>
            </div>
            <div className="bg-white border rounded-lg p-4 border-l-4 border-l-violet-500">
              <p className="text-sm text-gray-500">Active Accounts</p>
              <p className="text-2xl font-bold text-violet-600">{stats?.active_accounts || 0}</p>
            </div>
          </div>

          {/* Currency Config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <h2 className="font-bold mb-3">⚙️ Currency Configuration</h2>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b"><td className="p-2 text-gray-500">Currency Name</td><td className="p-2 font-bold">Ⓢ (Sadahaq Digital Currency)</td></tr>
                  <tr className="border-b"><td className="p-2 text-gray-500">Symbol</td><td className="p-2 font-bold">Ⓢ</td></tr>
                  <tr className="border-b"><td className="p-2 text-gray-500">New User Credit Limit</td><td className="p-2">50 Ⓢ</td></tr>
                  <tr className="border-b"><td className="p-2 text-gray-500">Max Individual Limit</td><td className="p-2">500 Ⓢ</td></tr>
                  <tr className="border-b"><td className="p-2 text-gray-500">Max Partner Limit</td><td className="p-2">5,000 Ⓢ</td></tr>
                  <tr className="border-b"><td className="p-2 text-gray-500">Trust Score Multiplier</td><td className="p-2">5x (credit_limit = trust × 5)</td></tr>
                  <tr><td className="p-2 text-gray-500">Interest Rate</td><td className="p-2 text-green-600 font-bold">0% (always free)</td></tr>
                </tbody>
              </table>
            </div>

            {/* Issue Currency */}
            <div className="bg-white border rounded-lg p-4">
              <h2 className="font-bold mb-3">🏦 Issue Currency (Mint)</h2>
              <p className="text-xs text-gray-500 mb-3">Issue Ⓢ to a user's wallet (platform-level minting)</p>
              <div className="space-y-2">
                <input placeholder="User ID (e.g. teen_rahul_16m)" value={issueForm.user_id} onChange={e => setIssueForm({...issueForm, user_id: e.target.value})} className="border rounded p-2 w-full text-sm" />
                <div className="flex gap-2">
                  <input type="number" value={issueForm.amount} onChange={e => setIssueForm({...issueForm, amount: Number(e.target.value)})} className="border rounded p-2 w-24 text-sm" />
                  <input placeholder="Reason" value={issueForm.reason} onChange={e => setIssueForm({...issueForm, reason: e.target.value})} className="border rounded p-2 flex-1 text-sm" />
                </div>
                <button onClick={issueCurrency} className="bg-emerald-600 text-white px-4 py-2 rounded text-sm hover:bg-emerald-700 w-full">Issue Ⓢ</button>
                {msg && <p className={`text-sm ${msg.includes("❌") ? "text-red-600" : "text-green-600"}`}>{msg}</p>}
              </div>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-white border rounded-lg p-4">
            <h2 className="font-bold mb-3">👥 Currency Accounts</h2>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr><th className="p-2 text-left">User</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Balance</th><th className="p-2 text-left">Credit Limit</th><th className="p-2 text-left">Available</th><th className="p-2 text-left">Trust Score</th></tr>
              </thead>
              <tbody>
                {accounts.map((a: any) => (
                  <tr key={a.user_id} className="border-t">
                    <td className="p-2 font-mono text-xs">{a.user_id}</td>
                    <td className="p-2 capitalize">{a.account_type}</td>
                    <td className="p-2 font-bold">{a.balance} Ⓢ</td>
                    <td className="p-2">{a.credit_limit} Ⓢ</td>
                    <td className="p-2 text-green-600">{a.available} Ⓢ</td>
                    <td className="p-2">{a.trust_score}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How It Works */}
          <div className="bg-gradient-to-r from-violet-50 to-blue-50 border rounded-lg p-4 mt-6">
            <h2 className="font-bold mb-2">💡 How Ⓢ Currency Works (WIR/Sardex Model)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium">1. Earn</p>
                <p className="text-gray-600">Teens complete tasks → earn Ⓢ credits into their wallet</p>
              </div>
              <div>
                <p className="font-medium">2. Spend</p>
                <p className="text-gray-600">Spend Ⓢ on rewards (data packs, streaming, food, gaming)</p>
              </div>
              <div>
                <p className="font-medium">3. Transfer (Phase 3)</p>
                <p className="text-gray-600">P2P transfers between users. Mutual credit lines for trusted members.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Digital Currency",
})

export default BarterCurrencyPage
