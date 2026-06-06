import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

const PK = "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8"

const BarterRewardsPage = () => {
  const [rewards, setRewards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: "", description: "", category: "data_pack", credit_cost: 30,
    retail_value: 0, stock_total: 50, delivery_type: "voucher", is_featured: false
  })

  const fetchRewards = async () => {
    const res = await fetch("/store/barter-rewards?limit=50", { headers: { "x-publishable-api-key": PK } })
    const data = await res.json()
    setRewards(data.rewards || [])
    setLoading(false)
  }

  useEffect(() => { fetchRewards() }, [])

  const createReward = async () => {
    await fetch("/store/barter-rewards", {
      method: "POST",
      headers: { "x-publishable-api-key": PK, "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, credit_cost: Number(form.credit_cost), retail_value: Number(form.retail_value), stock_total: Number(form.stock_total) })
    })
    setShowForm(false)
    fetchRewards()
  }

  const categoryIcon = (c: string) => {
    const icons: any = { data_pack: "📱", streaming: "🎬", gaming: "🎮", food: "🍕", education: "📚", fashion: "👕", experience: "🎯" }
    return icons[c] || "🎁"
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">🎁 Barter Rewards</h1>
          <p className="text-gray-500">Manage rewards teens can redeem with Ⓢ credits</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700">
          {showForm ? "Cancel" : "+ New Reward"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-lg p-4 mb-6 space-y-3">
          <h3 className="font-bold">Add New Reward</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Reward Title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="border rounded p-2" />
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border rounded p-2">
              <option value="data_pack">📱 Data Pack</option>
              <option value="streaming">🎬 Streaming</option>
              <option value="gaming">🎮 Gaming</option>
              <option value="food">🍕 Food</option>
              <option value="education">📚 Education</option>
              <option value="fashion">👕 Fashion</option>
              <option value="experience">🎯 Experience</option>
            </select>
            <input type="number" placeholder="Credit Cost (Ⓢ) *" value={form.credit_cost} onChange={e => setForm({...form, credit_cost: Number(e.target.value)})} className="border rounded p-2" />
            <input type="number" placeholder="Retail Value (₹)" value={form.retail_value} onChange={e => setForm({...form, retail_value: Number(e.target.value)})} className="border rounded p-2" />
            <input type="number" placeholder="Stock Quantity" value={form.stock_total} onChange={e => setForm({...form, stock_total: Number(e.target.value)})} className="border rounded p-2" />
            <select value={form.delivery_type} onChange={e => setForm({...form, delivery_type: e.target.value})} className="border rounded p-2">
              <option value="voucher">🎫 Voucher Code</option>
              <option value="digital">⚡ Digital (Instant)</option>
              <option value="physical">📦 Physical Delivery</option>
            </select>
          </div>
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="border rounded p-2 w-full" rows={2} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})} />
            ⭐ Featured (show at top for teens)
          </label>
          <button onClick={createReward} disabled={!form.title} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">✓ Create Reward</button>
        </div>
      )}

      {loading ? <p>Loading rewards...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map(r => (
            <div key={r.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-sm">{categoryIcon(r.category)} {r.title}</h3>
                {r.is_featured && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">⭐</span>}
              </div>
              <p className="text-xs text-gray-500 mt-1 capitalize">{r.category?.replace("_", " ")} • {r.delivery_type}</p>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-lg font-bold text-violet-600">{Number(r.credit_cost)} Ⓢ</span>
                <span className="text-sm text-gray-400">₹{Number(r.retail_value)}</span>
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>Stock: {r.stock_remaining}/{r.stock_total}</span>
                <span className={r.is_active ? "text-green-600" : "text-red-600"}>{r.is_active ? "Active" : "Inactive"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 text-sm text-gray-500">Total: {rewards.length} rewards</div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Barter Rewards",
})

export default BarterRewardsPage
