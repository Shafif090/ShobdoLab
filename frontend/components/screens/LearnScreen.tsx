"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { formatWordList, learnWords } from "@/components/data";
import { Skeleton } from "@/components/ui";
import {
  ApiError,
  createNextSet,
  getCurrentSet,
  type LearningSetResponse,
} from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export function LearnScreen() {
  const [currentSet, setCurrentSet] = useState<
    LearningSetResponse["set"] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextLoading, setNextLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCurrentSet() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await getCurrentSet(token);
        if (!active) return;

        setCurrentSet(response.set);
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError) {
          setError(exception.message);
          return;
        }

        setError("Unable to load your live learning set.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCurrentSet();

    return () => {
      active = false;
    };
  }, []);

  const liveWords =
    currentSet?.items.flatMap((item) =>
      item.word
        ? [
            {
              english: item.word.english,
              bangla: item.word.bangla,
              pos: item.word.pos,
            },
          ]
        : [],
    ) ?? learnWords;

  async function handleNextSet() {
    if (nextLoading) return;

    const token = getAccessToken();
    if (!token) {
      setError("Please sign in to load your next learning set.");
      return;
    }

    setNextLoading(true);
    setError(null);

    try {
      const response = await createNextSet(token);
      setCurrentSet(response.set);
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to load your next set right now.");
      }
    } finally {
      setNextLoading(false);
    }
  }

  return (
    <AppShell
      active="learn"
      title="Learn"
      headerAction={
        <button className="icon-button">
          <Icon name="ellipsis" className="text-sm" />
        </button>
      }>
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex flex-col gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">
              Learn
            </h2>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{
                  backgroundColor: "rgba(142,155,250,0.10)",
                  color: "var(--brand-blue)",
                }}>
                Vocabulary
              </span>
              <p className="text-sm font-medium text-slate-500">
                {loading
                  ? "Loading..."
                  : currentSet
                    ? `${currentSet.total_words} Words`
                    : "10 Words"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleNextSet()}
            disabled={nextLoading}
            className="group relative flex items-center justify-between overflow-hidden rounded-3xl p-5 text-white shadow-[0_8px_30px_rgba(142,155,250,0.3)] transition hover:-translate-y-1"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--brand-blue), #B2B9FA)",
            }}>
            <div className="absolute -bottom-6 -right-6 opacity-20 transition group-hover:rotate-6">
              <Icon name="star" className="text-7xl" />
            </div>
            <div className="relative z-10 flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-white/80">
                Ready for more?
              </span>
              <span className="text-lg font-extrabold">
                {nextLoading ? "Loading..." : "Next Set"}
              </span>
            </div>
            <span
              className="relative z-10 flex h-11 w-20 items-center justify-center rounded-[20px] bg-white shadow-md transition hover:scale-105"
              style={{ color: "var(--brand-blue)" }}>
              <Icon name="arrowRight" className="text-sm" />
            </span>
          </button>

          {error ? (
            <p className="text-sm font-medium text-red-500">{error}</p>
          ) : null}

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <p className="text-[12px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
              Current Words
            </p>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="learn-word-card rounded-[20px] border bg-white p-5">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-5 w-14 rounded-md" />
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <Skeleton className="h-6 w-40" />
                  </div>
                </div>
              ))
            : liveWords.map((word) => (
            <div
              key={word.english}
              className="learn-word-card rounded-[20px] border bg-white p-5 transition">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-2xl font-black tracking-tight text-slate-900">
                  {word.english}
                </h3>
                <span className="mt-1 shrink-0 rounded-md border border-sky-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {formatWordList(word.pos)}
                </span>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-lg font-bold text-teal-700">
                  {formatWordList(word.bangla)}
                </p>
              </div>
            </div>
              ))}
        </div>
      </div>
    </AppShell>
  );
}
