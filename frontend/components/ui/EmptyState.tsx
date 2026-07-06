import { type ReactNode } from "react";
import { Icon } from "@/components/icons";

type EmptyStateProps = {
  icon?: Parameters<typeof Icon>[0]["name"];
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  icon = "book",
  title,
  body,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-[20px] border border-dashed border-slate-200 bg-white/90 p-6 text-center shadow-soft ${className}`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon name={icon} className="text-base" />
      </div>
      <p className="mt-4 text-base font-extrabold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-slate-500">
        {body}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
