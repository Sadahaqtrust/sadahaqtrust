"use client";

export type CuisineSelectProps = {
  cuisines: readonly string[];
  value: string | null;
  onChange: (v: string | null) => void;
  id?: string;
  label?: string;
};

export default function CuisineSelect({
  cuisines,
  value,
  onChange,
  id = "food-cuisine-select",
  label = "Cuisine",
}: CuisineSelectProps) {
  return (
    <div className="flex flex-col gap-1 min-w-[10rem]" data-testid="cuisine-select">
      <label htmlFor={id} className="text-[11px] font-bold text-white/90">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className="rounded-xl px-3 py-2 text-sm bg-white text-gray-800 outline-none border-2 border-transparent focus-visible:ring-2 ring-[#00A650]"
      >
        <option value="">All cuisines</option>
        {cuisines.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
