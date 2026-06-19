"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { stats } from "@/components/data";
import { ActionCard, ArrowDivider, Skeleton } from "@/components/ui";
import {
  getCurrentSet,
  getHomeSummary,
  type HomeSummaryResponse,
} from "@/lib/api";
import { getAccessToken } from "@/lib/session";

type LiveSetSummary = {
  set_index: number;
  total_words: number;
  state: string;
};

export function HomeScreen() {
  const [liveSet, setLiveSet] = useState<LiveSetSummary | null>(null);
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
        const [summaryResponse, setResponse] = await Promise.all([
          getHomeSummary(token),
          getCurrentSet(token),
        ]);
        if (!active) return;

        setSummary(summaryResponse);
        setLiveSet({
          set_index: setResponse.set.set_index,
          total_words: setResponse.set.total_words,
          state: setResponse.set.state,
        });
      } catch {
        if (!active) return;
        setLiveSet(null);
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

  const streakDays = summary?.streakDays ?? stats.streakDays;
  const wordsLearned = summary?.wordsLearnedTotal ?? stats.wordsLearned;

  return (
    <AppShell active="home" title="Home">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Today&apos;s Progress
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4 rounded-2xl border border-(--brand-purple) bg-[rgba(233,213,255,0.3)] p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/60 bg-(--brand-purple) text-violet-700">
                <Icon name="fire" className="text-base" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="mb-2 h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{streakDays}</p>
                )}
                <p className="text-xs font-medium text-slate-600">Day Streak</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-(--brand-green) bg-[rgba(161,232,175,0.25)] p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/60 bg-(--brand-green) text-emerald-700">
                <Icon name="book" className="text-base" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="mb-2 h-8 w-12" />
                ) : (
                  <p className="text-2xl font-bold">{wordsLearned}</p>
                )}
                <p className="text-xs font-medium text-slate-600">
                  Words Learned
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="flex flex-col gap-3 rounded-3xl border border-[rgba(142,155,250,0.18)] bg-[rgba(142,155,250,0.08)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Skeleton className="mb-3 h-3 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-4/5" />
          </section>
        ) : liveSet ? (
          <section className="flex flex-col gap-3 rounded-3xl border border-[rgba(142,155,250,0.18)] bg-[rgba(142,155,250,0.08)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-blue)]">
                  Live set
                </p>
                <p className="mt-1 text-lg font-extrabold text-slate-900">
                  Set #{liveSet.set_index}
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                {liveSet.state}
              </div>
            </div>
            <p className="text-sm text-slate-600">
              The backend currently has {liveSet.total_words} words ready for
              this set.
            </p>
          </section>
        ) : null}

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
