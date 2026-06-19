import type { ReactNode } from "react";
import { Icon } from "@/components/icons";

export function BrandInput({
  label,
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
  trailing,
}: {
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  trailing?: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon name={icon} className="text-sm" />
        </span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="brand-input w-full rounded-2xl border-2 border-(--brand-border) bg-white py-4 pl-10 pr-12 text-sm font-semibold text-slate-900 placeholder:text-slate-300"
        />
        {trailing ? (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            {trailing}
          </span>
        ) : null}
      </div>
    </label>
  );
}
