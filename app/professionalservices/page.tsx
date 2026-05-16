"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online"
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

type Provider = {
  id: string
  full_name: string
  category_id: string
  locality: string
  experience_years: number
  rating_avg: number
  rating_count: number
  is_verified: boolean
  is_active: boolean
  services?: { name: string; base_price: number }[]
}

type Subcat = { id: string; name: string }

export default function ProfessionalServicesPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [subcats, setSubcats] = useState<Subcat[]>([])
  const [selectedCat, setSelectedCat] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${MEDUSA_URL}/store/service-categories`, { headers: { "x-publishable-api-key": PK } })
      .then(r => r.json())
      .then(d => {
        const prof = d.categories?.find((c: any) => c.id === "cat_professional")
        setSubcats(prof?.subcategories || [])
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    const catId = selectedCat || "cat_professional"
    // all=true returns verified + non-verified both
    fetch(`${MEDUSA_URL}/store/providers?category_id=${catId}&all=true`, { headers: { "x-publishable-api-key": PK } })
      .then(r => r.json())
      .then(d => { setProviders(d.providers || []); setLoading(false) })
  }, [selectedCat])

  return (
    <div className="min-h-screen bg-[#FFF8F0]">

      {/* Orange header */}
      <div className="bg-[#F47216] px-4 pt-6 pb-8 relative">
        <Link
          href="/professionalservices/register"
          className="absolute top-3 right-3 md:top-4 md:right-4 bg-white text-[#F47216] px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-extrabold text-[11px] md:text-xs shadow-md hover:bg-[#00A650] hover:text-white transition-all flex items-center gap-1"
        >
          <span className="text-sm md:text-base leading-none">＋</span>
          <span className="whitespace-nowrap">Register as Professional</span>
        </Link>
        <div className="max-w-2xl mx-auto text-center pt-4 md:pt-2">
          <div className="text-4xl mb-1">🏛️</div>
          <h1 className="text-2xl font-extrabold text-white mb-1">Professional Service Providers</h1>
          <p className="text-white/80 text-sm">Lawyers, CAs, Architects & more in Rohtak</p>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCat("")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!selectedCat ? "bg-[#F47216] text-white" : "bg-gray-100 text-gray-600 hover:bg-orange-50"}`}>
            All
          </button>
          {subcats.map(s => (
            <button key={s.id}
              onClick={() => setSelectedCat(s.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedCat === s.id ? "bg-[#F47216] text-white" : "bg-gray-100 text-gray-600 hover:bg-orange-50"}`}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Provider list */}
      <div className="max-w-2xl mx-auto px-4 mt-6 pb-10">

        {loading && (
          <div className="text-center py-12 text-[#F47216] font-bold">Loading...</div>
        )}

        {!loading && providers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🏛️</div>
            <p className="text-gray-500 font-semibold">No providers registered yet in this category</p>
          </div>
        )}

        {!loading && providers.length > 0 && (
          <>
            <p className="text-gray-400 text-xs mb-3">{providers.length} professional{providers.length > 1 ? "s" : ""} listed</p>
            <div className="flex flex-col gap-3">
              {providers.map(p => (
                <Link key={p.id} href={`/professionalservices/provider/${p.id}`}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-3 items-start hover:shadow-md hover:border-[#F47216] transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl flex-shrink-0">🏛️</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-gray-800 text-sm leading-tight">{p.full_name}</h3>
                        {/* Orange = verified, Red = not verified */}
                        {p.is_verified ? (
                          <span className="flex-shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#F47216] text-white">✓ Verified</span>
                        ) : (
                          <span className="flex-shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500 text-white">⏳ Pending</span>
                        )}
                      </div>
                      {p.locality && <p className="text-[#F47216] text-xs font-semibold mt-0.5">📍 {p.locality}, Rohtak</p>}
                      {p.experience_years > 0 && <p className="text-gray-400 text-xs mt-1">🏆 {p.experience_years} years experience</p>}
                      {p.rating_count > 0 && <p className="text-[#00A650] text-xs font-bold mt-1">⭐ {p.rating_avg} ({p.rating_count} reviews)</p>}
                      {p.services && p.services.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100 flex gap-3 flex-wrap">
                          {p.services.slice(0, 2).map((s, i) => (
                            <span key={i} className="text-xs text-gray-600">{s.name} <span className="font-bold text-[#F47216]">₹{s.base_price}</span></span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
