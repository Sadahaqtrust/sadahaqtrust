"use client";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AccountPage() {
  const { customer, loading, logout } = useAuth();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!loading && !customer) {
      router.push("/auth/login");
    }
  }, [customer, loading]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-white border-t-[#00A650] rounded-full animate-spin"></div>
    </div>
  );

  if (!customer) return null;

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[#F47216] flex items-center justify-center text-white text-3xl font-extrabold mb-3">
            {customer.first_name?.[0]?.toUpperCase() || "U"}
          </div>
          <h1 className="text-2xl font-extrabold text-[#F47216]">
            {customer.first_name} {customer.last_name}
          </h1>
          <p className="text-gray-500 text-sm">{customer.email}</p>
        </div>

        <div className="w-full h-px bg-gray-100 mb-6"></div>

        {/* Profile Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/auth/forgot-pin")}
            className="w-full bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all text-sm text-left px-4">
            🔑 Change PIN
          </button>

          {showConfirm ? (
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-red-600 text-sm font-semibold mb-3">Are you sure you want to sign out?</p>
              <div className="flex gap-2">
                <button onClick={handleLogout}
                  className="flex-1 bg-red-500 text-white py-2 rounded-xl font-bold text-sm hover:bg-red-600 transition-all">
                  Yes, Sign Out
                </button>
                <button onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-gray-200 text-gray-600 py-2 rounded-xl font-bold text-sm hover:bg-gray-300 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowConfirm(true)}
              className="w-full border-2 border-red-300 text-red-500 py-3 rounded-xl font-bold hover:bg-red-50 transition-all text-sm">
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
