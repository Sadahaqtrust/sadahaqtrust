export const dynamic = "force-dynamic";
import { getVolunteers } from "@/lib/sadahaqDb";
import Link from "next/link";

export default async function VolunteersPage() {
  let volunteers: any[] = [];
  try {
    volunteers = await getVolunteers(100) as any[];
  } catch { }

  if (volunteers.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50">
        <div className="max-w-lg w-full text-center">
          <div className="text-8xl mb-6">🚧</div>
          <h1 className="text-3xl font-extrabold text-[#F47216] mb-3">Work in Progress</h1>
          <p className="text-gray-600 text-lg mb-2">Volunteers section is coming soon!</p>
          <p className="text-gray-400 text-sm mb-8">We're setting up the volunteer directory.</p>
          <Link href="/sadahaq" className="bg-[#00A650] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#F47216] transition-all text-sm">← साद्दा हक़ पर वापस</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold text-white mb-2">Volunteers</h1>
      <div className="w-16 h-1 bg-[#00A650] rounded mb-8"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {volunteers.map((v: any) => (
          <div key={v.id} className="bg-white rounded-2xl shadow p-5 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">🤝</span>
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${v.on_duty ? "bg-[#00A650] text-white" : "bg-gray-100 text-gray-500"}`}>
                {v.on_duty ? "On Duty" : "Off Duty"}
              </span>
            </div>
            {v.dept_expertise && <p className="text-[#F47216] font-semibold text-sm">🎯 {v.dept_expertise}</p>}
            <div className="flex gap-4 mt-3 text-sm text-gray-500">
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${v.volunteer_type === "paid" ? "bg-[#F47216]/10 text-[#F47216]" : "bg-gray-100 text-gray-500"}`}>
                {v.volunteer_type}
              </span>
              {v.rating && <span>⭐ {v.rating}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
