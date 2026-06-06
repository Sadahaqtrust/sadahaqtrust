"use client";
import SadahaqServicesGrid from "@/app/components/SadahaqServicesGrid";

export default function SadahaqHome() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SadahaqServicesGrid />
      <section className="bg-[#00A650] py-6 px-4 text-center mt-4">
        <p className="text-white font-semibold">
          🌍 साद्दा हक़ इंटरनेशनल · हरियाणा भर में सेवा
        </p>
      </section>
    </div>
  );
}
