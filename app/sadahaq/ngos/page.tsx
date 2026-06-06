export const dynamic = "force-dynamic";
import Link from "next/link";

export default async function NgosPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-lg w-full text-center">
        <div className="text-8xl mb-6">🚧</div>
        <h1 className="text-3xl font-extrabold text-[#F47216] mb-3">Work in Progress</h1>
        <p className="text-gray-600 text-lg mb-2">Ngos section is coming soon!</p>
        <p className="text-gray-400 text-sm mb-8">We're migrating data and building this section.</p>
        <Link href="/sadahaq" className="bg-[#00A650] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#F47216] transition-all text-sm">← साद्दा हक़ पर वापस</Link>
      </div>
    </div>
  );
}
