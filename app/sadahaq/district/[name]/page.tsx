export const dynamic = "force-dynamic";
import { getPage, getAllPages } from "@/lib/sadahaqDb";
import { notFound } from "next/navigation";
import Link from "next/link";

export async function generateStaticParams() {
  const pages = await getAllPages() as any[];
  return pages
    .filter((p: any) => p.slug.startsWith("/district/"))
    .map((p: any) => ({ name: p.slug.replace("/district/", "") }));
}

export default async function DistrictPage({ params }: { params: { name: string } }) {
  const page = await getPage(`/district/${params.name}`) as any;
  if (!page) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/" className="text-white/70 hover:text-white text-sm mb-4 inline-block">
        ← Back to Home
      </Link>
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content || "" }} />
      </div>
    </div>
  );
}
