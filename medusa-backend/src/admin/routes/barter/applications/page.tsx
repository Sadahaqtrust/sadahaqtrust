import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

const BarterApplicationsPage = () => {
  const [tasks, setTasks] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const headers = { "x-publishable-api-key": (window as any).__MEDUSA_PUBLISHABLE_KEY__ || "" }

  useEffect(() => {
    const fetchTasks = async () => {
      const res = await fetch("/store/barter-tasks?status=in_progress&limit=50", { headers })
      const openRes = await fetch("/store/barter-tasks?status=open&limit=50", { headers })
      const data = await res.json()
      const openData = await openRes.json()
      setTasks([...(data.tasks || []), ...(openData.tasks || [])])
      setLoading(false)
    }
    fetchTasks()
  }, [])

  const viewApplications = async (taskId: string) => {
    const res = await fetch(`/store/barter-tasks/${taskId}`, { headers })
    const data = await res.json()
    setSelectedTask(data.task)
  }

  const handleAction = async (appId: string, action: string, extra?: any) => {
    await fetch(`/store/barter-tasks/applications/${appId}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra })
    })
    if (selectedTask) viewApplications(selectedTask.id)
  }

  const statusBadge = (s: string) => {
    const colors: any = {
      applied: "bg-blue-100 text-blue-800",
      accepted: "bg-cyan-100 text-cyan-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      submitted: "bg-orange-100 text-orange-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    }
    return <span className={`px-2 py-1 rounded text-xs ${colors[s] || "bg-gray-100"}`}>{s}</span>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Task Applications</h1>
      <p className="text-gray-500 mb-6">Review and approve teen task submissions</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Task List */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-bold mb-3">Active Tasks ({tasks.length})</h2>
          {loading ? <p>Loading...</p> : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tasks.map(t => (
                <div key={t.id} onClick={() => viewApplications(t.id)} className="border rounded p-2 cursor-pointer hover:bg-gray-50">
                  <p className="font-medium text-sm">{t.title}</p>
                  <p className="text-xs text-gray-500">{t.category} • {Number(t.reward_credits)} Ⓢ • {t.current_applicants} applied</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Applications Detail */}
        <div className="bg-white border rounded-lg p-4">
          {selectedTask ? (
            <>
              <h2 className="font-bold mb-1">{selectedTask.title}</h2>
              <p className="text-sm text-gray-500 mb-3">{Number(selectedTask.reward_credits)} Ⓢ • {selectedTask.verification_type}</p>

              {selectedTask.applications?.length === 0 ? (
                <p className="text-gray-400">No applications yet</p>
              ) : (
                <div className="space-y-3">
                  {selectedTask.applications.map((app: any) => (
                    <div key={app.id} className="border rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">{app.applicant_id}</span>
                        {statusBadge(app.status)}
                      </div>
                      {app.proof_url && <p className="text-xs text-blue-600 mb-1">Proof: <a href={app.proof_url} target="_blank" rel="noreferrer">{app.proof_url}</a></p>}
                      {app.proof_notes && <p className="text-xs text-gray-500 mb-2">Notes: {app.proof_notes}</p>}

                      <div className="flex gap-2">
                        {app.status === "applied" && (
                          <button onClick={() => handleAction(app.id, "accept")} className="bg-cyan-600 text-white px-2 py-1 rounded text-xs">Accept</button>
                        )}
                        {app.status === "submitted" && (
                          <>
                            <button onClick={() => handleAction(app.id, "approve", { rating: 5, feedback: "Good work!" })} className="bg-green-600 text-white px-2 py-1 rounded text-xs">✓ Approve</button>
                            <button onClick={() => handleAction(app.id, "reject", { reason: "Incomplete submission" })} className="bg-red-600 text-white px-2 py-1 rounded text-xs">✗ Reject</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-400">← Select a task to view applications</p>
          )}
        </div>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Review Applications",
  icon: "check-circle",
})

export default BarterApplicationsPage
