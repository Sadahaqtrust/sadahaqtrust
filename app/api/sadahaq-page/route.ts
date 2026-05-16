import { NextResponse } from "next/server";
import { getBanners, getPage } from "@/lib/sadahaqDb";

export async function GET() {
  try {
    const [homePage, banners] = await Promise.all([
      getPage("/"),
      getBanners("sadahaq"),
    ]);
    return NextResponse.json({
      content: (homePage as any)?.content || "",
      banners: banners || [],
    });
  } catch (err: any) {
    return NextResponse.json({ content: "", banners: [], error: err.message });
  }
}
