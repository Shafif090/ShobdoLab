"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Skeleton } from "@/components/ui";
import {
  ApiError,
  getAchievements,
  type AchievementsResponse,
} from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export function AchievementsScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<AchievementsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAchievements() {
      const token = getAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await getAchievements(token);
        if (!active) return;

        setSummary(response);
      } catch (exception) {
        if (!active) return;

        setError(
          exception instanceof ApiError
            ? exception.message
            : "Unable to load achievements right now.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAchievements();

    return () => {
      active = false;
    };
  }, [router]);

  const achievements = useMemo(
    () => summary?.achievements ?? [],
    [summary?.achievements],
  );
  const earnedCount = useMemo(
    () => achievements.filter((achievement) => achievement.earned).length,
    [achievements],
  );

  return (
    <AppShell
      active="home"
      title="Achievements"
      headerAction={
        <button
          type="button"
          onClick={() => router.push("/home")}
          className="icon-button"
          aria-label="Back to Home">
          <Icon name="back" className="text-sm" />
        </button>
      }>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <section className="rounded-3xl border border-[rgba(255,200,0,0.40)] bg-[rgba(255,200,0,0.12)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-yellow)] text-slate-950 shadow-brutal-sm">
                <Icon name="trophy" className="text-lg" />
              </div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                Achievements
              </h2>
              <p className="mt-2 max-w-xl text-sm font-medium text-slate-600">
                Badges unlock from real learning progress: streaks, word count,
                active days, high scores, and perfect quiz runs.
              </p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-soft">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-black text-slate-900">
                  {earnedCount}/{achievements.length}
                </p>
              )}
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Earned
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <p className="text-sm font-medium text-red-500">{error}</p>
        ) : null}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-3xl" />
            ))}
          </div>
        ) : achievements.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {achievements.map((achievement) => {
              const percent = Math.round(
                (achievement.progress / achievement.target) * 100,
              );

              return (
                <article
                  key={achievement.code}
                  className={`rounded-3xl border p-5 shadow-soft ${
                    achievement.earned
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-white"
                  }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        achievement.earned
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                      <Icon name={achievement.earned ? "trophy" : "star"} />
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                        achievement.earned
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                      {achievement.earned ? "Earned" : `${percent}%`}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-black text-slate-900">
                    {achievement.title}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    {achievement.description}
                  </p>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Progress</span>
                      <span>
                        {achievement.progress}/{achievement.target}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          achievement.earned
                            ? "bg-emerald-500"
                            : "bg-[var(--brand-yellow)]"
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-soft">
            <p className="font-extrabold text-slate-900">
              No achievements yet.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Start learning or finish a quiz to unlock your first badge.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
