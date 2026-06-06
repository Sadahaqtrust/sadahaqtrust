"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Maps subdomain → registration destination
const SUBDOMAIN_REGISTER_MAP: Record<string, string> = {
  // Professional services
  advocate: "/professionalservices/register",
  lawyer: "/professionalservices/register",
  legal: "/professionalservices/register",
  ca: "/professionalservices/register",
  accountant: "/professionalservices/register",
  cs: "/professionalservices/register",
  property: "/professionalservices/register",
  realestate: "/professionalservices/register",
  insurance: "/professionalservices/register",
  architect: "/professionalservices/register",
  interior: "/professionalservices/register",
  notary: "/professionalservices/register",
  hr: "/professionalservices/register",
  civilengineer: "/professionalservices/register",
  tax: "/professionalservices/register",
  gst: "/professionalservices/register",
  finance: "/professionalservices/register",
  stockadvisor: "/professionalservices/register",
  loan: "/professionalservices/register",
  mutualfund: "/professionalservices/register",
  surveyor: "/professionalservices/register",
  valuer: "/professionalservices/register",
  townplanner: "/professionalservices/register",
  structural: "/professionalservices/register",
  mep: "/professionalservices/register",
  landscape: "/professionalservices/register",
  vastu: "/professionalservices/register",
  immigration: "/professionalservices/register",
  visa: "/professionalservices/register",
  passport: "/professionalservices/register",
  detective: "/professionalservices/register",
  security: "/professionalservices/register",
  eventmanagement: "/professionalservices/register",
  // Home services
  electrician: "/professionalservices/register",
  plumber: "/professionalservices/register",
  carpenter: "/professionalservices/register",
  painter: "/professionalservices/register",
  cleaning: "/professionalservices/register",
  pestcontrol: "/professionalservices/register",
  // Beauty & wellness
  salon: "/professionalservices/register",
  beauty: "/professionalservices/register",
  gym: "/professionalservices/register",
  yoga: "/professionalservices/register",
  // Education
  tutor: "/professionalservices/register",
  coaching: "/professionalservices/register",
  driving: "/professionalservices/register",
  music: "/professionalservices/register",
  // Health
  dentist: "/professionalservices/register",
  vet: "/professionalservices/register",
  pharmacy: "/professionalservices/register",
  health: "/professionalservices/register",
  hospital: "/professionalservices/register",
  // Personal care
  laundry: "/professionalservices/register",
  tailoring: "/professionalservices/register",
  movers: "/professionalservices/register",
  photography: "/professionalservices/register",
  catering: "/professionalservices/register",
  // Food
  food: "/food/register",
  restaurant: "/food/register",
};

export default function ServiceSubdomainRegisterPage() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const router = useRouter();

  useEffect(() => {
    const target = SUBDOMAIN_REGISTER_MAP[subdomain?.toLowerCase()] || "/professionalservices/register";
    router.replace(target);
  }, [subdomain]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-white border-t-[#00A650] rounded-full animate-spin" />
    </div>
  );
}
