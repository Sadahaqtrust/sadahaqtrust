"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { isAdmin } from "@/lib/admin";
import Link from "next/link";

type Banner = { id: string; url: string; type: "image" | "video" | "audio"; src: string; title?: string; link?: string; sort: number };

export default function AdminBannersPage() {
  const { customer, loading } = useAuth();
  const [site, setSite] = useState("digitalrohtak");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // Detect subdomain — auto-set site
  useEffect(() => {
    const host = window.location.hostname;
    if (host.startsWith("sadahaq.")) setSite("sadahaq");
    else if (host.startsWith("food.")) setSite("food");
    else setSite("digitalrohtak");
  }, []);

  // Load existing banners for this site
  useEffect(() => {
    fetch(`/api/banners?site=${site}`)
      .then(r => r.json())
      .then(d => setBanners(d.banners || []));
  }, [site]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !customer) return;
    setUploading(true); setMsg("");
    const fd = new FormData();
    fd.append("files", file);
    fd.append("site", site);
    try {
      const res = await fetch("/api/banners/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.uploaded?.length) {
        const item = data.uploaded[0];
        const newBanner: Banner = { id: item.id, url: item.src, src: item.src, type: item.type, title: file.name, sort: banners.length };
        setBanners(b => [...b, newBanner]);
        setMsg(`✅ ${file.name} uploaded`);
      } else {
        setMsg(`❌ ${data.errors?.[0] || data.error || "Upload failed"}`);
      }
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    }
    setUploading(false);
  }

  async function saveBanners() {
    setSaving(true);
    const res = await fetch("/api/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site, banners }),
    });
    const data = await res.json();
    setMsg(data.success ? "✅ Saved" : `❌ ${data.error}`);
    setSaving(false);
  }

  function removeBanner(idx: number) {
    setBanners(b => b.filter((_, i) => i !== idx));
  }

  function moveBanner(idx: number, dir: -1 | 1) {
    setBanners(b => {
      const newArr = [...b];
      const target = idx + dir;
      if (target < 0 || target >= newArr.length) return b;
      [newArr[idx], newArr[target]] = [newArr[target], newArr[idx]];
      return newArr;
    });
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!customer) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-extrabold text-[#F47216] mb-3">Admin Login Required</h1>
        <Link href="/auth/login" className="bg-[#F47216] text-white px-5 py-2 rounded-xl font-bold">Login</Link>
      </div>
    );
  }
  if (!isAdmin(customer.email)) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-extrabold text-red-600 mb-2">Access Denied</h1>
        <p className="text-gray-500 text-sm">Only admin can upload banners.</p>
        <p className="text-gray-400 text-xs mt-2">Logged in as: {customer.email}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] px-4 py-5">
      <div className="bg-[#F47216] -mx-4 -mt-5 px-4 py-4 mb-4">
        <h1 className="text-white text-xl font-extrabold">📁 Banner Manager</h1>
        <p className="text-white/80 text-xs">Upload images, videos, audio for {site}.digitalrohtak.online</p>
      </div>

      {/* Site selector */}
      <div className="bg-white rounded-xl p-3 mb-4 shadow-sm">
        <label className="block text-xs font-bold text-gray-500 mb-1">Site</label>
        <select value={site} onChange={e => setSite(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold">
          <option value="digitalrohtak">digitalrohtak.online (root)</option>
          <option value="sadahaq">sadahaq.digitalrohtak.online</option>
          <option value="food">food.digitalrohtak.online</option>
          <option value="shopping">shopping.digitalrohtak.online</option>
        </select>
      </div>

      {/* Upload — click or drag-drop zone */}
      <div className="bg-white rounded-xl mb-4 shadow-sm overflow-hidden">
        <div className="bg-[#F47216] px-4 py-2">
          <p className="text-white text-sm font-extrabold">मीडिया अपलोड करें</p>
        </div>
        <div className="p-4">
          <label
            className={`block w-full rounded-2xl text-center py-10 cursor-pointer transition-all ${
              uploading ? "bg-gray-100 border-2 border-dashed border-gray-300" : "bg-orange-50 border-2 border-dashed border-[#F47216] hover:bg-orange-100"
            }`}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={e => {
              e.preventDefault(); e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file) {
                const input = document.createElement("input");
                input.type = "file";
                const changeEvent = { target: { files: e.dataTransfer.files } } as any;
                handleUpload(changeEvent);
              }
            }}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl animate-spin">⏳</span>
                <span className="text-gray-500 font-bold text-sm">अपलोड हो रहा है...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="text-5xl">📂</span>
                <span className="text-[#F47216] font-extrabold text-base">क्लिक करें या फ़ाइल यहाँ छोड़ें</span>
                <span className="text-gray-400 text-xs">Image · Video · Audio (.mp3 .mp4 .jpg .png)</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*,video/*,audio/*,.mp3,.mp4,.wav,.ogg,.m4a"
              onChange={handleUpload}
              disabled={uploading}
              className="absolute opacity-0 w-0 h-0"
            />
          </label>
          {msg && (
            <div className={`mt-3 text-center text-sm font-bold rounded-xl px-3 py-2 ${msg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {msg}
            </div>
          )}
        </div>
      </div>

      {/* Banner list */}
      <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
        <p className="text-sm font-bold text-gray-700 mb-3">Current banners ({banners.length})</p>
        {banners.length === 0 && <p className="text-gray-400 text-xs text-center py-6">No banners yet</p>}
        <div className="space-y-2">
          {banners.map((b, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
              <div className="w-12 h-12 bg-white rounded overflow-hidden flex items-center justify-center text-2xl flex-shrink-0">
                {b.type === "image" && <img src={b.url} alt="" className="w-full h-full object-cover" />}
                {b.type === "video" && <span>🎬</span>}
                {b.type === "audio" && <span>🎵</span>}
              </div>
              <div className="flex-1 min-w-0">
                <input type="text" value={b.title || ""} placeholder="Title"
                  onChange={e => setBanners(arr => arr.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                  className="w-full text-xs border-b border-gray-200 px-1 py-0.5 outline-none focus:border-[#F47216]" />
                <input type="text" value={b.link || ""} placeholder="Link URL (optional)"
                  onChange={e => setBanners(arr => arr.map((x, j) => j === i ? { ...x, link: e.target.value } : x))}
                  className="w-full text-[10px] text-gray-500 border-b border-gray-100 px-1 py-0.5 mt-0.5 outline-none focus:border-[#F47216]" />
                <p className="text-[9px] text-gray-400 truncate mt-0.5">{b.url}</p>
              </div>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveBanner(i, -1)} className="text-xs text-gray-500 hover:text-[#F47216]" disabled={i === 0}>▲</button>
                <button onClick={() => moveBanner(i, 1)} className="text-xs text-gray-500 hover:text-[#F47216]" disabled={i === banners.length - 1}>▼</button>
              </div>
              <button onClick={() => removeBanner(i)} className="text-red-500 text-lg font-bold px-1">×</button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={saveBanners} disabled={saving}
        className="w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold text-sm hover:bg-[#F47216] disabled:opacity-50">
        {saving ? "Saving..." : "💾 Save Banners"}
      </button>
    </div>
  );
}
