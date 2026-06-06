"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";

type Market = {
  id: number;
  slug: string;
  icon: string;
  name_hi: string;
  name_en: string;
  area: string;
};

const MARKETS: Market[] = [
  { id: 1,  slug: "sector-1-market",            icon: "🏪", name_hi: "सेक्टर 1 मार्केट",              name_en: "Sector 1 Market",                          area: "Sector 1" },
  { id: 2,  slug: "sector-2-sabji-mandi",        icon: "🥦", name_hi: "सेक्टर 2 सब्जी मंडी",           name_en: "Sector 2 Commercial Belt & Sabji Mandi",   area: "Sector 2" },
  { id: 3,  slug: "sector-3-vivek-complex",      icon: "🛍️", name_hi: "विवेक शॉपिंग कॉम्प्लेक्स",     name_en: "Sector 3 Vivek Shopping Complex",          area: "Sector 3" },
  { id: 4,  slug: "sector-4-5-markets",          icon: "🏬", name_hi: "सेक्टर 4-5 मार्केट",            name_en: "Sector 4 & 5 Markets",                     area: "Sector 4-5" },
  { id: 5,  slug: "sector-6-market-strip",       icon: "🏘️", name_hi: "सेक्टर 6 मार्केट स्ट्रिप",     name_en: "Sector 6 Market Strip",                    area: "Sector 6" },
  { id: 6,  slug: "sector-13-commercial",        icon: "🏢", name_hi: "सेक्टर 13 कमर्शियल",            name_en: "Sector 13 Commercial Complex",             area: "Sector 13" },
  { id: 7,  slug: "sector-14-high-street",       icon: "🛒", name_hi: "सेक्टर 14 हाई स्ट्रीट",         name_en: "Sector 14 Core High Street",               area: "Sector 14" },
  { id: 8,  slug: "sector-21-kath-mandi",        icon: "🪵", name_hi: "सेक्टर 21 काठ मंडी",            name_en: "Sector 21 New Kath Mandi",                 area: "Sector 21" },
  { id: 9,  slug: "sector-18-transport-nagar",   icon: "🚗", name_hi: "ट्रांसपोर्ट नगर ऑटो मार्केट",  name_en: "Sector 18 Transport Nagar & Auto Market",  area: "Sector 18-18A" },
  { id: 10, slug: "sector-25-rail-siding",       icon: "🚂", name_hi: "सेक्टर 25 रेल साइडिंग",         name_en: "Sector 25 Rail-Siding Hubs",               area: "Sector 25" },
  { id: 11, slug: "sector-26-27-csc",            icon: "🏪", name_hi: "सेक्टर 26-27 CSC",              name_en: "Sector 26 & 27 Neighborhood CSCs",         area: "Sector 26-27" },
  { id: 12, slug: "sector-30-31-city-centre",    icon: "🏙️", name_hi: "सिटी सेंटर प्रोजेक्ट",         name_en: "Sector 30 & 31-A City Centre Project",     area: "Sector 30-31A" },
  { id: 13, slug: "sector-34-35-commercial",     icon: "🏗️", name_hi: "सेक्टर 34-35 कमर्शियल",        name_en: "Sector 34 & 35 Commercial Belts",          area: "Sector 34-35" },
  { id: 14, slug: "suncity-sco-market",          icon: "🌇", name_hi: "सनसिटी SCO मार्केट",            name_en: "Suncity SCO Market Blocks",                area: "Suncity" },
  { id: 15, slug: "suncity-central-plaza",       icon: "🏛️", name_hi: "सनसिटी सेंट्रल प्लाज़ा",       name_en: "Suncity Central Plaza",                    area: "Suncity" },
  { id: 16, slug: "omaxe-city-commercial",       icon: "🏠", name_hi: "ओमैक्स सिटी कमर्शियल",          name_en: "Omaxe City Commercial Strips",             area: "Omaxe City" },
  { id: 17, slug: "omaxe-avenue-point",          icon: "📍", name_hi: "ओमैक्स एवेन्यू पॉइंट",          name_en: "Omaxe Avenue Point",                       area: "Omaxe City" },
  { id: 18, slug: "merion-sky-mall",             icon: "🌆", name_hi: "मेरियन स्काई मॉल",              name_en: "Merion Sky Mall (Sonipat Road)",            area: "Sonipat Road" },
  { id: 19, slug: "liberty-jop-square-mall",     icon: "🛍️", name_hi: "लिबर्टी जॉप स्क्वायर मॉल",    name_en: "Liberty Jop Square Mall (Delhi Road)",     area: "Delhi Road" },
  { id: 20, slug: "agro-mall",                   icon: "🌾", name_hi: "एग्रो मॉल",                     name_en: "Agro Mall (Delhi Road)",                   area: "Delhi Road" },
  { id: 21, slug: "new-grain-market",            icon: "🌾", name_hi: "नई अनाज मंडी",                  name_en: "New Grain Market (Nayi Anaj Mandi)",       area: "City Centre" },
  { id: 22, slug: "imt-rohtak-commercial",       icon: "🏭", name_hi: "IMT रोहतक कमर्शियल",            name_en: "IMT Rohtak Commercial Nodes",              area: "IMT Rohtak" },
  { id: 23, slug: "shori-market",                icon: "🛒", name_hi: "शोरी मार्केट",                  name_en: "Shori Market",                             area: "Old City" },
  { id: 24, slug: "quilla-road-market",          icon: "🏰", name_hi: "क़िला रोड मार्केट",             name_en: "Quilla Road Market",                       area: "Old City" },
  { id: 25, slug: "railway-road-market",         icon: "🚉", name_hi: "रेलवे रोड मार्केट",             name_en: "Railway Road Market",                      area: "Old City" },
  { id: 26, slug: "model-town-d-park",           icon: "🌳", name_hi: "मॉडल टाउन / D-पार्क",           name_en: "Model Town / D-Park Area",                 area: "Model Town" },
  { id: 27, slug: "ramkali-market",              icon: "🏪", name_hi: "रामकली मार्केट",                name_en: "Ramkali Market",                           area: "Old City" },
  { id: 28, slug: "palika-bazaar",               icon: "🎪", name_hi: "पालिका बाज़ार",                 name_en: "Palika Bazaar (Company Bagh)",             area: "City Centre" },
  { id: 29, slug: "old-housing-board-market",    icon: "🏘️", name_hi: "10 नंबर की दुकान",             name_en: "Old Housing Board Colony Market",          area: "Old City" },
  { id: 30, slug: "sheetal-lifestyle-mall",      icon: "✨", name_hi: "शीतल लाइफस्टाइल मॉल",          name_en: "Sheetal Lifestyle Mall (Dariyao Nagar)",   area: "Dariyao Nagar" },
  { id: 31, slug: "civil-circular-road",         icon: "🛣️", name_hi: "सिविल रोड हाई स्ट्रीट",        name_en: "Civil Road & Circular Road High Streets",  area: "City Centre" },
  { id: 32, slug: "bhiwani-stand-citi-center",   icon: "🚌", name_hi: "भिवानी स्टैंड सिटी सेंटर",     name_en: "Bhiwani Stand Area (Citi Center)",         area: "City Centre" },
  { id: 33, slug: "sukhpura-jind-road",          icon: "🛤️", name_hi: "सुखपुरा चौक जींद रोड",         name_en: "Sukhpura Chowk & Jind Road Strip",         area: "Jind Road" },
  { id: 34, slug: "pratap-talkies-dev-colony",   icon: "🎬", name_hi: "प्रताप टॉकीज़ / देव कॉलोनी",   name_en: "Pratap Talkies Road / Dev Colony Markets", area: "Dev Colony" },
];

export { MARKETS };

export default function MarketsGrid() {
  const [search, setSearch] = useState("");
  const { t, lang } = useLang();
  const router = useRouter();

  const filtered = search.trim()
    ? MARKETS.filter(m =>
        m.name_en.toLowerCase().includes(search.toLowerCase()) ||
        m.name_hi.includes(search) ||
        m.area.toLowerCase().includes(search.toLowerCase())
      )
    : MARKETS;

  return (
    <section className="w-full px-3 py-3">
      {/* Search */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("बाज़ार खोजें...", "Search markets...")}
          className="w-full pl-9 pr-10 py-2.5 rounded-xl border-2 border-white/30 bg-white/20 text-white placeholder-white/60 font-semibold text-sm focus:outline-none focus:border-white focus:bg-white/30"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white font-bold">✕</button>
        )}
      </div>

      <p className="text-white/70 text-[11px] font-semibold mb-3 px-1">
        {filtered.length} {t("बाज़ार", "markets")}
      </p>

      {/* 3-col icon grid — same as ServicesGrid */}
      <div className="grid grid-cols-3 gap-2">
        {filtered.map(m => {
          const label = lang === "hi" ? m.name_hi : m.name_en;
          return (
            <button
              key={m.id}
              onClick={() => router.push(`/market/${m.slug}`)}
              className="flex flex-col items-center justify-center bg-white rounded-2xl py-3 px-1 shadow active:scale-95 transition-transform cursor-pointer"
            >
              <span className="text-3xl mb-1">{m.icon}</span>
              <span className="text-[#F47216] font-bold text-[10px] text-center leading-tight px-0.5 line-clamp-2">{label}</span>
              <span className="text-gray-400 text-[9px] mt-0.5">{m.area}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-white/70 py-10 text-sm">
          {t("कोई बाज़ार नहीं मिला", "No markets found")} &quot;{search}&quot;
        </div>
      )}
    </section>
  );
}
