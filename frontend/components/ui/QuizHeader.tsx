import Link from "next/link";
import { Icon } from "@/components/icons";

export function QuizHeader({
  progress,
  index,
  total,
}: {
  progress: number;
  index: number;
  total: number;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-(--brand-border) bg-white/85 px-4 pb-4 pt-12 backdrop-blur md:px-0 md:pt-6">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-0 md:px-6">
        <Link href="/exercise" className="icon-button shrink-0">
          <Icon name="close" className="text-sm" />
        </Link>
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-(--brand-blue) transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="shrink-0 text-sm font-bold text-slate-400">
          {index}/{total}
        </span>
      </div>
    </header>
  );
}
