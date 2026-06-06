"use client";
import { useState, useEffect, useRef } from "react";
import { useEditLayout } from "@/app/components/EditLayout";
import { useLang } from "@/lib/lang";

type Service = { id: number; icon: string; label: string; url: string };

export default function ServicesGrid() {
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const { editMode, isAdminUser } = useEditLayout();
  const { t } = useLang();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [dbLoaded, setDbLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/services", { cache: "no-store" })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data.services) && data.services.length > 0) {
          setServices(data.services);
          setLoadError(null);
        } else {
          setLoadError("empty");
        }
      })
      .catch(err => setLoadError(err?.message || "fetch_failed"))
      .finally(() => setDbLoaded(true));
  }, []);

  const filtered = search.trim()
    ? services.filter(s => s.label.toLowerCase().includes(search.toLowerCase()))
    : services;

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

  async function saveToBackend() {
    setSaving(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services }),
      });
      const data = await res.json();
      showToast(res.ok && data.success ? "✅ Saved!" : "❌ " + (data.error || "Save failed"));
    } catch (e: any) { showToast("❌ " + e.message); }
    setSaving(false);
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  return (
    <section className="w-full px-2 py-4">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-[#00A650] text-white px-5 py-2 rounded-xl shadow-xl z-[100] font-semibold text-sm">
          {toast}
        </div>
      )}

      {/* Header + search */}
      <div className="flex flex-col gap-2 mb-4 px-1">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white">
            {t("हमारी सेवाएं", "Our Services")}
          </h2>
            <div className="w-10 h-1 bg-[#00A650] rounded mt-0.5"></div>
          </div>
          {editMode && isAdminUser && (
            <button onClick={saveToBackend} disabled={saving || !dbLoaded}
              className="bg-[#00A650] text-white px-4 py-1.5 rounded-xl font-bold text-xs disabled:opacity-60">
              {saving ? "Saving..." : "💾 Save"}
            </button>
          )}
        </div>

        {/* Search bar */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("सेवाएं खोजें...", "Search services...")}
            className="w-full pl-8 pr-4 py-2.5 rounded-xl border-2 border-white/30 bg-white/20 text-white placeholder-white/60 font-semibold text-sm focus:outline-none focus:border-white focus:bg-white/30"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white font-bold">✕</button>
          )}
        </div>

        {search && (
          <p className="text-white/70 text-xs px-1">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &quot;{search}&quot;
          </p>
        )}
      </div>

      {/* 3-column grid — mobile first */}
      <div className="grid grid-cols-3 gap-2">
        {filtered.map((svc, index) => (
          <div
            key={svc.id}
            draggable={editMode && isAdminUser}
            onDragStart={() => onDragStart(index)}
            onDragEnter={() => onDragEnter(index)}
            onDragEnd={onDragEnd}
            onDragOver={e => e.preventDefault()}
            className={`relative flex flex-col items-center justify-center bg-white rounded-2xl py-3 px-1 shadow active:scale-95 transition-transform
              ${editMode && isAdminUser ? "border-2 border-dashed border-[#F47216] cursor-grab" : "cursor-pointer"}`}
          >
            <a
              href={editMode ? undefined : svc.url}
              target={editMode ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="flex flex-col items-center w-full"
              onClick={e => editMode && e.preventDefault()}
            >
              <span className="text-3xl mb-1">{svc.icon}</span>
              <span className="text-[#F47216] font-bold text-[11px] text-center leading-tight px-1">{svc.label}</span>
            </a>
          </div>
        ))}
      </div>

      {/* Empty + error states differentiated */}
      {!dbLoaded && (
        <p className="text-center text-white/60 text-sm py-10">
          {t("लोड हो रहा है...", "Loading services…")}
        </p>
      )}
      {dbLoaded && services.length > 0 && filtered.length === 0 && search && (
        <div className="text-center text-white/70 py-10 text-sm">
          No services match &quot;{search}&quot;.
        </div>
      )}
      {dbLoaded && services.length === 0 && (
        <div className="text-center text-white/70 py-10 text-sm">
          {loadError === "empty"
            ? "No services configured yet."
            : `Couldn't load services (${loadError ?? "unknown error"}). Refresh the page or try again in a moment.`}
        </div>
      )}

      {/* Count */}
      {!search && services.length > 0 && (
        <p className="text-center text-white/50 text-xs mt-4">{services.length} {t("सेवाएं उपलब्ध", "services available")}</p>
      )}
    </section>
  );
}
