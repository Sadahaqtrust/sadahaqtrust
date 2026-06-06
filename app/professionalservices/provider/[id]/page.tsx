"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import Link from "next/link";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "";

type Service = { id: string; name: string; base_price: number; duration_minutes: number };
type Provider = {
  id: string;
  full_name: string;
  category_id: string;
  locality: string;
  experience_years: number;
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
  is_active: boolean;
  short_bio?: string;
  mobile?: string;
  email?: string;
  gender?: string;
  working_days?: string;
  working_hours_start?: string;
  working_hours_end?: string;
  slot_duration_minutes?: number;
  accepts_cash?: boolean;
  accepts_upi?: boolean;
  accepts_card?: boolean;
  services?: Service[];
};

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLang();
  const router = useRouter();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookError, setBookError] = useState("");

  useEffect(() => {
    fetch(`${MEDUSA_URL}/store/providers/${id}`, {
      headers: { "x-publishable-api-key": PK },
    })
      .then(r => r.json())
      .then(d => {
        if (d.provider) setProvider(d.provider);
        else setError(t("प्रोफाइल नहीं मिली", "Provider not found"));
      })
      .catch(() => setError(t("नेटवर्क त्रुटि", "Network error")))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingService || !bookingDate || !bookingTime || !bookingName || !bookingPhone) {
      setBookError(t("सभी फ़ील्ड भरें", "Please fill all fields"));
      return;
    }
    setBooking(true); setBookError("");
    try {
      const res = await fetch(`${MEDUSA_URL}/store/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
        body: JSON.stringify({
          provider_id: id,
          service_id: bookingService.id,
          customer_name: bookingName,
          customer_phone: bookingPhone,
          scheduled_at: `${bookingDate}T${bookingTime}:00+05:30`,
          notes: bookingNotes,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Booking failed");
      setBooked(true);
    } catch (err: any) {
      setBookError(err.message || t("बुकिंग विफल", "Booking failed"));
    }
    setBooking(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-white border-t-[#00A650] rounded-full animate-spin" />
    </div>
  );

  if (error || !provider) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">🔍</div>
      <p className="text-white font-bold text-lg">{error || t("प्रोफाइल नहीं मिली", "Provider not found")}</p>
      <button onClick={() => router.back()} className="mt-4 text-white/70 text-sm">← {t("वापस", "Back")}</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <div className="bg-[#F47216] px-4 pt-5 pb-8 relative">
        <button onClick={() => router.back()}
          className="absolute top-3 left-3 bg-white/20 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-white/30">
          ← {t("वापस", "Back")}
        </button>
        <div className="text-center pt-4">
          <div className="w-16 h-16 rounded-full bg-white mx-auto mb-2 flex items-center justify-center text-3xl font-extrabold text-[#F47216]">
            {provider.full_name[0]?.toUpperCase()}
          </div>
          <h1 className="text-xl font-extrabold text-white">{provider.full_name}</h1>
          {provider.locality && <p className="text-white/80 text-xs mt-0.5">📍 {provider.locality}, Rohtak</p>}
          <div className="flex justify-center gap-2 mt-2 flex-wrap">
            {provider.is_verified && (
              <span className="bg-[#00A650] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">✓ {t("सत्यापित", "Verified")}</span>
            )}
            {provider.experience_years > 0 && (
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">🏆 {provider.experience_years} {t("वर्ष", "yrs")}</span>
            )}
            {provider.rating_count > 0 && (
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">⭐ {provider.rating_avg} ({provider.rating_count})</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Bio */}
        {provider.short_bio && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-gray-700 text-sm">{provider.short_bio}</p>
          </div>
        )}

        {/* Availability */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-extrabold text-[#F47216] text-sm mb-2">📅 {t("उपलब्धता", "Availability")}</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            {provider.working_days && (
              <div><span className="font-semibold">{t("दिन:", "Days:")}</span> {provider.working_days}</div>
            )}
            {provider.working_hours_start && (
              <div><span className="font-semibold">{t("समय:", "Hours:")}</span> {provider.working_hours_start} – {provider.working_hours_end}</div>
            )}
          </div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {provider.accepts_cash && <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full border border-green-200">💵 {t("नकद", "Cash")}</span>}
            {provider.accepts_upi && <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">📱 UPI</span>}
            {provider.accepts_card && <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">💳 {t("कार्ड", "Card")}</span>}
          </div>
        </div>

        {/* Services */}
        {provider.services && provider.services.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-extrabold text-[#F47216] text-sm mb-3">🛠️ {t("सेवाएं", "Services")}</h3>
            <div className="space-y-2">
              {provider.services.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-[#FFF8F0] rounded-xl px-3 py-2.5">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{s.name}</p>
                    {s.duration_minutes > 0 && <p className="text-gray-400 text-xs">⏱ {s.duration_minutes} {t("मिनट", "min")}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-[#F47216]">₹{s.base_price}</p>
                    <button
                      onClick={() => setBookingService(s)}
                      className="text-[10px] bg-[#F47216] text-white px-2 py-0.5 rounded-lg font-bold mt-0.5 hover:bg-[#00A650] transition-all"
                    >
                      {t("बुक करें", "Book")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {(provider.mobile || provider.email) && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h3 className="font-extrabold text-[#F47216] text-sm mb-2">📞 {t("संपर्क", "Contact")}</h3>
            {provider.mobile && (
              <a href={`tel:+91${provider.mobile}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#F47216] transition-all mb-1">
                📱 +91 {provider.mobile}
              </a>
            )}
            {provider.email && (
              <a href={`mailto:${provider.email}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#F47216] transition-all">
                ✉️ {provider.email}
              </a>
            )}
          </div>
        )}

        {/* Booking form */}
        {bookingService && !booked && (
          <div className="bg-white rounded-2xl shadow-xl p-5 border-2 border-[#F47216]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-[#F47216] text-sm">📅 {t("अपॉइंटमेंट बुक करें", "Book Appointment")}</h3>
              <button onClick={() => { setBookingService(null); setBookError(""); }} className="text-gray-400 font-bold text-lg">✕</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              {bookingService.name} · ₹{bookingService.base_price} · ⏱ {bookingService.duration_minutes} {t("मिनट", "min")}
            </p>
            {bookError && <div className="bg-red-50 text-red-600 rounded-xl px-3 py-2 mb-3 text-xs">{bookError}</div>}
            <form onSubmit={handleBooking} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("नाम *", "Name *")}</label>
                  <input value={bookingName} onChange={e => setBookingName(e.target.value)}
                    placeholder="Rahul Kumar" required
                    className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("फ़ोन *", "Phone *")}</label>
                  <input value={bookingPhone} onChange={e => setBookingPhone(e.target.value)}
                    placeholder="9876543210" type="tel" required
                    className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("तारीख *", "Date *")}</label>
                  <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("समय *", "Time *")}</label>
                  <input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)} required
                    className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[#F47216] font-bold text-xs uppercase block mb-1">{t("नोट्स", "Notes")}</label>
                <textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} rows={2}
                  placeholder={t("आपकी समस्या या अनुरोध...", "Describe your issue or request...")}
                  className="w-full border-2 border-gray-200 focus:border-[#F47216] rounded-xl px-3 py-2 text-sm outline-none resize-none" />
              </div>
              <button type="submit" disabled={booking}
                className="w-full bg-[#00A650] text-white py-3 rounded-xl font-extrabold hover:bg-[#F47216] transition-all disabled:opacity-60">
                {booking ? t("बुक हो रहा है...", "Booking...") : t("अपॉइंटमेंट कन्फर्म करें ✓", "Confirm Appointment ✓")}
              </button>
            </form>
          </div>
        )}

        {booked && (
          <div className="bg-white rounded-2xl shadow-xl p-5 text-center border-2 border-[#00A650]">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="font-extrabold text-[#00A650] text-lg mb-1">{t("अपॉइंटमेंट बुक हो गई!", "Appointment Booked!")}</h3>
            <p className="text-gray-500 text-sm mb-4">{t("प्रदाता जल्द ही आपसे संपर्क करेंगे।", "The provider will contact you shortly.")}</p>
            <Link href="/professionalservices"
              className="block bg-[#F47216] text-white py-3 rounded-xl font-extrabold hover:bg-[#00A650] transition-all">
              ← {t("सेवाओं पर वापस", "Back to Services")}
            </Link>
          </div>
        )}

        {/* Book if no service selected */}
        {!bookingService && !booked && provider.services && provider.services.length > 0 && (
          <button
            onClick={() => setBookingService(provider.services![0])}
            className="w-full bg-[#F47216] text-white py-4 rounded-2xl font-extrabold text-base shadow-lg hover:bg-[#00A650] transition-all"
          >
            📅 {t("अपॉइंटमेंट बुक करें", "Book Appointment")}
          </button>
        )}
      </div>
    </div>
  );
}
