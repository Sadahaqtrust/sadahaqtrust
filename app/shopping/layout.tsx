import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopping — Digital Rohtak",
  description: "Best shopping in Rohtak, Haryana",
  alternates: { canonical: "https://shopping.digitalrohtak.online" },
};

export default function ShoppingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
