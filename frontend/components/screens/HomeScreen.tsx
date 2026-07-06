"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { ActionCard, ArrowDivider, Skeleton } from "@/components/ui";
import { getHomeSummary, type HomeSummaryResponse } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

function ProgressStat({
  icon,
  value,
  label,
  loading,
  tone,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  value: number;
  label: string;
  loading: boolean;
  tone: "purple" | "green" | "blue" | "orange";
}) {
  const tones = {
    purple: {
      card: "border-(--brand-purple) bg-[rgba(233,213,255,0.3)]",
      icon: "bg-(--brand-purple) text-violet-700",
    },
    green: {
      card: "border-(--brand-green) bg-[rgba(161,232,175,0.25)]",
      icon: "bg-(--brand-green) text-emerald-700",
    },
    blue: {
      card: "border-[rgba(142,155,250,0.45)] bg-[rgba(142,155,250,0.14)]",
      icon: "bg-[var(--brand-blue)] text-white",
    },
    orange: {
      card: "border-[rgba(244,124,124,0.45)] bg-[rgba(244,124,124,0.12)]",
      icon: "bg-[var(--brand-orange)] text-white",
    },
  }[tone];

  return (
    <div
      className={`flex min-h-[86px] items-center gap-3 rounded-2xl border p-3.5 sm:gap-4 sm:p-4 ${tones.card}`}>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white/60 sm:h-11 sm:w-11 ${tones.icon}`}>
        <Icon name={icon} className="text-base" />
      </div>
      <div>
        {loading ? (
          <Skeleton className="mb-2 h-8 w-12" />
        ) : (
          <p className="text-xl font-bold sm:text-2xl">{value}</p>
        )}
        <p className="text-xs font-medium text-slate-600">{label}</p>
      </div>
    </div>
  );
}

export function HomeScreen() {
  const [summary, setSummary] = useState<HomeSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadHomeData() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const summaryResponse = await getHomeSummary(token);
        if (!active) return;

        setSummary(summaryResponse);
      } catch {
        if (!active) return;
        setSummary(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadHomeData();

    return () => {
      active = false;
    };
  }, []);

  const wordsLearned = summary?.wordsLearnedTotal ?? 0;
  const dueToday = summary?.dueTodayCount ?? summary?.dueTomorrowCount ?? 0;
  const streakDays = summary?.streakDays ?? 0;

  return (
    <AppShell active="home" title="Home">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 sm:gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Today&apos;s Progress
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <ProgressStat
              icon="fire"
              value={streakDays}
              label="Day Streak"
              loading={loading}
              tone="purple"
            />
            <ProgressStat
              icon="book"
              value={wordsLearned}
              label="Words Learned"
              loading={loading}
              tone="green"
            />
            <ProgressStat
              icon="calendar"
              value={dueToday}
              label="Due Today"
              loading={loading}
              tone="blue"
            />
            <ProgressStat
              icon="exercise"
              value={summary?.today.exercise ?? 0}
              label="Exercises Today"
              loading={loading}
              tone="orange"
            />
          </div>
        </section>

        <section className="relative flex flex-col gap-6">
          <ActionCard
            href="/learn"
            color="orange"
            title="Learn"
            subtitle="Discover new words"
          />
          <ArrowDivider right />
          <ActionCard
            href="/revise"
            color="blue"
            title="Revise"
            subtitle="Track your progress"
            offset
          />
          <ArrowDivider />
          <ActionCard
            href="/exercise"
            color="green"
            title="Exercise"
            subtitle="Unlock full potential"
            compactRight
          />
        </section>
      </div>
    </AppShell>
  );
}
