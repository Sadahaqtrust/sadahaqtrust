"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useEditLayout } from "@/app/components/EditLayout";
import { useLang } from "@/lib/lang";

interface BannerItem {
  id: string;
  type: "image" | "video" | "audio";
  src: string;
  link?: string;
  sort: number;
}

export default function BannerSlideshow() {
  const { editMode, isAdminUser } = useEditLayout();
  const { t } = useLang();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Detect which subdomain we're on
  const [siteKey, setSiteKey] = useState("digitalrohtak");
  useEffect(() => {
    const host = window.location.hostname;
    if (host.startsWith("sadahaq.")) setSiteKey("sadahaq");
    else if (host === "digitalrohtak.online") setSiteKey("digitalrohtak");
    else {
      const sub = host.split(".")[0];
      setSiteKey(sub || "digitalrohtak");
    }
  }, []);

  // Load banners
  useEffect(() => {
    if (!siteKey) return;
    fetch(`/api/banners?site=${siteKey}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.banners) && data.banners.length > 0) {
          setBanners(data.banners.sort((a: BannerItem, b: BannerItem) => a.sort - b.sort));
        }
      })
      .catch(() => {});
  }, [siteKey]);

  // Auto-slide every 5s (pause when video is playing)
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (banners.length <= 1 || playing) return;
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % banners.length);
    }, 5000);
  }, [banners.length, playing]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  function goTo(idx: number) {
    setCurrent(idx);
    setPlaying(null);
    startTimer();
  }

  function playVideo(id: string) {
    setPlaying(id);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => videoRef.current?.play(), 100);
  }

  // Admin: upload file
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    formData.append("site", siteKey);
    try {
      const res = await fetch("/api/banners/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.uploaded) {
        const newBanners = [...banners];
        for (const item of data.uploaded) {
          newBanners.push({
            id: item.id,
            type: item.type,
            src: item.src,
            link: "",
            sort: newBanners.length,
          });
        }
        setBanners(newBanners);
        showToast(`✅ ${data.uploaded.length} file(s) uploaded`);
      }
    } catch (err: any) {
      showToast("❌ Upload failed: " + err.message);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  // Admin: remove banner
  function removeBanner(id: string) {
    setBanners(banners.filter(b => b.id !== id));
    if (current >= banners.length - 1) setCurrent(0);
  }

  // Admin: move banner
  function moveBanner(idx: number, dir: -1 | 1) {
    const arr = [...banners];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    arr.forEach((b, i) => b.sort = i);
    setBanners(arr);
  }

  // Admin: update link
  function updateLink(id: string, link: string) {
    setBanners(banners.map(b => b.id === id ? { ...b, link } : b));
  }

  // Admin: save to backend
  async function saveBanners() {
    setSaving(true);
    try {
      const res = await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site: siteKey, banners }),
      });
      const data = await res.json();
      if (data.success) showToast("✅ Banners saved!");
      else showToast("❌ " + (data.error || "Save failed"));
    } catch (err: any) {
      showToast("❌ " + err.message);
    }
    setSaving(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  if (banners.length === 0 && !(editMode && isAdminUser)) return null;

  const activeBanner = banners[current];

  return (
    <div className="relative w-full">
      {/* Slideshow display area */}
      <div className="relative w-full overflow-hidden bg-black" style={{ height: "30vh", minHeight: "180px", maxHeight: "380px" }}>
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 bg-[#00A650] text-white px-5 py-2 rounded-xl shadow-xl z-[200] font-semibold text-sm">
            {toast}
          </div>
        )}

        {banners.length === 0 && editMode && isAdminUser && (
          <div className="flex items-center justify-center h-full text-white/60 text-lg font-semibold">
            {t("अभी कोई बैनर नहीं", "No banners yet — upload below")}
          </div>
        )}

        {activeBanner && activeBanner.type === "video" ? (
          <video
            ref={videoRef}
            src={activeBanner.src}
            className="w-full h-full object-cover"
            controls
            preload="metadata"
            playsInline
            onPlay={() => { setPlaying(activeBanner.id); if (timerRef.current) clearInterval(timerRef.current); }}
            onPause={() => setPlaying(null)}
            onEnded={() => { setPlaying(null); goTo((current + 1) % banners.length); }}
          />
        ) : activeBanner && activeBanner.type === "audio" ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F47216] to-[#00A650] gap-3 px-4">
            <div className="text-6xl">🎵</div>
            <p className="text-white font-extrabold text-sm text-center">{activeBanner.link || activeBanner.src.split("/").pop()}</p>
            <audio
              src={activeBanner.src}
              controls
              preload="metadata"
              className="w-full max-w-xs"
              onPlay={() => { setPlaying(activeBanner.id); if (timerRef.current) clearInterval(timerRef.current); }}
              onPause={() => setPlaying(null)}
              onEnded={() => { setPlaying(null); goTo((current + 1) % banners.length); }}
            />
          </div>
        ) : activeBanner && activeBanner.type === "image" ? (
          <div className="w-full h-full cursor-pointer"
            onClick={() => { if (activeBanner.link) window.open(activeBanner.link, "_blank"); }}>
            <img src={activeBanner.src} alt="Banner" className="w-full h-full object-contain bg-black" />
          </div>
        ) : null}

        {/* Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {banners.map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? "bg-white scale-125" : "bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        )}

        {/* Arrows */}
        {banners.length > 1 && (
          <>
            <button onClick={() => goTo((current - 1 + banners.length) % banners.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center z-10 text-lg">
              ‹
            </button>
            <button onClick={() => goTo((current + 1) % banners.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white w-8 h-8 rounded-full flex items-center justify-center z-10 text-lg">
              ›
            </button>
          </>
        )}
      </div>

      {/* Admin controls — outside slideshow, below it */}
      {editMode && isAdminUser && (
        <div className="bg-gray-900 px-4 py-3 mt-1">{/* mt-1 separates from slideshow */}
          <div className="flex flex-col gap-2">
            {/* Upload button */}
            <label className="flex items-center justify-center bg-[#F47216] text-white py-3 rounded-xl font-bold text-sm cursor-pointer hover:bg-[#E06010] active:scale-95 transition-all">
              {uploading ? t("⏳ अपलोड हो रहा है...", "⏳ Uploading...") : t("📂 फ़ाइल चुनें — Image / Video / Audio", "📂 Choose File — Image / Video / Audio")}
              <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,.mp3,.mp4,.wav,.ogg,.m4a" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
            {/* Save button */}
            <button onClick={saveBanners} disabled={saving}
              className="w-full bg-[#00A650] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#007A3D] active:scale-95 transition-all disabled:opacity-60">
              {saving ? t("सहेजा जा रहा है...", "Saving...") : t("बैनर सहेजें", "Save Banners")}
            </button>
            <p className="text-white/40 text-[10px] text-center">Image 20MB · Video 100MB · Audio 20MB</p>
          </div>

          {/* Banner list */}
          {banners.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {banners.map((b, i) => (
                <div key={b.id} className={`flex-shrink-0 w-40 bg-gray-800 rounded-lg overflow-hidden border-2 ${i === current ? "border-[#F47216]" : "border-transparent"}`}>
                  <div className="h-16 bg-black flex items-center justify-center cursor-pointer" onClick={() => goTo(i)}>
                    {b.type === "video" ? (
                      <span className="text-white text-2xl">🎬</span>
                    ) : b.type === "audio" ? (
                      <span className="text-white text-2xl">🎵</span>
                    ) : (
                      <img src={b.src} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="p-1.5 flex flex-col gap-1">
                    <input
                      value={b.link || ""}
                      onChange={e => updateLink(b.id, e.target.value)}
                      placeholder="Click URL"
                      className="text-xs bg-gray-700 text-white rounded px-1 py-0.5 w-full"
                    />
                    <div className="flex gap-1 justify-between">
                      <div className="flex gap-0.5">
                        <button onClick={() => moveBanner(i, -1)} className="text-white/60 hover:text-white text-xs">◀</button>
                        <button onClick={() => moveBanner(i, 1)} className="text-white/60 hover:text-white text-xs">▶</button>
                      </div>
                      <button onClick={() => removeBanner(b.id)} className="text-red-400 hover:text-red-300 text-xs font-bold">✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
