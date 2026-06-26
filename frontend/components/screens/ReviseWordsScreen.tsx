"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { formatWordList } from "@/lib/format";
import { Icon } from "@/components/icons";
import { Skeleton } from "@/components/ui";
import {
  ApiError,
  getLearnedWords,
  startReviseSession,
  type LearnedWordsSort,
  type LearnedWord,
} from "@/lib/api";
import {
  clearQuizSessionId,
  getAccessToken,
  saveQuizSessionId,
} from "@/lib/session";

type ReviseWordsType = "due" | "weak" | "recent";

const copy = {
  due: {
    title: "Due Today",
    badge: "Spaced repetition",
    divider: "Ready to revise",
    empty: "No due words right now.",
    emptyBody: "Your schedule is clear. Recent learned words are still available.",
    cta: "Start Due Revision",
  },
  weak: {
    title: "Weak Words",
    badge: "Needs practice",
    divider: "Highest priority",
    empty: "No weak words right now.",
    emptyBody: "Mistakes and low-strength words will appear here.",
    cta: "Strengthen These Words",
  },
  recent: {
    title: "Recent",
    badge: "History",
    divider: "Newest learned",
    empty: "No learned words yet.",
    emptyBody: "Words appear here after you learn them.",
    cta: null,
  },
} as const;

const sortOptions: { value: LearnedWordsSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "az", label: "A-Z" },
  { value: "za", label: "Z-A" },
  { value: "strength_high", label: "Strongest" },
  { value: "strength_low", label: "Weakest" },
  { value: "mistakes_high", label: "Mistakes" },
  { value: "last_seen", label: "Last Seen" },
];

const RECENT_BATCH_SIZE = 30;

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function dateTime(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

function matchesSearch(word: LearnedWord, search: string) {
  const normalizedSearch = normalizeText(search);
  if (!normalizedSearch) return true;

  const values = [
    word.english,
    word.status,
    ...word.bangla,
    ...word.pos,
  ];

  return values.some((value) => normalizeText(value).includes(normalizedSearch));
}

function sortWords(words: LearnedWord[], sort: LearnedWordsSort) {
  return [...words].sort((left, right) => {
    if (sort === "oldest") {
      return dateTime(left.learnedAt) - dateTime(right.learnedAt);
    }
    if (sort === "az" || sort === "za") {
      const direction = sort === "az" ? 1 : -1;
      return (
        direction *
        normalizeText(left.english).localeCompare(normalizeText(right.english))
      );
    }
    if (sort === "strength_high") {
      return right.strength - left.strength;
    }
    if (sort === "strength_low") {
      return left.strength - right.strength;
    }
    if (sort === "mistakes_high") {
      return right.mistakes - left.mistakes;
    }
    if (sort === "last_seen") {
      return dateTime(right.lastSeenAt) - dateTime(left.lastSeenAt);
    }

    return dateTime(right.learnedAt) - dateTime(left.learnedAt);
  });
}

function getVisibleRecentWords(
  words: LearnedWord[],
  search: string,
  sort: LearnedWordsSort,
) {
  return sortWords(
    words.filter((word) => matchesSearch(word, search)),
    sort,
  );
}

export function ReviseWordsScreen({ type }: { type: ReviseWordsType }) {
  const router = useRouter();
  const [words, setWords] = useState<LearnedWord[]>([]);
  const [allRecentWords, setAllRecentWords] = useState<LearnedWord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [starting, setStarting] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<LearnedWordsSort>("newest");
  const loadingMoreRef = useRef(false);
  const details = copy[type];
  const canSearchAndSort = type === "recent";
  const hasSearch = search.trim().length > 0;

  const loadWords = useCallback(async (nextPage: number) => {
    if (canSearchAndSort) return;
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
      const response = await getLearnedWords(token, nextPage, 20, type);
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
        setError("Unable to load revise words right now.");
      }
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [canSearchAndSort, router, type]);

  const loadRecentWords = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setWords([]);
    setAllRecentWords([]);
    setPage(1);
    setTotal(0);
    setHasMore(false);

    try {
      let nextPage = 1;
      let hasNextPage = true;
      let totalCount = 0;
      const collected: LearnedWord[] = [];

      while (hasNextPage) {
        const response = await getLearnedWords(
          token,
          nextPage,
          RECENT_BATCH_SIZE,
          "recent",
        );

        collected.push(...response.items);
        totalCount = response.total;
        hasNextPage = response.hasMore;
        nextPage += 1;

        setAllRecentWords([...collected]);
        setTotal(totalCount);
      }

      setPage(Math.max(1, nextPage - 1));
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to load learned words right now.");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!canSearchAndSort) {
      void loadWords(1);
      return;
    }

    void loadRecentWords();
  }, [canSearchAndSort, loadRecentWords, loadWords]);

  useEffect(() => {
    if (!canSearchAndSort) {
      return;
    }

    setWords(getVisibleRecentWords(allRecentWords, search, sort));
  }, [allRecentWords, canSearchAndSort, search, sort]);

  async function startRevision() {
    if (type === "recent" || starting) return;

    const token = getAccessToken();
    if (!token) {
      router.push("/typing");
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const response = await startReviseSession(token, {
        type,
        mode: "mixed",
      });
      saveQuizSessionId(response.session.id);
      router.push("/typing");
    } catch (exception) {
      clearQuizSessionId();
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to start revision right now.");
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <AppShell
      active="revise"
      title={details.title}
      headerAction={
        <button
          type="button"
          onClick={() => router.push("/revise")}
          className="icon-button"
          aria-label="Back to Revise">
          <Icon name="back" className="text-sm" />
        </button>
      }>
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                {details.title}
              </h2>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                  {details.badge}
                </span>
                <p className="text-sm font-medium text-slate-500">
                  {loading
                    ? "Loading..."
                    : canSearchAndSort && hasSearch
                      ? `${words.length} of ${total} Words`
                      : `${total} Words`}
                </p>
              </div>
            </div>

            {details.cta ? (
              <button
                type="button"
                onClick={() => void startRevision()}
                disabled={starting || loading || total === 0}
                className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-60">
                {starting ? "Starting..." : details.cta}
                <Icon name="arrowRight" className="text-xs" />
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm font-medium text-red-500">{error}</p>
          ) : null}

          {canSearchAndSort ? (
            <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Find a learned word
                </span>
                {hasSearch ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-200">
                    <Icon name="close" className="text-[10px]" />
                    Clear
                  </button>
                ) : null}
              </div>
              <label className="mt-2 block">
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="search" className="text-sm" />
                  </span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="English, Bangla, POS, or status"
                    className="brand-input w-full rounded-2xl border-2 border-(--brand-border) bg-white py-3.5 pl-10 pr-10 text-sm font-semibold text-slate-900 placeholder:text-slate-300"
                  />
                </div>
              </label>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSort(option.value)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                      sort === option.value
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <p className="text-[12px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
              {details.divider}
            </p>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="learn-word-card rounded-[20px] border bg-white p-5">
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
          <div className="grid gap-4 md:grid-cols-2">
            {words.map((word) => (
              <Link
                key={word.wordId}
                href={`/words/${word.wordId}`}
                className="learn-word-card rounded-[20px] border bg-white p-5 transition">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="min-w-0 flex-1 break-words text-2xl font-black tracking-tight text-slate-900">
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
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">
                      Mistakes {word.mistakes}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] border border-slate-200 bg-white p-6 text-center shadow-soft">
            <p className="text-base font-extrabold text-slate-900">
              {hasSearch ? "No words match your search." : details.empty}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {hasSearch
                ? "Try another spelling, Bangla meaning, POS, or status."
                : details.emptyBody}
            </p>
            {hasSearch ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-bold text-white">
                Clear Search
              </button>
            ) : null}
          </div>
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
