import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

const PK = "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8"

const BarterWalletPage = () => {
  const [wallets, setWallets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    const fetchWallets = async () => {
      const sampleUsers = ["teen_rahul_16m", "teen_priya_15f", "teen_amit_17m", "teen_neha_14f", "teen_vikram_16m", "test_teen_001", "teen_e2e_final"]
      const walletData: any[] = []
      for (const uid of sampleUsers) {
        try {
          const res = await fetch(`/store/barter-wallet?user_id=${uid}`, { headers: { "x-publishable-api-key": PK } })
          const data = await res.json()
          if (data.wallet) walletData.push({ user_id: uid, ...data.wallet })
        } catch (e) { /* skip */ }
      }
      setWallets(walletData.sort((a, b) => b.balance - a.balance))
      setLoading(false)
    }
    fetchWallets()
  }, [])

  const viewTransactions = async (userId: string) => {
    setSelectedUser(userId)
    const res = await fetch(`/store/barter-wallet/transactions?user_id=${userId}&limit=20`, { headers: { "x-publishable-api-key": PK } })
    const data = await res.json()
    setTransactions(data.transactions || [])
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">💰 Wallet & Ledger</h1>
      <p className="text-gray-500 mb-6">Double-entry ledger system — tracks all Ⓢ credit/debit movements</p>

      {loading ? <p>Loading...</p> : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4 border-l-4 border-l-green-500">
              <p className="text-sm text-gray-500">Total Wallets</p>
              <p className="text-2xl font-bold">{wallets.length}</p>
            </div>
            <div className="bg-white border rounded-lg p-4 border-l-4 border-l-emerald-500">
              <p className="text-sm text-gray-500">Total Balance (all users)</p>
              <p className="text-2xl font-bold text-emerald-600">{wallets.reduce((s, w) => s + w.balance, 0)} Ⓢ</p>
            </div>
            <div className="bg-white border rounded-lg p-4 border-l-4 border-l-blue-500">
              <p className="text-sm text-gray-500">Total Earned (lifetime)</p>
              <p className="text-2xl font-bold text-blue-600">{wallets.reduce((s, w) => s + w.lifetime_earned, 0)} Ⓢ</p>
            </div>
            <div className="bg-white border rounded-lg p-4 border-l-4 border-l-orange-500">
              <p className="text-sm text-gray-500">Total Spent (lifetime)</p>
              <p className="text-2xl font-bold text-orange-600">{wallets.reduce((s, w) => s + w.lifetime_spent, 0)} Ⓢ</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Wallets Table */}
            <div className="bg-white border rounded-lg p-4">
              <h2 className="font-bold mb-3">👛 All Wallets</h2>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr><th className="p-2 text-left">User</th><th className="p-2 text-right">Balance</th><th className="p-2 text-right">Earned</th><th className="p-2 text-right">Spent</th><th className="p-2"></th></tr>
                </thead>
                <tbody>
                  {wallets.map(w => (
                    <tr key={w.user_id} className={`border-t cursor-pointer hover:bg-gray-50 ${selectedUser === w.user_id ? "bg-violet-50" : ""}`} onClick={() => viewTransactions(w.user_id)}>
                      <td className="p-2 font-mono text-xs">{w.user_id}</td>
                      <td className="p-2 text-right font-bold text-green-600">{w.balance}</td>
                      <td className="p-2 text-right text-blue-600">{w.lifetime_earned}</td>
                      <td className="p-2 text-right text-orange-600">{w.lifetime_spent}</td>
                      <td className="p-2 text-right text-xs text-gray-400">→</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Transaction Ledger */}
            <div className="bg-white border rounded-lg p-4">
              <h2 className="font-bold mb-3">📜 Transaction Ledger {selectedUser && <span className="text-sm font-normal text-gray-500">— {selectedUser}</span>}</h2>
              {!selectedUser ? (
                <p className="text-gray-400 text-sm">← Click a wallet to view transactions</p>
              ) : transactions.length === 0 ? (
                <p className="text-gray-400 text-sm">No transactions yet</p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0"><tr><th className="p-2 text-left">Type</th><th className="p-2 text-right">Amount</th><th className="p-2 text-right">Balance After</th><th className="p-2 text-left">Description</th></tr></thead>
                    <tbody>
                      {transactions.map((t: any) => (
                        <tr key={t.id} className="border-t">
                          <td className="p-2"><span className={`px-1.5 py-0.5 rounded ${t.type === "credit" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{t.type}</span></td>
                          <td className="p-2 text-right font-bold">{t.type === "credit" ? "+" : "-"}{Number(t.amount)}</td>
                          <td className="p-2 text-right">{Number(t.balance_after)}</td>
                          <td className="p-2 text-gray-600 truncate max-w-[150px]">{t.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* How Wallet Works */}
          <div className="bg-gray-50 border rounded-lg p-4 mt-6">
            <h2 className="font-bold mb-2">📋 Wallet Features</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-white rounded p-2"><p className="font-medium">Credit</p><p className="text-xs text-gray-500">Earn Ⓢ from tasks</p></div>
              <div className="bg-white rounded p-2"><p className="font-medium">Debit</p><p className="text-xs text-gray-500">Spend on rewards</p></div>
              <div className="bg-white rounded p-2"><p className="font-medium">Escrow</p><p className="text-xs text-gray-500">Hold during active tasks</p></div>
              <div className="bg-white rounded p-2"><p className="font-medium">History</p><p className="text-xs text-gray-500">Full audit trail</p></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Wallet & Ledger",
})

export default BarterWalletPage
