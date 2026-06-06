"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online"
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

// Subdomain → category_id mapping (detect which service subdomain we're on)
const SUBDOMAIN_CAT: Record<string, string> = {
  advocate: "cat_lawyer", lawyer: "cat_lawyer", legal: "cat_lawyer",
  ca: "cat_ca", accountant: "cat_ca", cs: "cat_cs",
  property: "cat_property", realestate: "cat_property",
  insurance: "cat_insurance", architect: "cat_architect",
  interior: "cat_interior", notary: "cat_notary", hr: "cat_hr",
  civilengineer: "cat_civil_eng", tax: "cat_tax_consultant",
  gst: "cat_gst_consultant", finance: "cat_financial_planner",
  stockadvisor: "cat_stock_advisor", loan: "cat_loan_agent",
  mutualfund: "cat_mutual_fund", surveyor: "cat_surveyor",
  valuer: "cat_valuer", townplanner: "cat_town_planner",
  structural: "cat_structural_eng", mep: "cat_mep_eng",
  landscape: "cat_landscape", vastu: "cat_vastu",
  immigration: "cat_immigration", visa: "cat_visa_agent",
  passport: "cat_passport_agent", detective: "cat_detective",
  security: "cat_security_guard", eventmanagement: "cat_event_mgmt",
  electrician: "cat_electrician", plumber: "cat_plumber",
  carpenter: "cat_carpenter", painter: "cat_painter",
  cleaning: "cat_cleaning", pestcontrol: "cat_pest",
  salon: "cat_womens_salon", beauty: "cat_womens_salon",
  gym: "cat_fitness", yoga: "cat_yoga",
  tutor: "cat_tutor_6_10", coaching: "cat_coaching",
  photography: "cat_photo", catering: "cat_caterer",
  dentist: "cat_dentist", vet: "cat_vet",
  pharmacy: "cat_doctor", health: "cat_doctor", hospital: "cat_doctor",
  driving: "cat_driving", music: "cat_music",
  laundry: "cat_laundry", tailoring: "cat_tailor", movers: "cat_packers",
}

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
  const [subdomainMode, setSubdomainMode] = useState(false)
  const [serviceName, setServiceName] = useState("Professional Service Providers")

  // Detect subdomain and auto-select category
  useEffect(() => {
    const host = window.location.hostname
    if (host.endsWith(".digitalrohtak.online") && host !== "professionalservices.digitalrohtak.online") {
      const sub = host.split(".")[0]
      const catId = SUBDOMAIN_CAT[sub]
      if (catId) {
        setSelectedCat(catId)
        setSubdomainMode(true)
        setServiceName(sub.charAt(0).toUpperCase() + sub.slice(1) + " Services")
      }
    }
  }, [])

  useEffect(() => {
    fetch(`${MEDUSA_URL}/store/service-categories`, { headers: { "x-publishable-api-key": PK } })
      .then(r => r.json())
      .then(d => {
        // Load ALL subcategories from all parent categories for service subdomains
        const allSubs: Subcat[] = []
        for (const cat of (d.categories || [])) {
          allSubs.push(...(cat.subcategories || []))
        }
        const prof = d.categories?.find((c: any) => c.id === "cat_professional")
        setSubcats(prof?.subcategories || [])
        // If subdomain mode, update service name from category data
        if (subdomainMode && selectedCat) {
          const found = allSubs.find((s: any) => s.id === selectedCat)
          if (found) setServiceName(found.name)
        }
      })
  }, [subdomainMode, selectedCat])

  useEffect(() => {
    setLoading(true)
    // In subdomain mode, filter by specific category; otherwise show all professional
    const catId = selectedCat || "cat_professional"
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
          <span className="whitespace-nowrap">Register as Provider</span>
        </Link>
        <div className="max-w-2xl mx-auto text-center pt-4 md:pt-2">
          <div className="text-4xl mb-1">🏛️</div>
          <h1 className="text-2xl font-extrabold text-white mb-1">{serviceName}</h1>
          <p className="text-white/80 text-sm">{subdomainMode ? `Find ${serviceName} in Rohtak` : "Lawyers, CAs, Architects & more in Rohtak"}</p>
        </div>
      </div>

      {/* Category filter chips — hidden in subdomain mode (already filtered) */}
      {!subdomainMode && (
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
      )}

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
