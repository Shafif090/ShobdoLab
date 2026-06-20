"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { QuizHeader, Skeleton } from "@/components/ui";
import {
  ApiError,
  finishQuizSession,
  getCurrentSet,
  getQuizSession,
  startLearnQuiz,
  submitQuizAnswer,
  type LearningSetResponse,
  type QuizItem,
} from "@/lib/api";
import {
  getAccessToken,
  loadQuizSessionId,
  saveQuizSessionId,
} from "@/lib/session";

export function TypingScreen() {
  const router = useRouter();
  const [currentSet, setCurrentSet] = useState<
    LearningSetResponse["set"] | null
  >(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [currentItem, setCurrentItem] = useState<QuizItem | null>(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTyping() {
      const token = getAccessToken();
      if (!token) {
        router.replace("/login");
        setInitialLoading(false);
        return;
      }

      const storedSessionId = loadQuizSessionId();

      try {
        if (storedSessionId) {
          const response = await getQuizSession(token, storedSessionId);
          if (!active) return;

          setSessionId(storedSessionId);
          setSessionTotal(response.session.total_items || response.totalItems);
          setCurrentItem(response.currentItem);
          setValue("");

          if (response.currentItem?.question_type === "mcq") {
            router.replace("/quiz");
          }

          const setResponse = await getCurrentSet(token);
          if (!active) return;
          setCurrentSet(setResponse.set);
          return;
        }

        const setResponse = await getCurrentSet(token);
        if (!active) return;

        setCurrentSet(setResponse.set);
        const startResponse = await startLearnQuiz(token, setResponse.set.id);
        if (!active) return;

        setSessionId(startResponse.session.id);
        setSessionTotal(startResponse.session.total_items);
        saveQuizSessionId(startResponse.session.id);
        setCurrentItem(startResponse.firstItem);
        setValue("");

        if (startResponse.firstItem.question_type === "mcq") {
          router.replace("/quiz");
        }
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError) {
          setError(exception.message);
          return;
        }

        setError("Unable to load the typing exercise right now.");
      } finally {
        if (active) {
          setInitialLoading(false);
        }
      }
    }

    void loadTyping();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleCheck() {
    if (loading) return;

    const token = getAccessToken();
    if (!token || !sessionId || !currentItem) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await submitQuizAnswer(
        token,
        sessionId,
        value,
        currentItem.id,
      );
      setSessionTotal(response.session.total_items);

      if (response.completed || !response.nextItem) {
        await finishQuizSession(token, sessionId);
        saveQuizSessionId(sessionId);
        router.push("/results");
        return;
      }

      if (response.nextItem.question_type === "mcq") {
        router.push("/quiz");
        return;
      }

      setCurrentItem(response.nextItem);
      setValue("");
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to submit your answer right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-grid"
      style={{
        backgroundColor: "var(--brand-bg)",
        color: "var(--brand-text)",
      }}>
      <div className="relative flex min-h-screen flex-col bg-white">
        <div
          className="absolute left-8 top-32 h-4 w-4 rounded-full border-2 opacity-20"
          style={{ borderColor: "var(--brand-orange)" }}
        />
        <div
          className="absolute right-12 top-40 h-0 w-0 opacity-30"
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
          className="absolute left-10 top-64 text-xl opacity-20"
          style={{ color: "var(--brand-blue)" }}>
          <Icon name="arrowRight" className="-rotate-135 text-base" />
        </div>

        <QuizHeader
          progress={
            currentItem
              ? (currentItem.sequence_no /
                  Math.max(sessionTotal || (currentSet?.total_words ?? 10), 1)) *
                100
              : 40
          }
          index={currentItem?.sequence_no ?? 1}
          total={sessionTotal ?? currentSet?.total_words ?? 10}
        />

        <main className="relative z-10 flex-1 overflow-y-auto px-6 pb-32 pt-12">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-10">
            <div className="mt-4 text-center">
              <span
                className="text-xs font-bold uppercase tracking-[0.18em]"
                style={{ color: "var(--brand-blue)" }}>
                Type the translation
              </span>
              {initialLoading ? (
                <Skeleton className="mx-auto mt-4 h-12 w-44" />
              ) : (
                <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                  {currentItem?.prompt_text ?? "Apple"}
                </h2>
              )}
              <div className="mt-4 flex items-center justify-center gap-2">
                <button className="audio-button" type="button">
                  <Icon name="volume" className="text-sm" />
                </button>
                <button className="audio-button" type="button">
                  <Icon name="turtle" className="text-sm" />
                </button>
              </div>
            </div>

            <div className="relative mt-4">
              {initialLoading ? (
                <Skeleton className="h-[70px] w-full" />
              ) : (
                <input
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="Type your answer here..."
                  className="typing-input w-full rounded-2xl border-2 bg-white p-5 pr-12 text-center text-xl font-semibold text-slate-900 shadow-sm placeholder:text-slate-300"
                  style={{ borderColor: "var(--brand-border)" }}
                />
              )}
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                <Icon name="keyboard" className="text-base" />
              </span>
            </div>

            {error ? (
              <p className="text-center text-sm font-semibold text-red-500">
                {error}
              </p>
            ) : null}

            <div
              className="mt-2 flex items-start gap-3 rounded-2xl border p-4"
              style={{
                borderColor: "rgba(161,232,175,0.35)",
                backgroundColor: "rgba(161,232,175,0.16)",
              }}>
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: "var(--brand-green)" }}>
                <Icon name="check" className="text-sm" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Live typing exercise
                </h4>
                <p className="mt-1 text-xs text-slate-600">
                  {currentSet
                    ? `${currentSet.total_words} words are available in the current set.`
                    : "The backend will provide the active set as soon as it is available."}
                </p>
              </div>
            </div>
          </div>
        </main>

        <div className="border-t border-slate-100 bg-white/90 px-6 py-4 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-xl">
            <button
              type="button"
              onClick={() => void handleCheck()}
              disabled={loading}
              className="primary-button text-white shadow-[0_8px_20px_-4px_rgba(142,155,250,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
              style={{ backgroundColor: "var(--brand-blue)" }}>
              <span>{loading ? "Checking..." : "Check"}</span>
              <Icon name="check" className="text-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
