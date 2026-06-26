"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { formatWordList } from "@/lib/format";
import { Icon } from "@/components/icons";
import { Skeleton } from "@/components/ui";
import { ApiError, getWordDetail, type WordDetailResponse } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMode(value: string | null) {
  if (!value) return "Practice";
  return value === "mcq"
    ? "MCQ"
    : value.charAt(0).toUpperCase() + value.slice(1);
}

export function WordDetailScreen() {
  const params = useParams<{ wordId: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<WordDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      const token = getAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await getWordDetail(token, params.wordId);
        if (!active) return;

        setDetail(response);
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError) {
          setError(exception.message);
        } else {
          setError("Unable to load this word right now.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      active = false;
    };
  }, [params.wordId, router]);

  const progress = detail?.progress;
  const stats = detail?.stats;

  return (
    <AppShell
      active="learn"
      title="Word Detail"
      headerAction={
        <button
          type="button"
          onClick={() => router.back()}
          className="icon-button"
          aria-label="Back">
          <Icon name="back" className="text-sm" />
        </button>
      }>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {error ? (
          <p className="text-sm font-semibold text-red-500">{error}</p>
        ) : null}

        <section className="rounded-[20px] border bg-white p-6 shadow-soft">
          {loading ? (
            <div>
              <Skeleton className="h-10 w-48" />
              <Skeleton className="mt-3 h-6 w-64" />
              <div className="mt-5 flex gap-2">
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
            </div>
          ) : detail ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="break-words text-4xl font-black tracking-tight text-slate-900">
                    {detail.word.english}
                  </h2>
                  <p className="mt-2 text-2xl font-extrabold text-teal-700">
                    {formatWordList(detail.word.bangla)}
                  </p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  {formatWordList(detail.word.pos) || "Word"}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  {progress?.status ?? "Not learned"}
                </span>
              </div>
            </>
          ) : null}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-[20px]" />
            ))
          ) : (
            <>
              <div className="rounded-[20px] border bg-white p-4 shadow-sm">
                <p className="text-2xl font-black text-slate-900">
                  {progress?.strength ?? 0}/5
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Strength
                </p>
              </div>
              <div className="rounded-[20px] border bg-white p-4 shadow-sm">
                <p className="text-2xl font-black text-slate-900">
                  {stats?.accuracy ?? 0}%
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Accuracy
                </p>
              </div>
              <div className="rounded-[20px] border bg-white p-4 shadow-sm">
                <p className="text-2xl font-black text-slate-900">
                  {progress?.mistakes ?? 0}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Mistakes
                </p>
              </div>
              <div className="rounded-[20px] border bg-white p-4 shadow-sm">
                <p className="text-2xl font-black text-slate-900">
                  {progress?.seenCount ?? stats?.totalAttempts ?? 0}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Seen
                </p>
              </div>
            </>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[20px] border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-700">
              Review Timing
            </h3>
            <div className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
              <p>
                Learned:{" "}
                <span className="font-extrabold text-slate-900">
                  {formatDate(progress?.learnedAt)}
                </span>
              </p>
              <p>
                Last seen:{" "}
                <span className="font-extrabold text-slate-900">
                  {formatDate(progress?.lastSeenAt)}
                </span>
              </p>
              <p>
                Next review:{" "}
                <span className="font-extrabold text-slate-900">
                  {formatDate(progress?.nextReviewAt)}
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-[20px] border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-700">
              Attempts
            </h3>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-lg font-black text-slate-900">
                  {stats?.totalAttempts ?? 0}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Total
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-lg font-black text-slate-900">
                  {stats?.correctAttempts ?? 0}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Correct
                </p>
              </div>
              <div className="rounded-2xl bg-red-50 p-3">
                <p className="text-lg font-black text-slate-900">
                  {stats?.incorrectAttempts ?? 0}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Missed
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-700">
            Recent Attempts
          </h3>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-[20px]" />
            ))
          ) : detail?.recentAttempts.length ? (
            detail.recentAttempts.map((attempt) => (
              <article
                key={attempt.id}
                className="rounded-[20px] border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-extrabold text-slate-900">
                        {formatMode(attempt.mode)}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        {attempt.source ?? "practice"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {formatDate(attempt.submittedAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      attempt.isCorrect
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-600"
                    }`}>
                    {attempt.isCorrect ? "Correct" : "Missed"}
                  </span>
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="break-words text-sm font-bold text-slate-900">
                    Your answer: {attempt.yourAnswer || "No answer"}
                  </p>
                  <p className="mt-1 break-words text-sm font-bold text-teal-700">
                    Correct: {attempt.correctAnswer || "No accepted answer"}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[20px] border bg-white p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                No attempts recorded for this word yet.
              </p>
            </div>
          )}
        </section>

        <Link
          href="/revise/recent"
          className="mx-auto rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">
          <p className="text-white">Back to Learned Words</p>
        </Link>
      </div>
    </AppShell>
  );
}
