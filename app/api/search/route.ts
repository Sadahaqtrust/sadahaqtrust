import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/auditLog";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const res = await fetch(`${MEDUSA_URL}/store/products`, {
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    cache: "no-store",
  });

  const data = await res.json();
  const products = data.products || [];

  const term = q.toLowerCase().trim();

  const filtered = term
    ? products.filter((p: any) =>
        p.title?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.handle?.toLowerCase().includes(term) ||
        p.variants?.some((v: any) =>
          v.title?.toLowerCase().includes(term) ||
          v.sku?.toLowerCase().includes(term)
        )
      )
    : products;

  // Audit log
  if (term) {
    logAudit(req, 'SEARCH_QUERY', { searchTerm: term });
  }

  return NextResponse.json({ products: filtered });
}
