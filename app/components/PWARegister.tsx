"use client";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "pwa_dismissed";
const INSTALLED_KEY = "pwa_installed";
const DISMISS_DAYS = 30;

function shouldShow(): boolean {
  // Already installed as PWA (standalone mode)
  if (window.matchMedia("(display-mode: standalone)").matches) return false;
  // User previously accepted install
  if (localStorage.getItem(INSTALLED_KEY)) return false;
  // User dismissed recently
  const dismissed = localStorage.getItem(DISMISSED_KEY);
  if (dismissed && Date.now() - parseInt(dismissed) < DISMISS_DAYS * 24 * 60 * 60 * 1000) return false;
  return true;
}

export default function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Listen for standalone mode change (user installs via browser)
    const mq = window.matchMedia("(display-mode: standalone)");
    const onStandaloneChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        localStorage.setItem(INSTALLED_KEY, "1");
        setShowBanner(false);
      }
    };
    mq.addEventListener("change", onStandaloneChange);

    const handler = (e: Event) => {
      e.preventDefault();
      if (!shouldShow()) return;
      setInstallPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      mq.removeEventListener("change", onStandaloneChange);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "1");
    }
    setShowBanner(false);
    setInstallPrompt(null);
  }

  function dismissBanner() {
    setShowBanner(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t-4 border-[#F47216] z-[300] p-4">
      <div className="max-w-lg mx-auto flex items-center gap-4">
        <img src="/icons/icon-72x72.png" alt="Digital Rohtak" className="w-12 h-12 rounded-xl" />
        <div className="flex-1">
          <p className="font-bold text-[#F47216] text-sm">Install Digital Rohtak</p>
          <p className="text-gray-500 text-xs">Add to home screen for quick access</p>
        </div>
        <button
          onClick={handleInstall}
          className="bg-[#00A650] text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#F47216] transition-all whitespace-nowrap"
        >
          Install
        </button>
        <button onClick={dismissBanner} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
      </div>
    </div>
  );
}
