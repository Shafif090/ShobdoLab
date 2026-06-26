"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { result } from "@/components/data";
import { Skeleton } from "@/components/ui";
import {
  ApiError,
  getQuizResult,
  retryQuizSession,
  type QuizResultResponse,
} from "@/lib/api";
import {
  getAccessToken,
  loadQuizSessionId,
  saveQuizSessionId,
} from "@/lib/session";

export function ResultsScreen({
  requestedSessionId = null,
}: {
  requestedSessionId?: string | null;
}) {
  const [liveResult, setLiveResult] = useState<QuizResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadResult() {
      const token = getAccessToken();
      const sessionId = requestedSessionId || loadQuizSessionId();
      if (!token || !sessionId) {
        setLoading(false);
        return;
      }

      try {
        const response = await getQuizResult(token, sessionId);
        if (!active) return;

        setLiveResult(response);
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError) {
          setError(exception.message);
          return;
        }

        setError("Unable to load your latest result right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadResult();

    return () => {
      active = false;
    };
  }, [requestedSessionId]);

  const summary = liveResult?.summary;
  const score = summary ? Math.round(summary.accuracy * 100) : result.score;
  const correct = summary?.correctItems ?? result.correct;
  const incorrect = summary?.incorrectItems ?? result.incorrect;
  const duration = liveResult?.session.duration_ms
    ? `${Math.max(1, Math.round(liveResult.session.duration_ms / 1000))}s`
    : result.duration;
  const missedItems = liveResult?.breakdown?.length
    ? liveResult.breakdown.filter((item) => !item.isCorrect)
    : liveResult?.incorrectItems.map((item, index) => ({
        ...item,
        quizItemId: item.wordId,
        wordId: item.wordId,
        questionType: "review",
        sequenceNo: index + 1,
      }));
  const fallbackMissedItems =
    !loading && !liveResult
      ? [
          {
            quizItemId: "demo",
            wordId: "demo",
            word: result.missedWord,
            questionType: "review",
            sequenceNo: 1,
            yourAnswer: result.yourAnswer,
            correctAnswer: result.correctAnswer,
          },
        ]
      : [];
  const quickBreakdownItems = missedItems ?? fallbackMissedItems;

  async function handleRetry() {
    const token = getAccessToken();
    const sessionId = requestedSessionId || loadQuizSessionId();
    if (!token || !sessionId || !liveResult?.canRetry) {
      return;
    }

    try {
      const response = await retryQuizSession(token, sessionId);
      saveQuizSessionId(response.session.id);
      window.location.href = response.session.mode === "mcq" ? "/quiz" : "/typing";
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
        return;
      }

      setError("Unable to retry this quiz right now.");
    }
  }

  return (
    <AppShell
      active="exercise"
      title="Results"
      headerAction={
        <div className="flex items-center gap-3">
          <Link href="/exercise" className="icon-button">
            <Icon name="back" className="text-sm" />
          </Link>
          <button className="icon-button" type="button">
            <Icon name="share" className="text-sm" />
          </button>
        </div>
      }>
      <div className="relative mx-auto flex w-full max-w-xl flex-col gap-6">
        <div
          className="absolute right-8 top-4 h-6 w-6 rounded-full border-2 opacity-20"
          style={{ borderColor: "var(--brand-orange)" }}
        />
        <div
          className="absolute left-6 top-96 h-0 w-0 opacity-30"
          style={{
            borderLeftWidth: 8,
            borderRightWidth: 8,
            borderBottomWidth: 14,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: "var(--brand-yellow)",
          }}
        />
        <div
          className="absolute right-10 top-40 rotate-12 text-2xl opacity-20"
          style={{ color: "var(--brand-blue)" }}>
          <Icon name="star" />
        </div>

        <div className="mt-4 flex flex-col items-center justify-center">
          <h2
            className="text-center text-[2.5rem] font-black uppercase leading-none tracking-[-0.06em]"
            style={{ color: "var(--brand-orange)" }}>
            Quiz
            <br />
            Complete!
          </h2>
          <div className="relative mb-4 mt-8">
            <div
              className="absolute -inset-6 rotate-12 opacity-50"
              style={{
                backgroundColor: "rgba(255,200,0,0.30)",
                clipPath:
                  "polygon(50%_0%,61%_35%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_35%)",
              }}
            />
            <div
              className="wavy-blob relative z-10 flex h-40 w-40 flex-col items-center justify-center border-4 border-white shadow-[0_8px_30px_-4px_rgba(142,155,250,0.6)]"
              style={{ backgroundColor: "var(--brand-blue)" }}>
              {loading ? (
                <Skeleton className="h-14 w-24 bg-white/40" />
              ) : (
                <>
                  <span className="text-5xl font-black text-white">
                    {score}%
                  </span>
                  <span className="mt-1 text-sm font-bold uppercase tracking-[0.18em] text-white/90">
                    Score
                  </span>
                </>
              )}
            </div>
            <div
              className="absolute -bottom-2 -right-4 z-20 flex items-center gap-1.5 rounded-full border-2 bg-white px-3 py-1.5 shadow-soft rotate-3"
              style={{ borderColor: "var(--brand-border)" }}>
              <span style={{ color: "var(--brand-orange)" }}>
                <Icon name="clock" className="text-xs" />
              </span>
              <span className="text-xs font-bold text-slate-800">
                {loading ? <Skeleton className="h-3 w-8" /> : duration}
              </span>
            </div>
          </div>
        </div>

        {error ? (
          <p className="text-center text-sm font-semibold text-red-500">
            {error}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div
            className="relative overflow-hidden rounded-[20px] border p-4 text-center shadow-sm"
            style={{
              borderColor: "rgba(161,232,175,0.4)",
              backgroundColor: "rgba(161,232,175,0.25)",
            }}>
            <div
              className="absolute -right-2 -top-2 h-10 w-10 rounded-full opacity-50"
              style={{ backgroundColor: "rgba(161,232,175,0.35)" }}
            />
            <span className="text-2xl font-black text-slate-900">
              {loading ? (
                <Skeleton className="mx-auto h-8 w-10" />
              ) : (
                correct
              )}
            </span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Correct
            </span>
          </div>
          <div
            className="relative overflow-hidden rounded-[20px] border p-4 text-center shadow-sm"
            style={{
              borderColor: "rgba(244,124,124,0.3)",
              backgroundColor: "rgba(244,124,124,0.10)",
            }}>
            <div
              className="absolute -right-2 -top-2 h-10 w-10 rounded-full opacity-50"
              style={{ backgroundColor: "rgba(244,124,124,0.25)" }}
            />
            <span className="text-2xl font-black text-slate-900">
              {loading ? (
                <Skeleton className="mx-auto h-8 w-10" />
              ) : (
                incorrect
              )}
            </span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
              Incorrect
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-800">
            Quick Breakdown
          </h3>
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 rounded-[20px] border-2 bg-white p-4 shadow-soft"
                  style={{ borderColor: "rgba(244,124,124,0.20)" }}>
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : quickBreakdownItems.length > 0 ? (
            <div className="flex flex-col gap-3">
              {quickBreakdownItems.map((item) => (
                <Link
                  key={item.quizItemId}
                  href={item.wordId === "demo" ? "/results" : `/words/${item.wordId}`}
                  className="flex items-start gap-4 rounded-[20px] border-2 bg-white p-4 shadow-soft"
                  style={{ borderColor: "rgba(244,124,124,0.20)" }}>
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: "rgba(244,124,124,0.10)",
                      color: "var(--brand-orange)",
                    }}>
                    <Icon name="close" className="text-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold uppercase text-slate-500">
                        {item.word}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        #{item.sequenceNo} {item.questionType}
                      </span>
                    </div>
                    <p
                      className="break-words text-sm font-bold text-slate-900 line-through"
                      style={{ textDecorationColor: "rgba(244,124,124,0.5)" }}>
                      {item.yourAnswer || "No answer"}
                    </p>
                    <p className="mt-1 break-words text-sm font-bold text-emerald-600">
                      {item.correctAnswer || "No accepted answer"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              className="flex items-start gap-4 rounded-[20px] border-2 bg-white p-4 shadow-soft"
              style={{ borderColor: "rgba(161,232,175,0.35)" }}>
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="check" className="text-sm" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-slate-900">
                  No missed words
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Every answer in this session was correct.
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void handleRetry()}
          disabled={!liveResult?.canRetry}
          className="primary-button mt-4 text-lg text-white shadow-[0_8px_20px_-4px_rgba(142,155,250,0.45)]"
          style={{ backgroundColor: "var(--brand-blue)" }}>
          <span>Test Again</span>
          <Icon name="revise" className="text-sm" />
        </button>
      </div>
    </AppShell>
  );
}
