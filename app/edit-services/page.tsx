"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { isAdmin } from "@/lib/admin";

const CATS: { label: string; icon: string; url: string }[] = [
  // A
  { label: "Accountant",          icon: "🧾", url: "https://accountant.digitalrohtak.online" },
  { label: "Advocate",            icon: "⚖️", url: "https://advocate.digitalrohtak.online" },
  { label: "Apparel & Fashion",   icon: "👗", url: "https://fashion.digitalrohtak.online" },
  { label: "Architect",           icon: "🏗️", url: "https://architect.digitalrohtak.online" },
  { label: "Astrology",           icon: "🔮", url: "https://astrology.digitalrohtak.online" },
  { label: "Automotive",          icon: "🚗", url: "https://automotive.digitalrohtak.online" },
  { label: "Ayush & Wellness",    icon: "🧘", url: "https://ayush.digitalrohtak.online" },
  // B
  { label: "Bakery",              icon: "🍞", url: "https://bakery.digitalrohtak.online" },
  { label: "Beauty & Care",       icon: "💄", url: "https://beauty.digitalrohtak.online" },
  { label: "Books & Stationery",  icon: "📖", url: "https://books.digitalrohtak.online" },
  { label: "Building Materials",  icon: "🧱", url: "https://building.digitalrohtak.online" },
  // C
  { label: "Catering",            icon: "🍱", url: "https://catering.digitalrohtak.online" },
  { label: "Classifieds",         icon: "📋", url: "https://classifieds.digitalrohtak.online" },
  { label: "Cleaning",            icon: "🧹", url: "https://cleaning.digitalrohtak.online" },
  { label: "Coaching",            icon: "🎯", url: "https://coaching.digitalrohtak.online" },
  { label: "Computer Repair",     icon: "💻", url: "https://computerrepair.digitalrohtak.online" },
  { label: "Courier",             icon: "📦", url: "https://courier.digitalrohtak.online" },
  // D
  { label: "Dairy",               icon: "🥛", url: "https://dairy.digitalrohtak.online" },
  { label: "Delivery",            icon: "🚴", url: "https://delivery.digitalrohtak.online" },
  { label: "Dentist",             icon: "🦷", url: "https://dentist.digitalrohtak.online" },
  { label: "Driving School",      icon: "🚘", url: "https://driving.digitalrohtak.online" },
  // E
  { label: "Education",           icon: "🎓", url: "https://education.digitalrohtak.online" },
  { label: "Electrician",         icon: "⚡", url: "https://electrician.digitalrohtak.online" },
  { label: "Electronics",         icon: "📱", url: "https://electronics.digitalrohtak.online" },
  { label: "Events",              icon: "🎉", url: "https://events.digitalrohtak.online" },
  { label: "Ex-Servicemen",       icon: "🎖️", url: "https://exservicemen.digitalrohtak.online" },
  // F
  { label: "Finance",             icon: "💰", url: "https://finance.digitalrohtak.online" },
  { label: "Food Delivery",       icon: "🍕", url: "https://food.digitalrohtak.online" },
  { label: "Fruits",              icon: "🍎", url: "https://fruits.digitalrohtak.online" },
  { label: "Furniture",           icon: "🛋️", url: "https://furniture.digitalrohtak.online" },
  // G
  { label: "Garden & Nursery",    icon: "🌱", url: "https://garden.digitalrohtak.online" },
  { label: "Govt Services",       icon: "🏛️", url: "https://govt.digitalrohtak.online" },
  { label: "Grocery",             icon: "🏪", url: "https://grocery.digitalrohtak.online" },
  { label: "Gym",                 icon: "🏋️", url: "https://gym.digitalrohtak.online" },
  // H
  { label: "Hardware Store",      icon: "🔩", url: "https://hardware.digitalrohtak.online" },
  { label: "Health",              icon: "🏥", url: "https://health.digitalrohtak.online" },
  { label: "Home Appliances",     icon: "🏠", url: "https://appliances.digitalrohtak.online" },
  { label: "Hospital",            icon: "🏨", url: "https://hospital.digitalrohtak.online" },
  { label: "Hotel",               icon: "🏩", url: "https://hotel.digitalrohtak.online" },
  // I
  { label: "Insurance",           icon: "📄", url: "https://insurance.digitalrohtak.online" },
  { label: "Interior Design",     icon: "🖼️", url: "https://interior.digitalrohtak.online" },
  { label: "IT Services",         icon: "🖥️", url: "https://it.digitalrohtak.online" },
  // J
  { label: "Jewelry",             icon: "💍", url: "https://jewelry.digitalrohtak.online" },
  { label: "Jobs",                icon: "💼", url: "https://jobs.digitalrohtak.online" },
  // K
  { label: "Kabari",              icon: "♻️", url: "https://kabari.digitalrohtak.online" },
  { label: "Kitchen Equipment",   icon: "🍳", url: "https://kitchen.digitalrohtak.online" },
  // L
  { label: "Laboratory",          icon: "🔬", url: "https://lab.digitalrohtak.online" },
  { label: "Laundry",             icon: "👕", url: "https://laundry.digitalrohtak.online" },
  { label: "Legal",               icon: "⚖️", url: "https://legal.digitalrohtak.online" },
  { label: "Luggage & Bags",      icon: "🧳", url: "https://luggage.digitalrohtak.online" },
  // M
  { label: "Medical Shops",       icon: "💊", url: "https://pharmacy.digitalrohtak.online" },
  { label: "Mobile Repair",       icon: "📲", url: "https://mobilerepair.digitalrohtak.online" },
  { label: "Music",               icon: "🎵", url: "https://music.digitalrohtak.online" },
  // N
  { label: "News",                icon: "📰", url: "https://news.digitalrohtak.online" },
  { label: "NGOs",                icon: "🤝", url: "https://ngo.digitalrohtak.online" },
  // O
  { label: "Optical",             icon: "👓", url: "https://optical.digitalrohtak.online" },
  { label: "Organic",             icon: "🌾", url: "https://organic.digitalrohtak.online" },
  // P
  { label: "Packers & Movers",    icon: "🚛", url: "https://movers.digitalrohtak.online" },
  { label: "Pest Control",        icon: "🐛", url: "https://pestcontrol.digitalrohtak.online" },
  { label: "Petrol",              icon: "⛽", url: "https://petrol.digitalrohtak.online" },
  { label: "Pets",                icon: "🐾", url: "https://pets.digitalrohtak.online" },
  { label: "Photography",         icon: "📷", url: "https://photography.digitalrohtak.online" },
  { label: "Plumber",             icon: "🚿", url: "https://plumber.digitalrohtak.online" },
  { label: "Printing",            icon: "🖨️", url: "https://printing.digitalrohtak.online" },
  { label: "Property",            icon: "🏡", url: "https://property.digitalrohtak.online" },
  // R
  { label: "Real Estate",         icon: "🏠", url: "https://realestate.digitalrohtak.online" },
  { label: "Religious",           icon: "🛕", url: "https://religious.digitalrohtak.online" },
  { label: "Repair",              icon: "🔧", url: "https://repair.digitalrohtak.online" },
  { label: "Restaurant",          icon: "🍽️", url: "https://restaurant.digitalrohtak.online" },
  // S
  { label: "Sadahaq",             icon: "🤲", url: "https://sadahaq.digitalrohtak.online" },
  { label: "Salon",               icon: "💇", url: "https://salon.digitalrohtak.online" },
  { label: "Security",            icon: "🛡️", url: "https://security.digitalrohtak.online" },
  { label: "Shopping",            icon: "🛒", url: "https://shopping.digitalrohtak.online" },
  { label: "Sports",              icon: "🏏", url: "https://sports.digitalrohtak.online" },
  { label: "Stationery",          icon: "✏️", url: "https://stationery.digitalrohtak.online" },
  { label: "Supermarket",         icon: "🏬", url: "https://supermarket.digitalrohtak.online" },
  // T
  { label: "Tailoring",           icon: "🧵", url: "https://tailoring.digitalrohtak.online" },
  { label: "Tours & Travel",      icon: "✈️", url: "https://travel.digitalrohtak.online" },
  { label: "Toys",                icon: "🧸", url: "https://toys.digitalrohtak.online" },
  { label: "Transport",           icon: "🚌", url: "https://transport.digitalrohtak.online" },
  { label: "Tutor",               icon: "📚", url: "https://tutor.digitalrohtak.online" },
  // V
  { label: "Vegetables",          icon: "🥦", url: "https://vegetables.digitalrohtak.online" },
  { label: "Veterinary",          icon: "🐕", url: "https://vet.digitalrohtak.online" },
  { label: "Volunteers",          icon: "🙋", url: "https://volunteers.digitalrohtak.online" },
  // W
  { label: "Waste Mgmt",          icon: "♻️", url: "https://waste.digitalrohtak.online" },
  { label: "Water Supply",        icon: "💧", url: "https://water.digitalrohtak.online" },
  { label: "Wedding",             icon: "💒", url: "https://wedding.digitalrohtak.online" },
  // Custom
  { label: "Custom",              icon: "🌟", url: "https://" },
];

// Alphabet index
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type Service = { id: number; icon: string; label: string; url: string };

export default function EditServicesPage() {
  const { customer, loading } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSadahaq, setIsSadahaq] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    setIsSadahaq(host.startsWith('sadahaq.'));
  }, []);
  const [toast, setToast] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCat, setSelectedCat] = useState(CATS[0]);
  const [customLabel, setCustomLabel] = useState("");
  const [customUrl, setCustomUrl] = useState("https://");
  const [catSearch, setCatSearch] = useState("");
  const [alphaFilter, setAlphaFilter] = useState("");
  // For inline icon picker in edit mode
  const [iconSearch, setIconSearch] = useState("");

  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && (!customer || !isAdmin(customer.email))) router.replace("/");
  }, [customer, loading]);

  useEffect(() => {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const isSadahaq = host.startsWith('sadahaq.');
    const apiUrl = isSadahaq ? '/api/sadahaq-services' : '/api/services';
    fetch(apiUrl)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.services) && data.services.length > 0) setServices(data.services); })
      .catch(() => {})
      .finally(() => setDbLoaded(true));
  }, []);

  function onDragStart(i: number) { dragItem.current = i; }
  function onDragEnter(i: number) { dragOver.current = i; }
  function onDragEnd() {
    if (dragItem.current === null || dragOver.current === null) return;
    const updated = [...services];
    const dragged = updated.splice(dragItem.current, 1)[0];
    updated.splice(dragOver.current, 0, dragged);
    setServices(updated);
    dragItem.current = null; dragOver.current = null;
  }

  function startEdit(svc: Service) {
    setEditingId(svc.id); setEditLabel(svc.label); setEditIcon(svc.icon); setEditUrl(svc.url); setIconSearch("");
  }
  function saveEdit() {
    setServices(services.map(s => s.id === editingId ? { ...s, label: editLabel, icon: editIcon, url: editUrl } : s));
    setEditingId(null);
  }
  function deleteService(id: number) { setServices(services.filter(s => s.id !== id)); }

  function addService() {
    const label = customLabel.trim() || selectedCat.label;
    const url = customUrl.trim() !== "https://" ? customUrl.trim() : selectedCat.url;
    if (!label || !url) return;
    const newId = services.length ? Math.max(...services.map(s => s.id)) + 1 : 1;
    setServices([...services, { id: newId, icon: selectedCat.icon, label, url }]);
    setCustomLabel(""); setCustomUrl("https://"); setShowAdd(false); setCatSearch(""); setAlphaFilter("");
    showToast("✅ Service added!");
  }

  async function saveToBackend() {
    setSaving(true);
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const apiUrl = host.startsWith('sadahaq.') ? '/api/sadahaq-services' : '/api/services';
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("✅ Saved! Changes are now live.");
        setTimeout(() => router.push("/"), 1200);
      } else {
        showToast("❌ Save failed: " + (data.error || "unknown error"));
      }
    } catch (e: any) {
      showToast("❌ Server error: " + e.message);
    }
    setSaving(false);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  // Filter categories: alpha first char takes priority, then text search
  const filteredCats = CATS.filter(c => {
    const matchAlpha = alphaFilter ? c.label.toUpperCase().startsWith(alphaFilter) : true;
    const matchSearch = catSearch ? c.label.toLowerCase().includes(catSearch.toLowerCase()) : true;
    return matchAlpha && matchSearch;
  });

  // Icon picker filter for inline edit
  const filteredIcons = CATS.filter(c =>
    iconSearch ? c.label.toLowerCase().startsWith(iconSearch.toLowerCase()) : true
  );

  if (loading || !customer) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#00A650] text-white px-6 py-3 rounded-xl shadow-xl z-[300] font-semibold">{toast}</div>
      )}

      {/* Top bar */}
      <div className="bg-[#1a1a1a] px-4 py-3 flex items-center justify-between sticky top-0 z-[200]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-white/60 hover:text-white text-sm">← Back</button>
          <span className="text-white font-extrabold text-lg">✏️ Edit {isSadahaq ? 'Sadahaq' : 'Root'} Services</span>
          <span className="text-white/40 text-xs hidden sm:block">Drag to reorder · hover to edit/delete</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(true)}
            className="bg-[#F47216] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-white hover:text-[#F47216] transition-all">
            ➕ Add Service
          </button>
          <button onClick={saveToBackend} disabled={saving || !dbLoaded}
            className="bg-[#00A650] text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-white hover:text-[#00A650] transition-all disabled:opacity-60">
            {saving ? "Saving..." : "💾 Save & Go Live"}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Add Service Panel ── */}
        {showAdd && (
          <div className="bg-white rounded-2xl shadow-2xl p-5 mb-6 border-2 border-[#F47216]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#F47216] font-extrabold text-lg">➕ Add New Service</h3>
              <button onClick={() => { setShowAdd(false); setCatSearch(""); setAlphaFilter(""); }}
                className="text-gray-400 hover:text-red-500 font-bold text-xl">✕</button>
            </div>

            {/* Search + Alphabet bar */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input value={catSearch}
                onChange={e => { setCatSearch(e.target.value); setAlphaFilter(""); }}
                placeholder="Search category..."
                className="flex-1 border-2 border-[#F47216] rounded-xl px-4 py-2 text-[#00A650] font-semibold focus:outline-none text-sm" />
              <div className="flex flex-wrap gap-1">
                {ALPHA.map(a => (
                  <button key={a} onClick={() => { setAlphaFilter(alphaFilter === a ? "" : a); setCatSearch(""); }}
                    className={`w-7 h-7 rounded-lg text-xs font-extrabold transition-all ${
                      alphaFilter === a
                        ? "bg-[#F47216] text-white"
                        : "bg-gray-100 text-[#00A650] hover:bg-[#F47216]/20"
                    }`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Category icon grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-56 overflow-y-auto mb-4 p-2 bg-gray-50 rounded-xl border border-gray-200">
              {filteredCats.map(cat => (
                <button key={cat.label}
                  onClick={() => { setSelectedCat(cat); setCustomLabel(cat.label); setCustomUrl(cat.url); }}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all text-center border-2 ${
                    selectedCat.label === cat.label
                      ? "border-[#F47216] bg-[#F47216]/10 scale-105"
                      : "border-transparent hover:border-[#F47216]/40 hover:bg-[#F47216]/5"
                  }`}>
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-[10px] text-[#00A650] font-semibold leading-tight mt-1 line-clamp-2">{cat.label}</span>
                </button>
              ))}
              {filteredCats.length === 0 && (
                <div className="col-span-10 text-center text-gray-400 py-4 text-sm">No categories found</div>
              )}
            </div>

            {/* Selected + fields */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex items-center gap-2 bg-[#F47216]/10 border-2 border-[#F47216] rounded-xl px-4 py-2">
                <span className="text-3xl">{selectedCat.icon}</span>
                <span className="text-[#00A650] font-bold text-sm">{selectedCat.label}</span>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-[#00A650] font-bold text-xs uppercase tracking-wide block mb-1">Display Name</label>
                <input value={customLabel} onChange={e => setCustomLabel(e.target.value)}
                  placeholder={selectedCat.label}
                  className="w-full border-2 border-[#00A650] rounded-xl px-3 py-2 text-[#00A650] font-semibold focus:outline-none text-sm" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-[#00A650] font-bold text-xs uppercase tracking-wide block mb-1">URL</label>
                <input value={customUrl} onChange={e => setCustomUrl(e.target.value)}
                  placeholder={selectedCat.url}
                  className="w-full border-2 border-[#00A650] rounded-xl px-3 py-2 text-[#00A650] font-semibold focus:outline-none text-sm" />
              </div>
              <button onClick={addService}
                className="bg-[#00A650] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#F47216] transition-all">
                Add
              </button>
            </div>
          </div>
        )}

        {/* ── Services Grid ── */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
          {services.map((svc, index) => (
            <div key={svc.id}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragEnter={() => onDragEnter(index)}
              onDragEnd={onDragEnd}
              onDragOver={e => e.preventDefault()}
              className="relative group flex flex-col items-center justify-center bg-white rounded-2xl p-3 shadow border-2 border-dashed border-[#F47216]/40 hover:border-[#F47216] cursor-grab active:cursor-grabbing transition-all min-h-[90px]"
            >
              {editingId === svc.id ? (
                <div className="w-full flex flex-col gap-1">
                  {/* Icon search for edit */}
                  <input value={iconSearch} onChange={e => setIconSearch(e.target.value)}
                    placeholder="Type to filter icons..."
                    className="border border-[#F47216] rounded px-2 py-1 text-xs w-full text-[#00A650] font-semibold focus:outline-none" />
                  {/* Icon picker grid */}
                  <div className="grid grid-cols-4 gap-1 max-h-28 overflow-y-auto bg-gray-50 rounded-lg p-1 border border-gray-200">
                    {filteredIcons.map(c => (
                      <button key={c.label} onClick={() => setEditIcon(c.icon)}
                        title={c.label}
                        className={`flex flex-col items-center p-1 rounded-lg text-center transition-all ${
                          editIcon === c.icon ? "bg-[#F47216]/20 border border-[#F47216]" : "hover:bg-gray-100"
                        }`}>
                        <span className="text-lg">{c.icon}</span>
                        <span className="text-[8px] text-[#00A650] font-semibold leading-tight truncate w-full text-center">{c.label}</span>
                      </button>
                    ))}
                  </div>
                  <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                    className="border border-[#00A650] rounded px-1 py-1 text-xs w-full text-[#00A650] font-semibold" />
                  <input value={editUrl} onChange={e => setEditUrl(e.target.value)}
                    className="border border-gray-300 rounded px-1 py-1 text-xs w-full text-gray-500" />
                  <div className="flex gap-1">
                    <button onClick={saveEdit}
                      className="flex-1 bg-[#00A650] text-white text-xs rounded py-1 font-bold">✓ Save</button>
                    <button onClick={() => setEditingId(null)}
                      className="flex-1 bg-gray-200 text-gray-600 text-xs rounded py-1 font-bold">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-3xl mb-1">{svc.icon}</span>
                  <span className="text-[#00A650] font-bold text-xs text-center leading-tight">{svc.label}</span>
                  <div className="absolute inset-0 bg-black/10 rounded-2xl flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(svc)}
                      className="bg-[#00A650] text-white rounded-full w-7 h-7 text-sm font-bold shadow">✏️</button>
                    <button onClick={() => deleteService(svc.id)}
                      className="bg-red-500 text-white rounded-full w-7 h-7 text-sm font-bold shadow">✕</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {services.length === 0 && dbLoaded && (
          <div className="text-center text-gray-400 py-20 text-lg">No services yet. Click ➕ Add Service to start.</div>
        )}
      </div>
    </div>
  );
}
