"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { formatWordList } from "@/lib/format";
import { Icon } from "@/components/icons";
import { EmptyState, Skeleton } from "@/components/ui";
import {
  ApiError,
  getLearnedWords,
  type LearnedWord,
} from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export function LearnedWordsScreen() {
  const router = useRouter();
  const [words, setWords] = useState<LearnedWord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const loadWords = useCallback(async (nextPage: number) => {
    if (nextPage > 1 && loadingMoreRef.current) return;

    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
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
      const response = await getLearnedWords(token, nextPage);
      setWords((current) =>
        nextPage === 1 ? response.items : [...current, ...response.items],
      );
      setPage(response.page);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to load learned words right now.");
      }
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [router]);

  useEffect(() => {
    void loadWords(1);
  }, [loadWords]);

  return (
    <AppShell
      active="revise"
      title="Learned Words"
      headerAction={
        <button
          type="button"
          onClick={() => router.push("/revise")}
          className="icon-button"
          aria-label="Back to Revise">
          <Icon name="back" className="text-sm" />
        </button>
      }>
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5 flex flex-col gap-4 sm:mb-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Recent
            </h2>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{
                  backgroundColor: "rgba(161,232,175,0.18)",
                  color: "#047857",
                }}>
                History
              </span>
              <p className="text-sm font-medium text-slate-500">
                {loading ? "Loading..." : `${total} Words`}
              </p>
            </div>
          </div>

          {error ? (
            <p className="text-sm font-medium text-red-500">{error}</p>
          ) : null}

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <p className="text-[12px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
              Newest Learned
            </p>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="learn-word-card rounded-[20px] border bg-white p-4 sm:p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-5 w-14 rounded-md" />
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="mt-3 h-4 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : words.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {words.map((word) => (
              <Link
                key={word.wordId}
                href={`/words/${word.wordId}`}
                className="learn-word-card rounded-[20px] border bg-white p-4 transition sm:p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="min-w-0 flex-1 break-words text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
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
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      {word.status}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                      Strength {word.strength}/5
                    </span>
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
                      Seen {word.seenCount}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="book"
            title="No learned words yet."
            body="Words appear here after you learn them."
          />
        )}

        {hasMore ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => void loadWords(page + 1)}
              disabled={loadingMore}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-70">
              {loadingMore ? "Loading..." : "Load More"}
              <Icon name="arrowRight" className="text-xs" />
            </button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
