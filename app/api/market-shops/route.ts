import { NextRequest, NextResponse } from "next/server";

const MEDUSA_URL = process.env.MEDUSA_INTERNAL_URL || "https://api.digitalrohtak.online";
const ADMIN_EMAIL = "admin@digitalrohtak.com";
const ADMIN_PASSWORD = "Admin@1234";

let cachedToken = "";
let tokenExpiry = 0;

async function getAdminToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  cachedToken = data.token || "";
  tokenExpiry = Date.now() + 20 * 60 * 1000; // 20 min
  return cachedToken;
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "";
  const shopId = req.nextUrl.searchParams.get("shopId") || "";

  try {
    const token = await getAdminToken();

    // Single shop lookup by ID
    if (shopId) {
      const res = await fetch(`${MEDUSA_URL}/admin/sales-channels/${shopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return NextResponse.json({ shop: null });
      const data = await res.json();
      const sc = data.sales_channel;
      if (!sc) return NextResponse.json({ shop: null });
      return NextResponse.json({
        shop: {
          name: sc.name,
          mobile: sc.metadata?.mobile,
          category: sc.metadata?.category,
          opening_time: sc.metadata?.opening_time,
          closing_time: sc.metadata?.closing_time,
          address: sc.metadata?.address,
          icon: sc.metadata?.icon,
        },
      });
    }

    // List by market slug
    const res = await fetch(`${MEDUSA_URL}/admin/sales-channels?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const shops = (data.sales_channels || []).filter(
      (sc: { metadata?: { market_slug?: string } }) => sc.metadata?.market_slug === slug
    );
    return NextResponse.json({ shops });
  } catch {
    return NextResponse.json({ shops: [], shop: null });
  }
}
