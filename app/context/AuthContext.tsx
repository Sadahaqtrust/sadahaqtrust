"use client";
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { getDeviceFingerprint, DeviceFingerprint } from "@/lib/fingerprint";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at?: string;
  has_account?: boolean;
}

interface AuthContextType {
  customer: Customer | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pin: string, remember: boolean) => Promise<{ error?: string }>;
  register: (email: string, pin: string, firstName: string, lastName: string) => Promise<{ error?: string }>;
  loginWithMobile: (mobile: string, pin: string) => Promise<{ error?: string }>;
  registerWithMobile: (mobile: string, pin: string) => Promise<{ error?: string }>;
  resetPin: (email: string, newPin: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Fire-and-forget audit helper with device fingerprint
function auditLog(action_type: string, details?: Record<string, any>, fp?: DeviceFingerprint | null) {
  try {
    const body: any = { action_type, ...details };
    if (fp) {
      body.client_device = {
        fingerprint: fp.fingerprint,
        screen: fp.screen,
        colorDepth: fp.colorDepth,
        timezone: fp.timezone,
        language: fp.language,
        platform: fp.platform,
        cores: fp.cores,
        memory: fp.memory,
        touchSupport: fp.touchSupport,
        deviceBrand: fp.deviceBrand,
        deviceModel: fp.deviceModel,
      };
    }
    fetch('/api/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {}
}

import { saveToken, getStoredToken, clearSession as clearCookieSession } from "@/lib/authCookies";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fpRef = useRef<DeviceFingerprint | null>(null);

  // Collect fingerprint once on mount
  useEffect(() => {
    getDeviceFingerprint().then(fp => { fpRef.current = fp; }).catch(() => {});
  }, []);

  useEffect(() => {
    const saved = getStoredToken();
    if (saved) {
      setToken(saved);
      fetchCustomer(saved).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchCustomer(jwt: string) {
    try {
      const res = await fetch(`${MEDUSA_URL}/store/customers/me`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
          "x-publishable-api-key": PUB_KEY,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
      } else if (res.status === 401) {
        // Token expired/invalid — clear session fully
        clearSession();
      }
      // Any other error (500, network) — do NOT clear session, keep token
    } catch {
      // Network error — do NOT clear session, user may just be offline
    }
  }

  function clearSession() {
    clearCookieSession();
    setToken(null);
    setCustomer(null);
  }

  async function login(email: string, pin: string, remember: boolean = true) {
    try {
      const res = await fetch(`${MEDUSA_URL}/auth/customer/emailpass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pin }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        auditLog('LOGIN_FAILURE', { email, action_details: { reason: data.message || 'Incorrect email or PIN' } }, fpRef.current);
        return { error: data.message || "Incorrect email or PIN" };
      }
      saveToken(data.token, remember);
      setToken(data.token);
      await fetchCustomer(data.token);
      try { localStorage.setItem('dr_customer_email', email); } catch {}
      auditLog('LOGIN_SUCCESS', { email, action_details: { email } }, fpRef.current);
      return {};
    } catch {
      auditLog('LOGIN_FAILURE', { email, action_details: { reason: 'Network error' } }, fpRef.current);
      return { error: "Network error. Check your connection." };
    }
  }

  async function register(email: string, pin: string, firstName: string, lastName: string) {
    try {
      const regRes = await fetch(`${MEDUSA_URL}/auth/customer/emailpass/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pin }),
      });
      const regData = await regRes.json();
      if (!regRes.ok || !regData.token) {
        auditLog('REGISTRATION_FAILURE', { email, action_details: { reason: regData.message || 'Registration failed' } }, fpRef.current);
        return { error: regData.message || "Registration failed" };
      }

      const custRes = await fetch(`${MEDUSA_URL}/store/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${regData.token}`,
          "x-publishable-api-key": PUB_KEY,
        },
        body: JSON.stringify({ email, first_name: firstName, last_name: lastName }),
      });
      if (!custRes.ok) {
        const e = await custRes.json();
        auditLog('REGISTRATION_FAILURE', { email, action_details: { reason: e.message || 'Profile creation failed' } }, fpRef.current);
        return { error: e.message || "Profile creation failed" };
      }

      auditLog('REGISTRATION_SUCCESS', { email, action_details: { email, firstName, lastName } }, fpRef.current);
      return await login(email, pin, true);
    } catch {
      auditLog('REGISTRATION_FAILURE', { email, action_details: { reason: 'Network error' } }, fpRef.current);
      return { error: "Network error. Check your connection." };
    }
  }

  async function loginWithMobile(mobile: string, pin: string) {
    return login(`91${mobile}@digitalrohtak.online`, pin, true);
  }

  async function registerWithMobile(mobile: string, pin: string) {
    const email = `91${mobile}@digitalrohtak.online`;
    try {
      const regRes = await fetch(`${MEDUSA_URL}/auth/customer/emailpass/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pin }),
      });
      const regData = await regRes.json();
      if (!regRes.ok || !regData.token) {
        if (regData.message?.toLowerCase().includes("exist")) return login(email, pin, true);
        return { error: regData.message || "Registration failed" };
      }
      const custRes = await fetch(`${MEDUSA_URL}/store/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${regData.token}`, "x-publishable-api-key": PUB_KEY },
        body: JSON.stringify({ email, first_name: mobile, last_name: "", phone: mobile }),
      });
      if (!custRes.ok) { const e = await custRes.json(); return { error: e.message || "Profile creation failed" }; }
      saveToken(regData.token, true);
      setToken(regData.token);
      await fetchCustomer(regData.token);
      return {};
    } catch { return { error: "Network error" }; }
  }

  async function resetPin(email: string, newPin: string) {
    try {
      const res = await fetch(`${MEDUSA_URL}/auth/customer/emailpass/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email, password: newPin }),
      });
      if (res.ok) return {};
      const data = await res.json();
      return { error: data.message || "PIN reset failed" };
    } catch {
      return { error: "Network error. Check your connection." };
    }
  }

  function logout() {
    auditLog('LOGOUT', {
      user_id: customer?.id,
      email: customer?.email,
      action_details: { email: customer?.email },
    }, fpRef.current);
    try { localStorage.removeItem('dr_customer_email'); } catch {}
    clearSession();
  }

  return (
    <AuthContext.Provider value={{ customer, token, loading, login, register, loginWithMobile, registerWithMobile, resetPin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
