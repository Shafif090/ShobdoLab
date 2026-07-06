"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { formatWordList } from "@/lib/format";
import { Icon } from "@/components/icons";
import { Skeleton } from "@/components/ui";
import {
  addWord,
  ApiError,
  searchWords,
  type DictionarySort,
  type DictionaryWord,
} from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const sortOptions: { value: DictionarySort; label: string }[] = [
  { value: "az", label: "A-Z" },
  { value: "za", label: "Z-A" },
];

export function DictionaryScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<DictionarySort>("az");
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyWordId, setBusyWordId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  const loadWords = useCallback(
    async (nextPage: number, nextQuery = query, nextSort = sort) => {
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
        const response = await searchWords(token, nextQuery, nextPage, 20, nextSort);
        setWords((current) =>
          nextPage === 1 ? response.items : [...current, ...response.items],
        );
        setPage(response.page);
        setTotal(response.total);
        setHasMore(response.hasMore);
      } catch (exception) {
        setError(
          exception instanceof ApiError
            ? exception.message
            : "Unable to search the dictionary right now.",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [query, router, sort],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadWords(1, query, sort);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [loadWords, query, sort]);

  async function addSelectedWord(wordId: string) {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setBusyWordId(wordId);
    setError(null);

    try {
      const response = await addWord(token, wordId);
      setWords((current) =>
        current.map((word) =>
          word.wordId === wordId ? { ...response.item, wordId: String(response.item.wordId) } : word,
        ),
      );
    } catch (exception) {
      setError(
        exception instanceof ApiError
          ? exception.message
          : "Unable to add this word right now.",
      );
    } finally {
      setBusyWordId(null);
    }
  }

  return (
    <AppShell active="dictionary" title="Dictionary">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                Dictionary
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Search all available words and add the useful ones to your
                list.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {loading ? "Searching..." : `${total} words`}
            </span>
          </div>

          <label className="mt-5 block">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Search
            </span>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon name="search" className="text-sm" />
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by English or Bangla"
                className="brand-input w-full rounded-2xl border-2 border-(--brand-border) bg-white py-4 pl-10 pr-4 text-sm font-semibold text-slate-900 placeholder:text-slate-300"
              />
            </div>
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            {sortOptions.map((option) => {
              const active = sort === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSort(option.value)}
                  className={`rounded-full px-3 py-2 text-xs font-black transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        {error ? (
          <p className="text-sm font-semibold text-red-500">{error}</p>
        ) : null}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-48 rounded-3xl" />
            ))}
          </div>
        ) : words.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {words.map((word) => (
              <article
                key={word.wordId}
                className="learn-word-card rounded-[20px] border bg-white p-5 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-2xl font-black tracking-tight text-slate-900">
                      {word.english}
                    </h3>
                    <p className="mt-2 break-words text-lg font-bold text-teal-700">
                      {formatWordList(word.bangla)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    {formatWordList(word.pos) || "Word"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      word.learned
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                    {word.learned
                      ? `${word.progress?.status ?? "Learning"} · Strength ${word.progress?.strength ?? 0}/5`
                      : "Not added"}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void addSelectedWord(word.wordId)}
                    disabled={word.learned || busyWordId === word.wordId}
                    className="rounded-2xl bg-[var(--brand-green)] px-3 py-2.5 text-xs font-black text-slate-900 disabled:opacity-55">
                    {word.learned ? "Added" : "Add"}
                  </button>
                  <Link
                    href={`/words/${word.wordId}`}
                    className="rounded-2xl border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-700">
                    Details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-soft">
            <p className="font-extrabold text-slate-900">No words found.</p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Try a different English or Bangla word.
            </p>
          </div>
        )}

        {hasMore ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void loadWords(page + 1, query, sort)}
              disabled={loadingMore}
              className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white disabled:opacity-70">
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
