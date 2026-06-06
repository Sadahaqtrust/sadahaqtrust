"use client";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-lg w-full text-center">
        <div className="text-8xl mb-6">🚧</div>
        <h1 className="text-3xl font-extrabold text-[#F47216] mb-3">Work in Progress</h1>
        <p className="text-gray-600 text-lg mb-2">We're building something great here!</p>
        <p className="text-gray-400 text-sm mb-8">This page is under construction and will be available soon.<br/>Our team is working hard to bring you the best experience.</p>
        <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-3 mb-8 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#F47216] to-[#00A650] animate-pulse" style={{ width: "65%" }} />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="bg-[#00A650] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#F47216] transition-all text-sm">← Back to Home</Link>
          <button onClick={() => window.history.back()} className="bg-white text-[#F47216] border-2 border-[#F47216] px-8 py-3 rounded-xl font-bold hover:bg-[#F47216] hover:text-white transition-all text-sm">Go Back</button>
        </div>
        <p className="text-gray-300 text-xs mt-8">Digital Rohtak · Sadahaq International</p>
      </div>
    </div>
  );
}
