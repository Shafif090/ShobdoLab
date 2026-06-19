import Link from "next/link";
import { Icon } from "@/components/icons";

export function ActionCard({
  href,
  color,
  title,
  subtitle,
  offset,
  compactRight,
}: {
  href: string;
  color: "orange" | "blue" | "green";
  title: string;
  subtitle: string;
  offset?: boolean;
  compactRight?: boolean;
}) {
  const classes = {
    orange: "bg-[var(--brand-orange)] text-white",
    blue: "bg-[var(--brand-blue)] text-white",
    green: "bg-[var(--brand-green)] text-slate-950",
  }[color];

  return (
    <Link
      href={href}
      className={`group block ${offset ? "pl-8" : compactRight ? "pr-8" : ""}`}>
      <div
        className={`border-2 border-black p-6 shadow-brutal transition group-hover:-translate-y-1 ${classes}`}
        style={{ borderRadius: 24 }}>
        <div className="flex items-start justify-between">
          <h3 className="text-2xl font-bold">{title}</h3>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Icon name="arrowRight" className="text-sm" />
          </div>
        </div>
        <p
          className={`mt-3 text-sm font-medium ${color === "green" ? "text-slate-900/85" : "text-white/90"}`}>
          {subtitle}
        </p>
      </div>
    </Link>
  );
}
