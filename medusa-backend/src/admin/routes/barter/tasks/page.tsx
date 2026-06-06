import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

const PK = "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8"
const headers = { "x-publishable-api-key": PK, "Content-Type": "application/json" }

const BarterTasksPage = () => {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: "", description: "", category: "digital", reward_credits: 30,
    estimated_minutes: 30, difficulty: "easy", verification_type: "self_report",
    location_type: "remote", max_applicants: 5, tags: ""
  })

  const fetchTasks = async () => {
    const res = await fetch("/store/barter-tasks?limit=50", { headers: { "x-publishable-api-key": PK } })
    const data = await res.json()
    setTasks(data.tasks || [])
    setLoading(false)
  }

  useEffect(() => { fetchTasks() }, [])

  const createTask = async () => {
    await fetch("/store/barter-tasks", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...form, posted_by: "platform", poster_type: "platform", reward_credits: Number(form.reward_credits), estimated_minutes: Number(form.estimated_minutes), max_applicants: Number(form.max_applicants) })
    })
    setShowForm(false)
    setForm({ title: "", description: "", category: "digital", reward_credits: 30, estimated_minutes: 30, difficulty: "easy", verification_type: "self_report", location_type: "remote", max_applicants: 5, tags: "" })
    fetchTasks()
  }

  const statusColor = (s: string) => {
    if (s === "open") return "bg-green-100 text-green-800"
    if (s === "in_progress") return "bg-yellow-100 text-yellow-800"
    if (s === "completed") return "bg-blue-100 text-blue-800"
    if (s === "cancelled") return "bg-red-100 text-red-800"
    return "bg-gray-100 text-gray-800"
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">📋 Barter Tasks</h1>
          <p className="text-gray-500">Manage tasks that teens can pick up and earn Ⓢ credits</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700">
          {showForm ? "Cancel" : "+ New Task"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-lg p-4 mb-6 space-y-3">
          <h3 className="font-bold">Create New Task</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Task Title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="border rounded p-2" />
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border rounded p-2">
              <option value="digital">🖥️ Digital</option>
              <option value="creative">🎨 Creative</option>
              <option value="peer_help">📚 Peer Help</option>
              <option value="local">📍 Local</option>
              <option value="community">🌱 Community</option>
            </select>
            <input type="number" placeholder="Reward Credits (Ⓢ)" value={form.reward_credits} onChange={e => setForm({...form, reward_credits: Number(e.target.value)})} className="border rounded p-2" />
            <select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})} className="border rounded p-2">
              <option value="easy">Easy (14+ can do)</option>
              <option value="medium">Medium (needs some skill)</option>
              <option value="hard">Hard (experienced only)</option>
            </select>
            <input type="number" placeholder="Estimated Minutes" value={form.estimated_minutes} onChange={e => setForm({...form, estimated_minutes: Number(e.target.value)})} className="border rounded p-2" />
            <input type="number" placeholder="Max Applicants" value={form.max_applicants} onChange={e => setForm({...form, max_applicants: Number(e.target.value)})} className="border rounded p-2" />
            <select value={form.verification_type} onChange={e => setForm({...form, verification_type: e.target.value})} className="border rounded p-2">
              <option value="self_report">Self Report</option>
              <option value="photo_proof">Photo Proof</option>
              <option value="peer_review">Peer Review</option>
              <option value="auto">Auto Verify</option>
            </select>
            <select value={form.location_type} onChange={e => setForm({...form, location_type: e.target.value})} className="border rounded p-2">
              <option value="remote">Remote (from anywhere)</option>
              <option value="local">Local (in Rohtak)</option>
              <option value="both">Both</option>
            </select>
          </div>
          <textarea placeholder="Description *" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="border rounded p-2 w-full" rows={2} />
          <input placeholder="Tags (comma-separated, e.g. design,canva,creative)" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="border rounded p-2 w-full" />
          <button onClick={createTask} disabled={!form.title || !form.description} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">✓ Create Task</button>
        </div>
      )}

      {loading ? <p>Loading tasks...</p> : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Credits</th>
                <th className="text-left p-3">Difficulty</th>
                <th className="text-left p-3">Applicants</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-gray-400">{t.tags}</p>
                  </td>
                  <td className="p-3 capitalize">{t.category?.replace("_", " ")}</td>
                  <td className="p-3 font-bold text-violet-600">{Number(t.reward_credits)} Ⓢ</td>
                  <td className="p-3 capitalize">{t.difficulty}</td>
                  <td className="p-3">{t.current_applicants}/{t.max_applicants}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-medium ${statusColor(t.status)}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 bg-gray-50 text-sm text-gray-500">Total: {tasks.length} tasks</div>
        </div>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Barter Tasks",
})

export default BarterTasksPage
