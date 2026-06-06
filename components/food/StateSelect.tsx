"use client";

export type StateSelectProps = {
  states: readonly string[];
  value: string | null;
  onChange: (v: string | null) => void;
  id?: string;
  label?: string;
};

export default function StateSelect({
  states,
  value,
  onChange,
  id = "food-state-select",
  label = "State",
}: StateSelectProps) {
  return (
    <div className="flex flex-col gap-1 min-w-[10rem]" data-testid="state-select">
      <label htmlFor={id} className="text-[11px] font-bold text-white/90">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className="rounded-xl px-3 py-2 text-sm bg-white text-gray-800 outline-none border-2 border-transparent focus-visible:ring-2 ring-[#00A650]"
      >
        <option value="">Any state</option>
        {states.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
