"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { isAdmin } from "@/lib/admin";

export default function PgDbPage() {
  const { customer, loading: authLoading } = useAuth();
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState("sadahaq_service_db");
  const [sql, setSql] = useState("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/pgdb").then(r => r.json()).then(d => {
      if (d.databases) setDatabases(d.databases);
    }).catch(() => {});
  }, []);

  async function runQuery() {
    if (!sql.trim()) return;
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/pgdb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sql.trim(), database: selectedDb }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else {
        setResult(data);
        setHistory(h => [sql.trim(), ...h.slice(0, 19)]);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setRunning(false);
  }

  if (authLoading) return <div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-4 border-white border-t-[#00A650] rounded-full animate-spin"></div></div>;

  if (!isAdmin(customer?.email)) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="bg-white rounded-2xl p-8 text-center shadow-xl">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-extrabold text-[#F47216]">Access Denied</h2>
          <p className="text-gray-500 mt-2">Admin login required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold text-white">PostgreSQL Console</h1>
        <span className="text-white/60 text-sm">👤 {customer?.email}</span>
      </div>

      {/* DB selector + SQL input */}
      <div className="bg-white rounded-2xl shadow-xl p-4 mb-4">
        <div className="flex gap-3 mb-3 flex-wrap">
          <div>
            <label className="text-[#F47216] font-bold text-xs block mb-1">DATABASE</label>
            <select value={selectedDb} onChange={e => setSelectedDb(e.target.value)}
              className="border-2 border-[#F47216] rounded-lg px-3 py-2 text-sm font-semibold text-gray-700">
              {databases.map(db => <option key={db} value={db}>{db}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[#F47216] font-bold text-xs block mb-1">QUICK</label>
            <div className="flex gap-1 flex-wrap">
              {[
                { label: "Tables", sql: "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" },
                { label: "Count All", sql: "SELECT schemaname||'.'||relname AS table, n_live_tup AS rows FROM pg_stat_user_tables ORDER BY n_live_tup DESC;" },
                { label: "DB Size", sql: "SELECT pg_size_pretty(pg_database_size(current_database()));" },
              ].map(q => (
                <button key={q.label} onClick={() => setSql(q.sql)}
                  className="text-xs bg-[#F47216]/10 text-[#F47216] px-2 py-1 rounded-full hover:bg-[#F47216] hover:text-white transition-colors">
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <textarea value={sql} onChange={e => setSql(e.target.value)}
          rows={4}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) runQuery(); }}
          className="w-full border-2 border-gray-200 focus:border-[#00A650] rounded-xl px-4 py-3 font-mono text-sm text-gray-800 outline-none resize-y"
          placeholder="SELECT * FROM ..." />

        <div className="flex items-center justify-between mt-2">
          <span className="text-gray-400 text-xs">Ctrl+Enter to run</span>
          <button onClick={runQuery} disabled={running}
            className="bg-[#00A650] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#F47216] transition-all disabled:opacity-60">
            {running ? "Running..." : "▶ Run SQL"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm font-mono">{error}</div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-4">
          <div className="bg-[#00A650] text-white px-4 py-2 text-sm flex justify-between">
            <span>{result.command} — {result.rowCount} row{result.rowCount !== 1 ? "s" : ""}</span>
            <span>{result.fields?.length} columns</span>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-400 text-xs">#</th>
                  {result.fields?.map((f: string) => (
                    <th key={f} className="px-3 py-2 text-left text-[#F47216] font-bold text-xs uppercase">{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows?.map((row: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 text-gray-300 text-xs">{i + 1}</td>
                    {result.fields?.map((f: string) => (
                      <td key={f} className="px-3 py-2 text-gray-700 max-w-[300px] truncate">{String(row[f] ?? "NULL")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white/10 rounded-xl p-4">
          <h3 className="text-white font-bold text-sm mb-2">History</h3>
          {history.map((h, i) => (
            <button key={i} onClick={() => setSql(h)}
              className="block w-full text-left text-white/70 text-xs font-mono py-1 hover:text-white truncate">
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
