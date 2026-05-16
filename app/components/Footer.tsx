"use client";
import { useLang } from "@/lib/lang";

export default function Footer() {
  const { t } = useLang();
  return (
    <footer className="bg-[#00A650] border-t-4 border-[#F47216] mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-5 text-center">
        <p className="text-white font-semibold text-sm">
          🌍 {t("रोहतक, हरियाणा की सेवा में", "Serving Rohtak, Haryana")} · <span className="font-extrabold">{t("साद्दा हक़ इंटरनेशनल दुबई", "Sadahaq International Dubai")}</span>
        </p>
        <p className="text-white/90 text-xs mt-1">
          {t("भारतीय साझेदार", "Indian Partner")}: <span className="font-bold">Saanvi Enterprises India</span>
          {" · "}
          {t("समर्थित", "Supported by")}: <span className="font-bold">{t("साद्दा हक़ ट्रस्ट इंडिया (रजि.-2017)", "Sadahaq Trust India (Regd-2017)")}</span>
        </p>
        <p className="text-white/70 text-xs mt-2">
          © {new Date().getFullYear()} {t("साद्दा हक़ इंटरनेशनल", "Sadahaq International")}. {t("सर्वाधिकार सुरक्षित।", "All rights reserved.")}
        </p>
      </div>
    </footer>
  );
}
