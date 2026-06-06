"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "";

export default function TasksPage() {
  const { customer, loading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [applying, setApplying] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!loading && !customer) router.push("/auth/login?from=/barter/tasks");
  }, [loading, customer]);

  useEffect(() => {
    const params = filter === "all" ? "" : `?category=${filter}`;
    fetch(`${API}/store/barter-tasks${params}`, { headers: { "x-publishable-api-key": PK } })
      .then(r => r.json()).then(d => setTasks(d.tasks || [])).catch(() => {});
  }, [filter]);

  const applyForTask = async (taskId: string) => {
    if (!customer) return;
    setApplying(taskId);
    setMsg("");
    const res = await fetch(`${API}/store/barter-tasks/${taskId}/apply`, {
      method: "POST",
      headers: { "x-publishable-api-key": PK, "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_id: customer.id }),
    });
    const data = await res.json();
    setApplying("");
    if (data.error) setMsg(`❌ ${data.error}`);
    else setMsg("✅ Applied! You'll be notified when accepted.");
    setTimeout(() => setMsg(""), 3000);
  };

  const categoryIcon: any = { digital: "🖥️", creative: "🎨", peer_help: "📚", local: "📍", community: "🌱" };

  if (loading || !customer) return <div className="p-4 text-white text-center">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-extrabold text-white">📋 Available Tasks</h1>
      <p className="text-white/70 text-sm">Complete tasks to earn Ⓢ Sadahaq credits</p>

      {msg && <div className="bg-white rounded-xl p-3 text-sm font-medium text-center">{msg}</div>}

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[{ k: "all", l: "All" }, { k: "digital", l: "🖥️ Digital" }, { k: "creative", l: "🎨 Creative" }, { k: "peer_help", l: "📚 Tutoring" }, { k: "community", l: "🌱 Community" }, { k: "local", l: "📍 Local" }].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filter === f.k ? "bg-white text-[#F47216]" : "bg-white/20 text-white"}`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Task Cards */}
      <div className="space-y-3">
        {tasks.map(t => (
          <div key={t.id} className="bg-white rounded-2xl p-4 shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-bold text-gray-800">{categoryIcon[t.category] || "📋"} {t.title}</p>
                <p className="text-xs text-gray-500 mt-1">{t.description?.slice(0, 80)}{t.description?.length > 80 ? "..." : ""}</p>
              </div>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold ml-2 whitespace-nowrap">
                +{Number(t.reward_credits)} Ⓢ
              </span>
            </div>
            <div className="flex justify-between items-center mt-3">
              <div className="flex gap-2 text-xs text-gray-400">
                <span>⏱️ {t.estimated_minutes}min</span>
                <span className="capitalize">• {t.difficulty}</span>
                <span>• {t.current_applicants}/{t.max_applicants}</span>
              </div>
              <button onClick={() => applyForTask(t.id)} disabled={applying === t.id || t.current_applicants >= t.max_applicants}
                className="bg-[#F47216] text-white px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">
                {applying === t.id ? "..." : t.current_applicants >= t.max_applicants ? "Full" : "Apply"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
