"use client";
/**
 * DashboardShell
 *
 * Client component that wraps the Seller Dashboard with:
 *  - Brand colour header (#F47216)
 *  - Navigation tabs: Products | Orders | Earnings
 *  - Mobile-first layout (max-width 480 px, inherited from root layout)
 *
 * Requirements: 1.1, 1.6, 1.9
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SellerStoreSummary {
  id: string;
  name: string;
  handle: string;
}

interface DashboardShellProps {
  channel: string;
  seller: SellerStoreSummary;
  children: React.ReactNode;
}

const TABS = [
  { label: "Products", href: (ch: string) => `/${ch}/dashboard/products` },
  { label: "Orders",   href: (ch: string) => `/${ch}/dashboard/orders`   },
  { label: "Earnings", href: (ch: string) => `/${ch}/dashboard/earnings` },
] as const;

export default function DashboardShell({
  channel,
  seller,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Header */}
      <div
        className="px-4 pt-5 pb-0"
        style={{ backgroundColor: "#F47216" }}
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-lg font-extrabold text-white leading-tight">
              🏪 {seller.name}
            </h1>
            <p className="text-white/70 text-xs">Seller Dashboard</p>
          </div>
          <span className="text-white/60 text-xs font-mono">{channel}</span>
        </div>

        {/* Navigation tabs */}
        <nav className="flex gap-1 mt-3" aria-label="Dashboard navigation">
          {TABS.map((tab) => {
            const href = tab.href(channel);
            const isActive = pathname?.startsWith(href);
            return (
              <Link
                key={tab.label}
                href={href}
                className={[
                  "flex-1 text-center py-2.5 text-xs font-bold rounded-t-lg transition-colors",
                  isActive
                    ? "bg-white text-[#F47216]"
                    : "text-white/80 hover:text-white hover:bg-white/20",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page content */}
      <main className="px-4 py-4">{children}</main>
    </div>
  );
}
