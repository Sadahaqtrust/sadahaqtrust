import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sadahaq International — Empowering Communities",
  description: "Sadahaq International — Empowering communities through service, education & governance in Rohtak, Haryana.",
  alternates: { canonical: "https://sadahaq.digitalrohtak.online" },
  openGraph: {
    title: "Sadahaq International",
    description: "Empowering communities through service, education & governance in Rohtak, Haryana",
    url: "https://sadahaq.digitalrohtak.online",
    siteName: "Sadahaq International",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function SadahaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
