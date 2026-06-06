"use client";
/**
 * ProfileEditForm
 *
 * Allows the Rider to update their name, vehicle type, and vehicle
 * registration number.
 *
 * Calls PUT /store/delivery/driver/register (profile update endpoint).
 * Shows a confirmation toast on success; on failure shows an error toast
 * and retains all entered values.
 *
 * Requirements: 4.4, 4.7
 */

import { useState, FormEvent } from "react";
import { getStoredToken } from "@/lib/authCookies";
import type { DriverRecord } from "../page";
import type { VehicleType } from "@/lib/types/platform";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_URL || "https://api.digitalrohtak.online";
const PUB_KEY =
  process.env.NEXT_PUBLIC_PUBLISHABLE_KEY ||
  "pk_43aa7dc425d977cdfa688fb7807f0fb38ddc398dac56b7f84341399918d666c8";

const VEHICLE_TYPES: VehicleType[] = ["Bicycle", "Motorcycle", "Car", "Van"];

interface Props {
  driver: DriverRecord;
  onUpdated: (updated: Partial<DriverRecord>) => void;
}

interface FormValues {
  name: string;
  vehicle_type: VehicleType;
  vehicle_number: string;
}

interface FieldErrors {
  name?: string;
  vehicle_type?: string;
  vehicle_number?: string;
}

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.name.trim()) {
    errors.name = "Name is required";
  } else if (values.name.trim().length > 100) {
    errors.name = "Name must be 100 characters or fewer";
  }

  if (!values.vehicle_type) {
    errors.vehicle_type = "Please select a vehicle type";
  }

  if (!values.vehicle_number.trim()) {
    errors.vehicle_number = "Vehicle registration is required";
  } else if (!/^[A-Za-z0-9]{1,20}$/.test(values.vehicle_number.trim())) {
    errors.vehicle_number =
      "Vehicle registration must be 1–20 alphanumeric characters";
  }

  return errors;
}

export default function ProfileEditForm({ driver, onUpdated }: Props) {
  const [values, setValues] = useState<FormValues>({
    name: driver.name,
    vehicle_type: driver.vehicle_type as VehicleType,
    vehicle_number: driver.vehicle_number,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  function handleChange(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const fieldErrors = validate(values);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const token = getStoredToken();
    if (!token) {
      showToast("Session expired. Please log in again.", "err");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(
        `${MEDUSA_URL}/store/delivery/driver/register`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-publishable-api-key": PUB_KEY,
          },
          body: JSON.stringify({
            name: values.name.trim(),
            vehicle_type: values.vehicle_type,
            vehicle_number: values.vehicle_number.trim(),
          }),
        }
      );

      if (res.ok) {
        onUpdated({
          name: values.name.trim(),
          vehicle_type: values.vehicle_type,
          vehicle_number: values.vehicle_number.trim(),
        });
        showToast("Profile updated successfully ✅", "ok");
        return;
      }

      const errorData = await res.json().catch(() => ({}));
      const msg =
        (errorData as any).error ||
        (errorData as any).message ||
        `Update failed (${res.status})`;

      if ((errorData as any).field) {
        setErrors({ [(errorData as any).field]: msg });
      } else {
        showToast(msg, "err");
      }
    } catch (err: any) {
      showToast(err.message || "Network error. Please try again.", "err");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-xl z-50 text-sm font-semibold max-w-xs text-center ${
            toast.type === "err" ? "bg-red-600 text-white" : "bg-green-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <h2 className="text-base font-extrabold text-gray-800">Edit Profile</h2>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Name */}
        <div>
          <label
            htmlFor="profile-name"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="profile-name"
            type="text"
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            maxLength={100}
            className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#F47216] ${
              errors.name ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
            }`}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "profile-name-error" : undefined}
          />
          {errors.name && (
            <p id="profile-name-error" className="text-red-500 text-xs mt-1">
              {errors.name}
            </p>
          )}
        </div>

        {/* Vehicle Type */}
        <div>
          <label
            htmlFor="profile-vehicle-type"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Vehicle Type <span className="text-red-500">*</span>
          </label>
          <select
            id="profile-vehicle-type"
            value={values.vehicle_type}
            onChange={(e) =>
              handleChange("vehicle_type", e.target.value as VehicleType)
            }
            className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#F47216] bg-white ${
              errors.vehicle_type ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
            aria-invalid={!!errors.vehicle_type}
          >
            {VEHICLE_TYPES.map((vt) => (
              <option key={vt} value={vt}>
                {vt}
              </option>
            ))}
          </select>
          {errors.vehicle_type && (
            <p className="text-red-500 text-xs mt-1">{errors.vehicle_type}</p>
          )}
        </div>

        {/* Vehicle Registration */}
        <div>
          <label
            htmlFor="profile-vehicle-number"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Vehicle Registration <span className="text-red-500">*</span>
          </label>
          <input
            id="profile-vehicle-number"
            type="text"
            value={values.vehicle_number}
            onChange={(e) =>
              handleChange(
                "vehicle_number",
                e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20)
              )
            }
            maxLength={20}
            className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#F47216] uppercase ${
              errors.vehicle_number
                ? "border-red-400 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
            aria-invalid={!!errors.vehicle_number}
            aria-describedby={
              errors.vehicle_number ? "profile-vehicle-number-error" : undefined
            }
          />
          {errors.vehicle_number && (
            <p
              id="profile-vehicle-number-error"
              className="text-red-500 text-xs mt-1"
            >
              {errors.vehicle_number}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-sm transition-opacity disabled:opacity-60"
          style={{ backgroundColor: "#F47216" }}
        >
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
