"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "hi" | "en";

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (hi: string, en: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: "hi",
  setLang: () => {},
  t: (hi) => hi,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("hi");

  useEffect(() => {
    const saved = localStorage.getItem("dr_lang") as Lang;
    if (saved === "en" || saved === "hi") setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("dr_lang", l);
  }

  function t(hi: string, en: string) {
    return lang === "hi" ? hi : en;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

// Language toggle tabs — हिंदी | English
export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center border-2 border-white/40 rounded-lg overflow-hidden text-xs font-bold">
      <button
        onClick={() => setLang("hi")}
        className={`px-3 py-1 transition-all ${
          lang === "hi"
            ? "bg-white text-[#F47216]"
            : "bg-transparent text-white hover:bg-white/20"
        }`}
      >
        हिंदी
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-3 py-1 transition-all ${
          lang === "en"
            ? "bg-white text-[#F47216]"
            : "bg-transparent text-white hover:bg-white/20"
        }`}
      >
        English
      </button>
    </div>
  );
}
