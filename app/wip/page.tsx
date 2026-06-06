"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function WIPPage() {
  const [serviceName, setServiceName] = useState("This Service");
  const [subdomain, setSubdomain] = useState("");

  useEffect(() => {
    const host = window.location.hostname;
    if (host.endsWith(".digitalrohtak.online")) {
      const sub = host.split(".")[0];
      setSubdomain(sub);
      setServiceName(sub.charAt(0).toUpperCase() + sub.slice(1));
    }
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gradient-to-b from-[#FFF8F0] to-white">
      <div className="max-w-lg w-full text-center bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-7xl mb-4">🚧</div>
        <h1 className="text-2xl font-extrabold text-[#F47216] mb-2">
          {serviceName} — Coming Soon
        </h1>
        <p className="text-gray-600 text-base mb-2 font-semibold">We're building something great here</p>
        <p className="text-gray-400 text-sm mb-6">
          The {serviceName} service landing page is under construction.
          Be among the first to register as a provider!
        </p>

        <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2 mb-6 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#F47216] to-[#00A650] animate-pulse" style={{ width: "65%" }} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="https://professionalservices.digitalrohtak.online/register"
            className="bg-[#F47216] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#00A650] transition-all text-sm">
            ＋ Register as Provider
          </Link>
          <Link href="https://digitalrohtak.online"
            className="bg-[#00A650] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#F47216] transition-all text-sm">
            ← Back to Digital Rohtak
          </Link>
        </div>
        <p className="text-gray-300 text-xs mt-6">Digital Rohtak · Sadahaq International</p>
      </div>
    </div>
  );
}
