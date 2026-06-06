import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Professional Service Providers — Digital Rohtak",
  description: "Find and connect with verified Lawyers, CAs, Architects, and other professionals in Rohtak",
}

export default function ProfessionalServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
