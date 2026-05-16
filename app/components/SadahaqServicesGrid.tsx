"use client";
import { useState, useRef, useEffect } from "react";
import { useEditLayout } from "@/app/components/EditLayout";
import { useLang } from "@/lib/lang";

const DEFAULT_SERVICES = [
  { id: 1,  icon: "🏫", label: "Schools",         href: "/sadahaq/schools" },
  { id: 2,  icon: "🤝", label: "Volunteers",      href: "/sadahaq/volunteers" },
  { id: 3,  icon: "👨‍🏫", label: "Mentors",         href: "/sadahaq/mentors" },
  { id: 4,  icon: "🏢", label: "NGOs",            href: "/sadahaq/ngos" },
  { id: 5,  icon: "📋", label: "Grievances",      href: "/sadahaq/grievances" },
  { id: 6,  icon: "👥", label: "Citizens",        href: "/sadahaq/citizens" },
  { id: 7,  icon: "🏥", label: "Hospitals",       href: "/sadahaq/hospitals" },
  { id: 8,  icon: "💊", label: "Medical Shops",   href: "/sadahaq/medical-shops" },
  { id: 9,  icon: "🏛️", label: "Govt Depts",      href: "/sadahaq/govt-departments" },
  { id: 10, icon: "🏭", label: "Manufacturers",   href: "/sadahaq/manufacturers" },
  { id: 11, icon: "🏠", label: "Properties",      href: "/sadahaq/properties" },
  { id: 12, icon: "📮", label: "Postmen",         href: "/sadahaq/postmen" },
  { id: 13, icon: "��", label: "Anganwadi",       href: "/sadahaq/anganwadi" },
  { id: 14, icon: "🧘", label: "Ayush Staff",     href: "/sadahaq/ayush-staff" },
  { id: 15, icon: "🎖️", label: "Ex-Servicemen",   href: "/sadahaq/ex-servicemen" },
  { id: 16, icon: "🎓", label: "NSS Units",       href: "/sadahaq/nss-units" },
  { id: 17, icon: "🏘️", label: "Colonies",        href: "/sadahaq/colonies" },
  { id: 18, icon: "🔍", label: "Surveillance",    href: "/sadahaq/surveillance" },
  { id: 19, icon: "👤", label: "People",          href: "/sadahaq/people" },
  { id: 20, icon: "📊", label: "Eagle View",      href: "/sadahaq/eagle-view" },
];

type Service = typeof DEFAULT_SERVICES[0];

const ICONS = ["🏫","🤝","👨‍🏫","🏢","📋","👥","🏥","💊","🏛️","🏭","🏠","📮","👶","🧘","🎖️","🎓","🏘️","🔍","👤","📊","🌟","🎯","📌","🔔","⚡","🛡️","📝","🗂️","🏗️","🔑","💼","🎪","🌾","🐄","🛵","♻️","⛽","🚌","💰","⚖️"];

export default function SadahaqServicesGrid() {
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const { editMode, isAdminUser } = useEditLayout();
  const { t } = useLang();
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/sadahaq-services")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.services) && data.services.length > 0) {
          setServices(data.services);
        }
      })
      .catch(() => {})
      .finally(() => setDbLoaded(true));
  }, []);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editHref, setEditHref] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("🌟");
  const [newHref, setNewHref] = useState("/sadahaq/");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  function onDragStart(index: number) { dragItem.current = index; }
  function onDragEnter(index: number) { dragOver.current = index; }
  function onDragEnd() {
    if (dragItem.current === null || dragOver.current === null) return;
    const updated = [...services];
    const dragged = updated.splice(dragItem.current, 1)[0];
    updated.splice(dragOver.current, 0, dragged);
    setServices(updated);
    dragItem.current = null;
    dragOver.current = null;
  }

  function move(index: number, dir: -1 | 1) {
    const updated = [...services];
    const target = index + dir;
    if (target < 0 || target >= updated.length) return;
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setServices(updated);
  }

  function startEdit(svc: Service) {
    setEditingId(svc.id);
    setEditLabel(svc.label);
    setEditIcon(svc.icon);
    setEditHref(svc.href);
  }

  function saveEdit() {
    setServices(services.map(s =>
      s.id === editingId ? { ...s, label: editLabel, icon: editIcon, href: editHref } : s
    ));
    setEditingId(null);
  }

  function addService() {
    if (!newLabel.trim()) return;
    const newId = Math.max(...services.map(s => s.id)) + 1;
    setServices([...services, { id: newId, icon: newIcon, label: newLabel, href: newHref }]);
    setNewLabel(""); setNewIcon("🌟"); setNewHref("/sadahaq/");
    setShowAdd(false);
    showToastMsg("✅ Service added!");
  }

  function deleteService(id: number) {
    setServices(services.filter(s => s.id !== id));
  }

  async function saveToBackend() {
    setSaving(true);
    try {
      const res = await fetch("/api/sadahaq-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToastMsg("✅ Saved! Changes are now live.");
      } else {
        showToastMsg("❌ Save failed: " + (data.error || "unknown error"));
      }
    } catch (e: any) {
      showToastMsg("❌ Server error: " + e.message);
    }
    setSaving(false);
  }

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      {toast && (
        <div className="fixed top-20 right-4 bg-[#00A650] text-white px-6 py-3 rounded-xl shadow-xl z-[100] font-semibold">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-[#F47216]">🏛️ {t("साद्दा हक़ सेवाएं", "Sadahaq Services")}</h2>
          <div className="w-16 h-1 bg-[#00A650] rounded mt-1"></div>
        </div>
        {editMode && isAdminUser && (
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(true)}
              className="bg-[#F47216] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-white hover:text-[#F47216] transition-all">
              ➕ Add Service
            </button>
            <button onClick={saveToBackend} disabled={saving || !dbLoaded}
              className="bg-[#00A650] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-white hover:text-[#00A650] transition-all disabled:opacity-60">
              {saving ? "Saving..." : "💾 Save"}
            </button>
          </div>
        )}
      </div>

      {editMode && isAdminUser && (
        <p className="text-gray-500 text-sm mb-4">
          🖱️ Drag to reorder · Click ✏️ to rename · ✕ to remove
        </p>
      )}

      {editMode && isAdminUser && showAdd && (
        <div className="bg-white rounded-2xl p-5 mb-6 shadow-xl flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[#F47216] font-bold text-xs block mb-1">ICON</label>
            <select value={newIcon} onChange={e => setNewIcon(e.target.value)}
              className="border-2 border-[#F47216] rounded-lg px-2 py-2 text-xl w-20">
              {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="text-[#F47216] font-bold text-xs block mb-1">SERVICE NAME</label>
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. Schools"
              className="border-2 border-[#00A650] rounded-lg px-3 py-2 w-full text-gray-700" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[#F47216] font-bold text-xs block mb-1">LINK</label>
            <input value={newHref} onChange={e => setNewHref(e.target.value)}
              placeholder="/sadahaq/schools"
              className="border-2 border-[#00A650] rounded-lg px-3 py-2 w-full text-gray-700" />
          </div>
          <button onClick={addService}
            className="bg-[#00A650] text-white px-5 py-2 rounded-xl font-bold hover:bg-[#F47216] transition-all">
            Add
          </button>
          <button onClick={() => setShowAdd(false)}
            className="text-gray-400 hover:text-red-500 font-bold px-2">✕</button>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
        {services.map((svc, index) => (
          <div
            key={svc.id}
            draggable={editMode && isAdminUser}
            onDragStart={() => onDragStart(index)}
            onDragEnter={() => onDragEnter(index)}
            onDragEnd={onDragEnd}
            onDragOver={e => e.preventDefault()}
            className={`relative group flex flex-col items-center justify-center bg-white rounded-2xl p-4 shadow hover:shadow-lg transition-all
              ${editMode && isAdminUser ? "border-2 border-dashed border-[#F47216] cursor-grab active:cursor-grabbing" : "hover:scale-105 cursor-pointer"}`}
          >
            {editMode && isAdminUser && editingId === svc.id ? (
              <div className="w-full flex flex-col gap-1">
                <select value={editIcon} onChange={e => setEditIcon(e.target.value)}
                  className="border border-[#F47216] rounded px-1 py-1 text-lg w-full">
                  {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
                <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                  className="border border-[#00A650] rounded px-1 py-1 text-xs w-full text-gray-700" />
                <input value={editHref} onChange={e => setEditHref(e.target.value)}
                  className="border border-gray-300 rounded px-1 py-1 text-xs w-full text-gray-500" />
                <button onClick={saveEdit}
                  className="bg-[#00A650] text-white text-xs rounded py-1 font-bold">✓ Save</button>
              </div>
            ) : (
              <>
                <a href={editMode ? undefined : svc.href}
                  className="flex flex-col items-center w-full"
                  onClick={e => editMode && e.preventDefault()}>
                  <span className="text-3xl mb-2">{svc.icon}</span>
                  <span className="text-[#F47216] font-bold text-xs text-center leading-tight">{svc.label}</span>
                </a>
                {editMode && isAdminUser && (
                  <div className="absolute inset-0 bg-black/10 rounded-2xl flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                      <button onClick={() => move(index, -1)}
                        className="bg-white text-[#F47216] rounded-full w-6 h-6 text-xs font-bold shadow">↑</button>
                      <button onClick={() => move(index, 1)}
                        className="bg-white text-[#F47216] rounded-full w-6 h-6 text-xs font-bold shadow">↓</button>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(svc)}
                        className="bg-[#00A650] text-white rounded-full w-6 h-6 text-xs font-bold shadow">✏️</button>
                      <button onClick={() => deleteService(svc.id)}
                        className="bg-red-500 text-white rounded-full w-6 h-6 text-xs font-bold shadow">✕</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
