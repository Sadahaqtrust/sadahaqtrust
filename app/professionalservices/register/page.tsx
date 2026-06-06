"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online"
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

const PROF_ID_MAP: Record<string, { org: string; label: string }> = {
  cat_lawyer:    { org: "Bar Council of India / State Bar Council", label: "Bar Council Enrollment Number" },
  cat_ca:        { org: "Institute of Chartered Accountants of India (ICAI)", label: "ICAI Membership Number" },
  cat_cs:        { org: "Institute of Company Secretaries of India (ICSI)", label: "ICSI Membership Number" },
  cat_architect: { org: "Council of Architecture India (COA)", label: "COA Registration Number" },
  cat_civil_eng: { org: "Institution of Engineers India", label: "IE Membership Number" },
  cat_structural_eng: { org: "Institution of Engineers India", label: "IE Membership Number" },
  cat_mep_eng:   { org: "Institution of Engineers India", label: "IE Membership Number" },
  cat_surveyor:  { org: "Survey of India / State Authority", label: "License Number" },
  cat_valuer:    { org: "IBBI (Insolvency & Bankruptcy Board)", label: "Valuer Registration Number" },
  cat_town_planner: { org: "Institute of Town Planners India", label: "ITPI Membership Number" },
}

// Subdomain → category_id for auto-selecting service type
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

const EXTRA_ATTRS: Record<string, { key: string; label: string; type: string; options?: string[] }[]> = {
  cat_lawyer: [
    { key: "practice_areas", label: "Practice Areas", type: "multiselect", options: ["Criminal","Civil","Divorce","Property","Consumer","Corporate","Labour","Cheque Bounce","Documentation","Tax"] },
    { key: "courts", label: "Courts Practiced In", type: "multiselect", options: ["District Court Rohtak","Punjab & Haryana High Court","Supreme Court","Consumer Forum","Labour Court"] },
    { key: "consultation_modes", label: "Consultation Mode", type: "multiselect", options: ["In-person","Video Call","Phone Call"] },
  ],
  cat_ca: [
    { key: "specialization", label: "Specialization", type: "multiselect", options: ["GST","Income Tax","Audit","Company Registration","ROC Filing","TDS"] },
    { key: "consultation_modes", label: "Consultation Mode", type: "multiselect", options: ["In-person","Video Call","Phone Call"] },
  ],
  cat_architect: [
    { key: "project_types", label: "Project Types", type: "multiselect", options: ["Residential","Commercial","Industrial","Interior","Renovation"] },
  ],
  cat_property: [
    { key: "property_types", label: "Property Types", type: "multiselect", options: ["Residential","Commercial","Agricultural","Industrial","Rental"] },
    { key: "rera_number", label: "RERA Registration Number", type: "text" },
  ],
  cat_insurance: [
    { key: "insurance_types", label: "Insurance Types", type: "multiselect", options: ["Life","Health","Vehicle","Property","Business"] },
    { key: "irda_number", label: "IRDA License Number", type: "text" },
  ],
}

type Subcat = { id: string; name: string }

const inputCls = "w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none bg-white text-gray-900"
const labelCls = "block text-sm font-semibold text-gray-700 mb-1"

export default function RegisterProfessionalPage() {
  const router = useRouter()
  const [subcats, setSubcats] = useState<Subcat[]>([])
  const [form, setForm] = useState<Record<string, any>>({
    full_name: "", mobile: "", email: "", gender: "",
    category_id: "", locality: "", pincode: "124001",
    experience_years: "", short_bio: "",
    working_days: "", working_hours_start: "09:00", working_hours_end: "18:00",
    slot_duration_minutes: 60, accepts_cash: true, accepts_upi: true,
    id_proof_type: "", id_proof_number: "", prof_id_number: "",
    consultation_fee: "", consultation_duration: 30,
  })
  const [extras, setExtras] = useState<Record<string, string[]>>({})
  const [pin, setPin] = useState(["", "", "", ""])
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""])
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const confirmRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch(`${MEDUSA_URL}/store/service-categories`, { headers: { "x-publishable-api-key": PK } })
      .then(r => r.json())
      .then(d => {
        // Load all subcategories from all parent categories
        const allSubs: Subcat[] = []
        for (const cat of (d.categories || [])) {
          allSubs.push(...(cat.subcategories || []))
        }
        setSubcats(allSubs)
      })

    // Auto-select category based on subdomain
    const host = window.location.hostname
    if (host.endsWith(".digitalrohtak.online") && host !== "professionalservices.digitalrohtak.online") {
      const sub = host.split(".")[0]
      const catId = SUBDOMAIN_CAT[sub]
      if (catId) set("category_id", catId)
    }
  }, [])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const toggleExtra = (key: string, val: string) => {
    setExtras(e => {
      const cur = e[key] || []
      return { ...e, [key]: cur.includes(val) ? cur.filter((x: string) => x !== val) : [...cur, val] }
    })
  }

  const handlePinInput = (val: string, idx: number, arr: string[], setArr: (a: string[]) => void, refs: React.RefObject<HTMLInputElement | null>[]) => {
    if (!/^\d*$/.test(val)) return
    const updated = [...arr]
    updated[idx] = val.slice(-1)
    setArr(updated)
    if (val && idx < 3) refs[idx + 1].current?.focus()
  }

  const handlePinKey = (e: React.KeyboardEvent, idx: number, refs: React.RefObject<HTMLInputElement | null>[]) => {
    if (e.key === "Backspace" && idx > 0 && !pin[idx]) refs[idx - 1].current?.focus()
  }

  const profId = PROF_ID_MAP[form.category_id]
  const extraAttrs = EXTRA_ATTRS[form.category_id] || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validate PIN
    const pinStr = pin.join("")
    const confirmStr = confirmPin.join("")
    if (pinStr.length < 4) { setError("Please enter a 4-digit PIN for login"); return }
    if (pinStr !== confirmStr) { setError("PINs do not match"); return }

    setSaving(true)
    try {
      const body: any = {
        full_name: form.full_name, mobile: form.mobile,
        email: form.email || undefined, gender: form.gender || undefined,
        category_id: form.category_id, locality: form.locality,
        pincode: form.pincode,
        experience_years: form.experience_years ? Number(form.experience_years) : undefined,
        short_bio: form.short_bio || undefined,
        working_days: form.working_days || undefined,
        working_hours_start: form.working_hours_start,
        working_hours_end: form.working_hours_end,
        slot_duration_minutes: Number(form.slot_duration_minutes),
        accepts_cash: form.accepts_cash, accepts_upi: form.accepts_upi,
      }
      const res = await fetch(`${MEDUSA_URL}/store/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Registration failed")

      // Register provider auth (PIN login)
      const authRes = await fetch(`${MEDUSA_URL}/store/providers/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
        body: JSON.stringify({
          action: "register",
          provider_id: data.provider.id,
          email: form.email || undefined,
          mobile: form.mobile,
          pin: pinStr,
        }),
      })
      const authData = await authRes.json()
      if (!authRes.ok) {
        console.warn("Auth registration warning:", authData.error)
        // Don't fail the whole registration if auth setup fails — provider is created
      }

      if (form.consultation_fee) {
        await fetch(`${MEDUSA_URL}/store/providers/${data.provider.id}/services`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
          body: JSON.stringify({ name: "Consultation", base_price: Number(form.consultation_fee), duration_minutes: Number(form.consultation_duration), category_id: form.category_id }),
        })
      }
      setSuccess(true)
      setTimeout(() => router.push("/professionalservices"), 2500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center shadow-md max-w-md mx-4">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Registration Submitted!</h2>
          <p className="text-gray-500 text-sm">Your profile is under review. You will be verified within 24 hours and appear in search results instantly.</p>
          <p className="text-[#00A650] text-xs font-bold mt-3">You can now log in with your mobile/email + PIN</p>
          <p className="text-[#F47216] text-xs font-bold mt-2">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Orange header */}
      <div className="bg-[#F47216] px-4 pt-6 pb-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-3xl mb-1">🏛️</div>
          <h1 className="text-xl font-extrabold text-white mb-1">Register as Professional Service Provider</h1>
          <p className="text-white/80 text-xs">Rohtak — Get discovered by clients after verification</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-4 pb-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">

          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm font-semibold">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Service Type */}
            <div>
              <label className={labelCls}>Service Type *</label>
              <select required value={form.category_id} onChange={e => set("category_id", e.target.value)} className={inputCls}>
                <option value="">Select your profession</option>
                {subcats.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input required value={form.full_name} onChange={e => set("full_name", e.target.value)} className={inputCls} placeholder="Your full name" />
              </div>
              <div>
                <label className={labelCls}>Mobile *</label>
                <input required value={form.mobile} onChange={e => set("mobile", e.target.value)} className={inputCls} placeholder="10-digit mobile" maxLength={10} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={inputCls} placeholder="email@example.com" />
              </div>
              <div>
                <label className={labelCls}>Gender</label>
                <select value={form.gender} onChange={e => set("gender", e.target.value)} className={inputCls}>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Locality / Area *</label>
                <input required value={form.locality} onChange={e => set("locality", e.target.value)} className={inputCls} placeholder="e.g. Model Town" />
              </div>
              <div>
                <label className={labelCls}>Experience (years)</label>
                <input type="number" value={form.experience_years} onChange={e => set("experience_years", e.target.value)} className={inputCls} placeholder="e.g. 10" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Short Bio</label>
              <textarea value={form.short_bio} onChange={e => set("short_bio", e.target.value)} rows={2} className={inputCls} placeholder="Brief description of your expertise..." />
            </div>

            {/* ID Proof */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-extrabold text-gray-800 mb-3">Identity Proof *</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>ID Type *</label>
                  <select required value={form.id_proof_type} onChange={e => set("id_proof_type", e.target.value)} className={inputCls}>
                    <option value="">Select ID</option>
                    <option>Aadhaar Card</option><option>PAN Card</option>
                    <option>Voter ID</option><option>Driving Licence</option><option>Passport</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>ID Number *</label>
                  <input required value={form.id_proof_number} onChange={e => set("id_proof_number", e.target.value)} className={inputCls} placeholder="ID number" />
                </div>
              </div>
            </div>

            {/* Professional ID */}
            {profId && (
              <div className="bg-orange-50 border-2 border-[#F47216] rounded-xl p-4">
                <p className="text-xs font-extrabold text-[#F47216] mb-1">{profId.org}</p>
                <label className={labelCls}>{profId.label} *</label>
                <input required value={form.prof_id_number} onChange={e => set("prof_id_number", e.target.value)} className={inputCls} placeholder={profId.label} />
              </div>
            )}

            {/* Dynamic attributes */}
            {extraAttrs.length > 0 && (
              <div className="border-t border-gray-100 pt-4 space-y-4">
                <p className="text-sm font-extrabold text-gray-800">Professional Details</p>
                {extraAttrs.map(attr => (
                  <div key={attr.key}>
                    <label className={labelCls}>{attr.label}</label>
                    {attr.type === "multiselect" && attr.options && (
                      <div className="flex flex-wrap gap-2">
                        {attr.options.map(opt => (
                          <button type="button" key={opt}
                            onClick={() => toggleExtra(attr.key, opt)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition-all ${(extras[attr.key] || []).includes(opt) ? "bg-[#F47216] text-white border-[#F47216]" : "bg-white text-gray-600 border-gray-200 hover:border-[#F47216]"}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                    {attr.type === "text" && (
                      <input value={extras[attr.key]?.[0] || ""} onChange={e => setExtras(ex => ({ ...ex, [attr.key]: [e.target.value] }))} className={inputCls} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Consultation Fee */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-extrabold text-gray-800 mb-3">Consultation Fee</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Fee (₹)</label>
                  <input type="number" value={form.consultation_fee} onChange={e => set("consultation_fee", e.target.value)} className={inputCls} placeholder="e.g. 500" />
                </div>
                <div>
                  <label className={labelCls}>Duration</label>
                  <select value={form.consultation_duration} onChange={e => set("consultation_duration", e.target.value)} className={inputCls}>
                    <option value={30}>30 min</option><option value={45}>45 min</option>
                    <option value={60}>60 min</option><option value={90}>90 min</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Availability */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-extrabold text-gray-800 mb-3">Availability</p>
              <div className="flex gap-2 flex-wrap mb-3">
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day => {
                  const days = (form.working_days || "").split(",").filter(Boolean)
                  const active = days.includes(day)
                  return (
                    <button type="button" key={day}
                      onClick={() => {
                        const updated = active ? days.filter((d: string) => d !== day) : [...days, day]
                        set("working_days", updated.join(","))
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold border-2 transition-all ${active ? "bg-[#F47216] text-white border-[#F47216]" : "bg-white text-gray-600 border-gray-200 hover:border-[#F47216]"}`}>
                      {day}
                    </button>
                  )
                })}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>From</label>
                  <input type="time" value={form.working_hours_start} onChange={e => set("working_hours_start", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>To</label>
                  <input type="time" value={form.working_hours_end} onChange={e => set("working_hours_end", e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            {/* Payment */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-extrabold text-gray-800 mb-3">Payment Accepted</p>
              <div className="flex gap-4">
                {[["accepts_cash","💵 Cash"],["accepts_upi","📱 UPI"],["accepts_card","💳 Card"]].map(([k,l]) => (
                  <label key={k} className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} className="w-4 h-4 accent-[#F47216]" />
                    {l}
                  </label>
                ))}
              </div>
            </div>

            {/* Login PIN Setup */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-extrabold text-gray-800 mb-1">🔐 Set Your 4-Digit Login PIN *</p>
              <p className="text-xs text-gray-400 mb-3">You will use this PIN to log in to your provider dashboard</p>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>PIN</label>
                  <div className="flex gap-2">
                    {pin.map((d, i) => (
                      <input key={i} ref={pinRefs[i]} type="password" inputMode="numeric"
                        maxLength={1} value={d}
                        onChange={e => handlePinInput(e.target.value, i, pin, setPin, pinRefs)}
                        onKeyDown={e => handlePinKey(e, i, pinRefs)}
                        className="w-12 h-12 text-center text-xl font-extrabold border-2 border-gray-200 focus:border-[#F47216] rounded-xl outline-none text-[#F47216]"
                        aria-label={`PIN digit ${i + 1}`} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Confirm PIN</label>
                  <div className="flex gap-2">
                    {confirmPin.map((d, i) => (
                      <input key={i} ref={confirmRefs[i]} type="password" inputMode="numeric"
                        maxLength={1} value={d}
                        onChange={e => handlePinInput(e.target.value, i, confirmPin, setConfirmPin, confirmRefs)}
                        onKeyDown={e => handlePinKey(e, i, confirmRefs)}
                        className="w-12 h-12 text-center text-xl font-extrabold border-2 border-gray-200 focus:border-[#00A650] rounded-xl outline-none text-[#00A650]"
                        aria-label={`Confirm PIN digit ${i + 1}`} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-[#F47216] text-white py-3 rounded-xl font-extrabold text-sm hover:bg-[#00A650] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? "Submitting..." : "Register as Professional Service Provider"}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Profile reviewed and verified within 24 hours. Visible in search instantly after verification.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
