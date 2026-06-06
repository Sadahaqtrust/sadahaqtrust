/**
 * Dashboard index page — Server Component
 *
 * Immediately redirects to the Products sub-page so that
 * `/[channel]/dashboard` always lands on the product list.
 *
 * Requirements: 1.1
 */

import { redirect } from "next/navigation";

interface DashboardPageProps {
  params: { channel: string };
}

export default function DashboardPage({ params }: DashboardPageProps) {
  redirect(`/${params.channel}/dashboard/products`);
}
