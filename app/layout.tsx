import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import BannerSlideshow from "./components/BannerSlideshow";
import { AuthProvider } from "./context/AuthContext";
import EditLayout from "./components/EditLayout";
import PWARegister from "./components/PWARegister";
import DynamicHead from "./components/DynamicHead";
import { LangProvider } from "@/lib/lang";

export const metadata: Metadata = {
  title: "Digital Rohtak — Your City, Online",
  description: "One platform for all daily needs in Rohtak, Haryana. Maintained by Sadahaq International.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Digital Rohtak",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#F47216",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
      </head>
      <body className="min-h-screen bg-[#F47216]">
        <AuthProvider>
          <LangProvider>
            <EditLayout>
              {/* Mobile-only frame — locks entire platform to 480px max width */}
              <div className="mx-auto bg-[#F47216] min-h-screen flex flex-col shadow-2xl" style={{ maxWidth: "480px" }}>
                <Navbar />
                <BannerSlideshow />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </EditLayout>
          </LangProvider>
        </AuthProvider>
        <DynamicHead />
        <PWARegister />
      </body>
    </html>
  );
}
