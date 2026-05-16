"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { getCookie } from "@/lib/authCookies";

const ROOT_LOGIN = "https://digitalrohtak.online/auth/login";

export default function SubdomainAuthGuard({ children }: { children: React.ReactNode }) {
  const { customer, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (customer) { setReady(true); return; }

    const token = getCookie("dr_token");
    if (token) {
      // Token in cookie — AuthContext is still fetching, wait for it
      setReady(true);
      return;
    }

    // No token at all — redirect to login once, no loop
    if (!redirecting) {
      setRedirecting(true);
      const from = encodeURIComponent(window.location.href);
      window.location.href = `${ROOT_LOGIN}?from=${from}`;
    }
  }, [loading, customer]);

  if (!ready) return null;
  return <>{children}</>;
}
