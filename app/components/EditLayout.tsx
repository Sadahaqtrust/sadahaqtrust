"use client";
import { useState, useRef, useEffect, createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { isAdmin } from "@/lib/admin";
import { getDeviceFingerprint, DeviceFingerprint } from "@/lib/fingerprint";
import { useRouter, usePathname } from "next/navigation";

// ── Context so any child can call useEditLayout()
interface EditLayoutContextType {
  editMode: boolean;
  isAdminUser: boolean;
}
const EditLayoutContext = createContext<EditLayoutContextType>({ editMode: false, isAdminUser: false });
export function useEditLayout() { return useContext(EditLayoutContext); }

// ── Draggable item wrapper
export function Draggable({
  index, onReorder, children, className = ""
}: {
  index: number;
  onReorder: (from: number, to: number) => void;
  children: ReactNode;
  className?: string;
}) {
  const { editMode } = useEditLayout();
  const dragOver = useRef<number | null>(null);

  if (!editMode) return <div className={className}>{children}</div>;

  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData("text/plain", String(index))}
      onDragOver={e => { e.preventDefault(); dragOver.current = index; }}
      onDrop={e => {
        const from = parseInt(e.dataTransfer.getData("text/plain"));
        onReorder(from, index);
      }}
      className={`${className} cursor-grab active:cursor-grabbing border-2 border-dashed border-[#F47216] rounded-xl relative`}
    >
      <span className="absolute top-1 left-1 bg-[#F47216] text-white text-xs px-1 rounded z-10 select-none">⠿</span>
      {children}
    </div>
  );
}

// ── Editable text
export function EditableText({
  value, onChange, className = "", tag = "span"
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  tag?: "span" | "h1" | "h2" | "h3" | "p";
}) {
  const { editMode } = useEditLayout();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editMode) {
    const Tag = tag as any;
    return <Tag className={className}>{value}</Tag>;
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { onChange(draft); setEditing(false); }}
        onKeyDown={e => { if (e.key === "Enter") { onChange(draft); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
        className="border-2 border-[#F47216] rounded px-2 py-1 text-sm outline-none bg-white text-gray-800 min-w-[80px]"
      />
    );
  }

  const Tag = tag as any;
  return (
    <Tag
      className={`${className} cursor-pointer underline decoration-dashed decoration-[#F47216] hover:bg-[#F47216]/10 rounded px-1`}
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
    >
      {value} ✏️
    </Tag>
  );
}

// ── Main EditLayout wrapper
export default function EditLayout({
  children,
  onSave,
  saving = false,
}: {
  children: ReactNode;
  onSave?: () => Promise<void>;
  saving?: boolean;
}) {
  const { customer } = useAuth();
  const adminUser = isAdmin(customer?.email);
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState("");
  const [cookieAdmin, setCookieAdmin] = useState(false);
  const fpRef = useRef<DeviceFingerprint | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    getDeviceFingerprint().then(fp => { fpRef.current = fp; }).catch(() => {});
  }, []);

  // Check admin from cookie immediately on mount — don't wait for Medusa API
  useEffect(() => {
    try {
      // Read cached email from localStorage set during login
      const cachedEmail = localStorage.getItem('dr_customer_email');
      if (isAdmin(cachedEmail)) setCookieAdmin(true);
    } catch {}
  }, []);

  // Cache email in localStorage when customer loads
  useEffect(() => {
    if (customer?.email) {
      try { localStorage.setItem('dr_customer_email', customer.email); } catch {}
      if (isAdmin(customer.email)) setCookieAdmin(true);
    }
  }, [customer?.email]);

  const showAdmin = adminUser || cookieAdmin;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleSave() {
    if (onSave) {
      await onSave();
      showToast("✅ Saved & applied!");
      setEditMode(false);
    }
  }

  function handleEditToggle() {
    // Always toggle inline edit mode — banners and layout editing
    const newState = !editMode ? 'enabled' : 'disabled';
    setEditMode(!editMode);
    try {
      const body: any = {
        action_type: 'EDIT_MODE_TOGGLE',
        action_details: { newState },
        email: customer?.email,
      };
      if (fpRef.current) {
        body.client_device = {
          fingerprint: fpRef.current.fingerprint,
          screen: fpRef.current.screen,
          colorDepth: fpRef.current.colorDepth,
          timezone: fpRef.current.timezone,
          language: fpRef.current.language,
          platform: fpRef.current.platform,
          cores: fpRef.current.cores,
          memory: fpRef.current.memory,
          touchSupport: fpRef.current.touchSupport,
          deviceBrand: fpRef.current.deviceBrand,
          deviceModel: fpRef.current.deviceModel,
        };
      }
      fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {});
    } catch {}
  }

  return (
    <EditLayoutContext.Provider value={{ editMode, isAdminUser: adminUser || cookieAdmin }}>
      {toast && (
        <div className="fixed top-20 right-4 bg-[#00A650] text-white px-6 py-3 rounded-xl shadow-xl z-[200] font-semibold">
          {toast}
        </div>
      )}

      {showAdmin && (
        <div className="fixed bottom-4 right-4 z-[150] flex flex-col gap-2 items-end">
          {editMode ? (
            <>
              {onSave && (
                <button onClick={handleSave} disabled={saving}
                  className="bg-[#F47216] text-white px-5 py-2 rounded-xl font-bold shadow-xl hover:bg-white hover:text-[#F47216] border-2 border-[#F47216] transition-all disabled:opacity-60">
                  {saving ? "Saving..." : "💾 Save & Apply"}
                </button>
              )}
              <button onClick={handleEditToggle}
                className="bg-white text-[#00A650] px-5 py-2 rounded-xl font-bold shadow-xl border-2 border-[#00A650] transition-all">
                ✅ Done Editing
              </button>
            </>
          ) : (
            <>
              {/* Edit Services — independent on every page */}
              <button onClick={() => router.push("/edit-services")}
                className="bg-[#F47216] text-white px-5 py-2 rounded-xl font-bold shadow-xl border-2 border-[#F47216] hover:bg-white hover:text-[#F47216] transition-all text-sm">
                🛠️ Edit Services
              </button>
              {/* Edit Layout (banners) — independent on every page */}
              <button onClick={handleEditToggle}
                className="bg-[#00A650] text-white px-5 py-2 rounded-xl font-bold shadow-xl border-2 border-[#00A650] hover:bg-white hover:text-[#00A650] transition-all">
                🖼️ Edit Banners
              </button>
            </>
          )}
          <span className="text-white/60 text-xs text-right">Admin Mode</span>
        </div>
      )}

      {children}
    </EditLayoutContext.Provider>
  );
}
