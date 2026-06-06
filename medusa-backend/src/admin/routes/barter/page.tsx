import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

const PK = "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8"

const BarterDashboardPage = () => {
  const [stats, setStats] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [tasksRes, rewardsRes, currencyRes] = await Promise.all([
          fetch("/store/barter-tasks?limit=100", { headers: { "x-publishable-api-key": PK } }),
          fetch("/store/barter-rewards?limit=100", { headers: { "x-publishable-api-key": PK } }),
          fetch("/store/barter-currency/stats", { headers: { "x-publishable-api-key": PK } }),
        ])
        const tasks = await tasksRes.json()
        const rewards = await rewardsRes.json()
        const currency = await currencyRes.json()

        const taskList = tasks.tasks || []
        setStats({
          total_tasks: taskList.length,
          open_tasks: taskList.filter((t: any) => t.status === "open").length,
          completed_tasks: taskList.filter((t: any) => t.status === "completed").length,
          in_progress_tasks: taskList.filter((t: any) => t.status === "in_progress").length,
          total_rewards: (rewards.rewards || []).length,
          total_supply: currency.stats?.total_supply || 0,
          active_accounts: currency.stats?.active_accounts || 0,
          currency_name: currency.stats?.currency_name || "Ⓢ",
        })
      } catch (e: any) {
        setError(e.message)
      }
    }
    fetchStats()
  }, [])

  const StatCard = ({ label, value, color }: { label: string; value: any; color: string }) => (
    <div className={`bg-white border rounded-lg p-4 ${color}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">🔄 Barter System Dashboard</h1>
      <p className="text-gray-500 mb-6">Youth engagement platform — teens earn Ⓢ credits by completing tasks, spend on rewards</p>

      {error && <p className="text-red-500 mb-4">Error: {error}</p>}

      {stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Tasks" value={stats.total_tasks} color="border-l-4 border-l-blue-500" />
            <StatCard label="Open Tasks" value={stats.open_tasks} color="border-l-4 border-l-green-500" />
            <StatCard label="In Progress" value={stats.in_progress_tasks} color="border-l-4 border-l-yellow-500" />
            <StatCard label="Completed Tasks" value={stats.completed_tasks} color="border-l-4 border-l-violet-500" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Rewards" value={stats.total_rewards} color="border-l-4 border-l-orange-500" />
            <StatCard label="Currency in Circulation" value={`${stats.total_supply} Ⓢ`} color="border-l-4 border-l-emerald-500" />
            <StatCard label="Active Accounts" value={stats.active_accounts} color="border-l-4 border-l-cyan-500" />
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h2 className="font-bold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <a href="/app/barter/tasks" className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center hover:bg-blue-100 no-underline">
                <p className="font-medium text-blue-800">📋 Manage Tasks</p>
                <p className="text-xs text-gray-500">Add/edit tasks for teens</p>
              </a>
              <a href="/app/barter/rewards" className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center hover:bg-orange-100 no-underline">
                <p className="font-medium text-orange-800">🎁 Manage Rewards</p>
                <p className="text-xs text-gray-500">Add rewards & stock</p>
              </a>
              <a href="/app/barter/users" className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-center hover:bg-violet-100 no-underline">
                <p className="font-medium text-violet-800">👥 User Lookup</p>
                <p className="text-xs text-gray-500">View profiles & give bonus</p>
              </a>
              <a href="/app/barter/applications" className="bg-green-50 border border-green-200 rounded-lg p-3 text-center hover:bg-green-100 no-underline">
                <p className="font-medium text-green-800">✅ Review Tasks</p>
                <p className="text-xs text-gray-500">Approve/reject submissions</p>
              </a>
            </div>
          </div>

          <div className="bg-gray-50 border rounded-lg p-4 mt-6">
            <h2 className="font-bold mb-2">📋 Sample Test Users</h2>
            <p className="text-sm text-gray-500 mb-2">Use these in "User Lookup" to see the system in action:</p>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500"><th className="p-1">User ID</th><th className="p-1">Balance</th><th className="p-1">Activity</th></tr></thead>
              <tbody>
                <tr><td className="p-1 font-mono text-xs">teen_rahul_16m</td><td className="p-1">~190 Ⓢ</td><td className="p-1">3 tasks, Level 2</td></tr>
                <tr><td className="p-1 font-mono text-xs">teen_priya_15f</td><td className="p-1">~160 Ⓢ</td><td className="p-1">2 tasks done</td></tr>
                <tr><td className="p-1 font-mono text-xs">teen_amit_17m</td><td className="p-1">~75 Ⓢ</td><td className="p-1">1 task done</td></tr>
                <tr><td className="p-1 font-mono text-xs">teen_neha_14f</td><td className="p-1">0 Ⓢ</td><td className="p-1">Fresh user</td></tr>
                <tr><td className="p-1 font-mono text-xs">teen_vikram_16m</td><td className="p-1">0 Ⓢ</td><td className="p-1">Fresh user</td></tr>
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-gray-500">Loading dashboard data...</p>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Barter System",
  icon: "currency-dollar",
})

export default BarterDashboardPage
