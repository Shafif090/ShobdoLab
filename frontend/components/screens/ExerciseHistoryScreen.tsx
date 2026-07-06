"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { EmptyState, Skeleton } from "@/components/ui";
import {
  ApiError,
  getExerciseHistory,
  type ExerciseHistoryItem,
} from "@/lib/api";
import { getAccessToken } from "@/lib/session";

function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.max(1, seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function modeLabel(mode: string) {
  return mode === "mcq" ? "MCQ" : mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function ExerciseHistoryScreen() {
  const [items, setItems] = useState<ExerciseHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const loadHistory = useCallback(async (nextPage: number) => {
    if (nextPage > 1 && loadingMoreRef.current) return;

    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      setError("Please sign in to view exercise history.");
      return;
    }

    if (nextPage === 1) {
      setLoading(true);
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    setError(null);

    try {
      const response = await getExerciseHistory(token, nextPage);
      setItems((current) =>
        nextPage === 1 ? response.items : [...current, ...response.items],
      );
      setPage(response.page);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to load exercise history right now.");
      }
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory(1);
  }, [loadHistory]);

  return (
    <AppShell
      active="exercise"
      title="Exercise History"
      headerAction={
        <Link href="/exercise" className="icon-button" aria-label="Back to Exercise">
          <Icon name="back" className="text-sm" />
        </Link>
      }>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 sm:gap-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              History
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {loading ? "Loading..." : `${total} completed sessions`}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Exercise
          </span>
        </div>

        {error ? (
          <p className="text-sm font-semibold text-red-500">{error}</p>
        ) : null}

        {loading ? (
          <div className="flex flex-col gap-3 sm:gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[20px] border bg-white p-4 shadow-soft sm:p-5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <Skeleton className="h-14 rounded-2xl" />
                  <Skeleton className="h-14 rounded-2xl" />
                  <Skeleton className="h-14 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="flex flex-col gap-3 sm:gap-4">
            {items.map((item) => (
              <Link
                key={item.sessionId}
                href={`/results?sessionId=${item.sessionId}`}
                className="rounded-[20px] border bg-white p-4 shadow-soft transition hover:-translate-y-0.5 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold text-slate-900">
                        {modeLabel(item.mode)} Practice
                      </h3>
                      {item.retryNo > 0 ? (
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700">
                          Retry {item.retryNo}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {formatDate(item.startedAt)}
                    </p>
                  </div>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[rgba(142,155,250,0.14)] text-lg font-black text-[var(--brand-blue)]">
                    {item.scorePercent}%
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-emerald-50 p-3">
                    <p className="text-lg font-black text-slate-900">
                      {item.correctItems}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Correct
                    </p>
                  </div>
                  <div className="rounded-2xl bg-red-50 p-3">
                    <p className="text-lg font-black text-slate-900">
                      {item.incorrectItems}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Missed
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-lg font-black text-slate-900">
                      {formatDuration(item.durationSec)}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      Time
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.missedWords.length > 0 ? (
                    item.missedWords.map((word) => (
                      <span
                        key={`${item.sessionId}-${word.wordId}`}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {word.word}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      No missed words
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="exercise"
            title="No exercise history yet."
            body="Completed exercise sessions will appear here."
          />
        )}

        {hasMore ? (
          <button
            type="button"
            onClick={() => void loadHistory(page + 1)}
            disabled={loadingMore}
            className="mx-auto flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white disabled:opacity-70">
            {loadingMore ? "Loading..." : "Load More"}
            <Icon name="arrowRight" className="text-xs" />
          </button>
        ) : null}
      </div>
    </AppShell>
  );
}
