"use client";
import { useLang } from "@/lib/lang";

export default function Loading() {
  const { t } = useLang();
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
      <div className="w-12 h-12 border-4 border-white border-t-[#00A650] rounded-full animate-spin"></div>
      <p className="loading-text text-xl font-bold tracking-widest uppercase">
        {t("लोड हो रहा है...", "Loading...")}
      </p>
      <p className="text-white/70 text-sm">{t("साद्दा हक़ इंटरनेशनल", "Sadahaq International")}</p>
    </div>
  );
}
