"use client";
/**
 * RegistrationForm
 *
 * First-time Rider registration. Shown when GET /store/delivery?action=my-driver
 * returns 204 (no Driver record linked to the authenticated customer).
 *
 * Fields:
 *  - name          1–100 characters
 *  - phone         exactly 10 numeric digits
 *  - vehicle_type  Bicycle | Motorcycle | Car | Van
 *  - vehicle_number 1–20 alphanumeric characters
 *
 * On valid submit: POST /store/delivery/driver/register
 *   - 200/201 → transition to dashboard
 *   - error   → toast + retain field values
 *
 * Requirements: 4.1, 4.2, 4.3, 4.6
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

const VEHICLE_TYPES: VehicleType[] = [
  "Bicycle",
  "Motorcycle",
  "Car",
  "Van",
];

interface FormValues {
  name: string;
  phone: string;
  vehicle_type: VehicleType;
  vehicle_number: string;
}

interface FieldErrors {
  name?: string;
  phone?: string;
  vehicle_type?: string;
  vehicle_number?: string;
}

interface Props {
  onRegistered: (driver: DriverRecord) => void;
}

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.name.trim()) {
    errors.name = "Name is required";
  } else if (values.name.trim().length > 100) {
    errors.name = "Name must be 100 characters or fewer";
  }

  if (!values.phone) {
    errors.phone = "Phone number is required";
  } else if (!/^\d{10}$/.test(values.phone)) {
    errors.phone = "Phone must be exactly 10 numeric digits";
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

export default function RegistrationForm({ onRegistered }: Props) {
  const [values, setValues] = useState<FormValues>({
    name: "",
    phone: "",
    vehicle_type: "Motorcycle",
    vehicle_number: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "error" | "success" } | null>(null);

  function showToast(msg: string, type: "error" | "success" = "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  function handleChange(
    field: keyof FormValues,
    value: string
  ) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
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
      showToast("Session expired. Please log in again.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${MEDUSA_URL}/store/delivery/driver/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-publishable-api-key": PUB_KEY,
        },
        body: JSON.stringify({
          name: values.name.trim(),
          phone: values.phone,
          vehicle_type: values.vehicle_type,
          vehicle_number: values.vehicle_number.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const driver: DriverRecord = data.driver ?? data;
        onRegistered(driver);
        return;
      }

      const errorData = await res.json().catch(() => ({}));
      const msg =
        (errorData as any).error ||
        (errorData as any).message ||
        `Registration failed (${res.status})`;

      // Surface field-level errors from server if present
      if ((errorData as any).field) {
        setErrors({ [(errorData as any).field]: msg });
      } else {
        showToast(msg, "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl shadow-xl z-50 text-sm font-semibold max-w-xs text-center ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-green-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div
        className="px-4 pt-8 pb-6 text-center"
        style={{ backgroundColor: "#F47216" }}
      >
        <div className="text-5xl mb-2">🛵</div>
        <h1 className="text-xl font-extrabold text-white">Become a Rider</h1>
        <p className="text-white/80 text-sm mt-1">
          Complete your profile to start delivering
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex-1 px-4 py-6 space-y-5"
      >
        {/* Name */}
        <div>
          <label
            htmlFor="reg-name"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="reg-name"
            type="text"
            value={values.name}
            onChange={(e) => handleChange("name", e.target.value)}
            maxLength={100}
            placeholder="e.g. Ravi Kumar"
            className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#F47216] ${
              errors.name ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
            }`}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "reg-name-error" : undefined}
          />
          {errors.name && (
            <p id="reg-name-error" className="text-red-500 text-xs mt-1">
              {errors.name}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="reg-phone"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Mobile Number <span className="text-red-500">*</span>
          </label>
          <input
            id="reg-phone"
            type="tel"
            value={values.phone}
            onChange={(e) =>
              handleChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="10-digit mobile number"
            inputMode="numeric"
            maxLength={10}
            className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#F47216] ${
              errors.phone ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"
            }`}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "reg-phone-error" : undefined}
          />
          {errors.phone && (
            <p id="reg-phone-error" className="text-red-500 text-xs mt-1">
              {errors.phone}
            </p>
          )}
        </div>

        {/* Vehicle Type */}
        <div>
          <label
            htmlFor="reg-vehicle-type"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Vehicle Type <span className="text-red-500">*</span>
          </label>
          <select
            id="reg-vehicle-type"
            value={values.vehicle_type}
            onChange={(e) =>
              handleChange("vehicle_type", e.target.value as VehicleType)
            }
            className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#F47216] bg-white ${
              errors.vehicle_type ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
            aria-invalid={!!errors.vehicle_type}
            aria-describedby={
              errors.vehicle_type ? "reg-vehicle-type-error" : undefined
            }
          >
            {VEHICLE_TYPES.map((vt) => (
              <option key={vt} value={vt}>
                {vt}
              </option>
            ))}
          </select>
          {errors.vehicle_type && (
            <p id="reg-vehicle-type-error" className="text-red-500 text-xs mt-1">
              {errors.vehicle_type}
            </p>
          )}
        </div>

        {/* Vehicle Registration */}
        <div>
          <label
            htmlFor="reg-vehicle-number"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Vehicle Registration Number <span className="text-red-500">*</span>
          </label>
          <input
            id="reg-vehicle-number"
            type="text"
            value={values.vehicle_number}
            onChange={(e) =>
              handleChange(
                "vehicle_number",
                e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20)
              )
            }
            placeholder="e.g. HR12AB1234"
            maxLength={20}
            className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#F47216] uppercase ${
              errors.vehicle_number
                ? "border-red-400 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
            aria-invalid={!!errors.vehicle_number}
            aria-describedby={
              errors.vehicle_number ? "reg-vehicle-number-error" : undefined
            }
          />
          {errors.vehicle_number && (
            <p
              id="reg-vehicle-number-error"
              className="text-red-500 text-xs mt-1"
            >
              {errors.vehicle_number}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-opacity disabled:opacity-60"
          style={{ backgroundColor: "#F47216" }}
        >
          {submitting ? "Registering…" : "Register as Rider"}
        </button>
      </form>
    </div>
  );
}
