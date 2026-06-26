"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { stats } from "@/components/data";
import { Skeleton } from "@/components/ui";
import {
  ApiError,
  getReviseSummary,
  type ReviseSummaryResponse,
} from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export function ReviseScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<ReviseSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await getReviseSummary(token);
        if (!active) return;

        setSummary(response);
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError) {
          setError(exception.message);
          return;
        }

        setError("Unable to load your revision summary right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      type: "due",
      title: "Due Today",
      subtitle: "Spaced repetition",
      value: summary?.dueTodayCount ?? stats.dueToday,
      color: "orange",
      icon: "calendar",
      cta: "Revise Now",
    },
    {
      type: "weak",
      title: "Weak Words",
      subtitle: "Needs more practice",
      value: summary?.weakWordsCount ?? stats.weakWords,
      color: "blue",
      icon: "exercise",
      cta: "Strengthen",
    },
    {
      type: "recent",
      title: "Recent",
      subtitle: "All learned words",
      value: summary?.recentWordsCount ?? stats.recentWords,
      color: "green",
      icon: "clock",
      cta: "View Words",
    },
  ] as const;

  function openRevision(type: (typeof cards)[number]["type"]) {
    if (type === "recent") {
      router.push("/revise/recent");
      return;
    }

    router.push(`/revise/${type}`);
  }

  return (
    <AppShell active="revise" title="Revise">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="mb-2 flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-slate-900">
            Your Daily Revision
          </h2>
          <p className="text-sm text-slate-500">
            Keep your memory fresh. Focus on what matters.
          </p>
        </div>

        {error ? (
          <p className="text-sm font-medium text-red-500">{error}</p>
        ) : null}

        {cards.map((card) => {
          const colors = {
            orange: {
              wrapper:
                "border-[color:rgba(244,124,124,0.20)] bg-[color:rgba(244,124,124,0.10)]",
              bubble:
                "bg-[color:rgba(244,124,124,0.20)] text-[var(--brand-orange)]",
              badge:
                "text-[var(--brand-orange)] border-[color:rgba(244,124,124,0.10)]",
              button: "bg-[var(--brand-orange)] text-white",
            },
            blue: {
              wrapper:
                "border-[color:rgba(142,155,250,0.20)] bg-[color:rgba(142,155,250,0.10)]",
              bubble:
                "bg-[color:rgba(142,155,250,0.20)] text-[var(--brand-blue)]",
              badge:
                "text-[var(--brand-blue)] border-[color:rgba(142,155,250,0.10)]",
              button: "bg-[var(--brand-blue)] text-white",
            },
            green: {
              wrapper:
                "border-[color:rgba(161,232,175,0.20)] bg-[color:rgba(161,232,175,0.10)]",
              bubble: "bg-[color:rgba(161,232,175,0.20)] text-emerald-700",
              badge: "text-emerald-700 border-[color:rgba(161,232,175,0.10)]",
              button: "bg-[var(--brand-green)] text-slate-900",
            },
          }[card.color];

          return (
            <div
              key={card.title}
              className={`rounded-[20px] border-2 p-5 shadow-soft transition hover:-translate-y-0.5 ${colors.wrapper}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${colors.bubble}`}>
                    <Icon
                      name={card.icon as Parameters<typeof Icon>[0]["name"]}
                      className="text-xl"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {card.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-600">
                      {card.subtitle}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1 rounded-full border bg-white px-3 py-1 shadow-sm ${colors.badge}`}>
                  {loading ? (
                    <Skeleton className="h-4 w-16 rounded-full" />
                  ) : (
                    <>
                      <span className="text-sm font-bold">{card.value}</span>
                      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        Words
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => openRevision(card.type)}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition hover:-translate-y-0.5 active:translate-y-0 ${colors.button}`}>
                {card.cta}
                <Icon name="arrowRight" className="text-xs" />
              </button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
