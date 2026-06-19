"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatWordList } from "@/components/data";
import {
  getAccessToken,
  loadQuizSessionId,
  saveQuizSessionId,
} from "@/lib/session";

function getAcceptedAnswer(item: QuizItem | null) {
  if (!item?.accepted_answers) return "";
  if (Array.isArray(item.accepted_answers)) {
    return item.accepted_answers[0] ?? "";
  }
  return item.accepted_answers;
}

function buildOptions(
  currentSet: LearningSetResponse["set"] | null,
  correctAnswer: string,
) {
  const setOptions =
    currentSet?.items
      .map((item) => formatWordList(item.word?.bangla))
      .filter(Boolean) ?? [];

  const values = Array.from(new Set([correctAnswer, ...setOptions])).filter(
    Boolean,
  );
  while (values.length < 4) {
    values.push(`Option ${values.length + 1}`);
  }

  return values.slice(0, 4);
}

export function QuizScreen() {
  const router = useRouter();
  const [currentSet, setCurrentSet] = useState<
    LearningSetResponse["set"] | null
  >(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [currentItem, setCurrentItem] = useState<QuizItem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadQuiz() {
      const token = getAccessToken();
      if (!token) {
        router.replace("/login");
        setLoading(false);
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
          setSelectedAnswer("");

          if (response.currentItem?.question_type === "typing") {
            router.replace("/typing");
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

        saveQuizSessionId(startResponse.session.id);
        setSessionId(startResponse.session.id);
        setSessionTotal(startResponse.session.total_items);
        setCurrentItem(startResponse.firstItem);
        setSelectedAnswer("");

        if (startResponse.firstItem.question_type === "typing") {
          router.replace("/typing");
        }
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError) {
          setError(exception.message);
          return;
        }

        setError("Unable to load the quiz right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadQuiz();

    return () => {
      active = false;
    };
  }, [router]);

  const prompt = currentItem?.prompt_text ?? "Perfidious";
  const promptLabel = "What is the meaning of the following word?";
  const options = useMemo(
    () =>
      currentItem?.options?.length
        ? currentItem.options
        : buildOptions(currentSet, getAcceptedAnswer(currentItem)),
    [currentSet, currentItem],
  );

  async function handleContinue() {
    if (submitting || !selectedAnswer) return;

    const token = getAccessToken();
    if (!token || !sessionId || !currentItem) {
      router.replace("/login");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await submitQuizAnswer(token, sessionId, selectedAnswer);
      setSessionTotal(response.session.total_items);

      if (response.completed || !response.nextItem) {
        await finishQuizSession(token, sessionId);
        saveQuizSessionId(sessionId);
        router.push("/results");
        return;
      }

      if (response.nextItem.question_type === "typing") {
        router.push("/typing");
        return;
      }

      setCurrentItem(response.nextItem);
      setSelectedAnswer("");
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to submit your answer right now.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-grid"
      style={{
        backgroundColor: "var(--brand-bg)",
        color: "var(--brand-text)",
      }}>
      <div className="flex min-h-screen flex-col bg-white">
        <QuizHeader
          progress={
            currentItem
              ? (currentItem.sequence_no /
                  Math.max(
                    sessionTotal || (currentSet?.total_words ?? 10),
                    1,
                  )) *
                100
              : 30
          }
          index={currentItem?.sequence_no ?? 1}
          total={sessionTotal ?? currentSet?.total_words ?? 10}
        />

        <main className="flex-1 overflow-y-auto px-6 pb-32 pt-8">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
            <div className="mt-4 text-center">
              <span
                className="text-xs font-bold uppercase tracking-[0.18em]"
                style={{ color: "var(--brand-blue)" }}>
                {promptLabel}
              </span>
              {loading ? (
                <Skeleton className="mx-auto mt-4 h-10 w-48" />
              ) : (
                <h2 className="mt-4 text-3xl font-extrabold text-slate-900">
                  {prompt}
                </h2>
              )}
              <div className="mt-4 flex items-center justify-center gap-2">
                <button className="audio-button" type="button">
                  <Icon name="volume" className="text-xs" />
                </button>
                <button className="audio-button" type="button">
                  <Icon name="turtle" className="text-xs" />
                </button>
              </div>
            </div>

            {error ? (
              <p className="text-center text-sm font-semibold text-red-500">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex flex-col gap-3">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-[58px] w-full" />
                  ))
                : options.map((option) => {
                    const selected = option === selectedAnswer;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedAnswer(option)}
                        className="flex items-center justify-between rounded-2xl border-2 p-4 text-left shadow-sm transition"
                        style={{
                          borderColor: selected
                            ? "var(--brand-green)"
                            : "var(--brand-border)",
                          backgroundColor: selected
                            ? "rgba(161,232,175,0.18)"
                            : "#ffffff",
                        }}>
                        <span
                          className={`text-base ${selected ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                          {option}
                        </span>
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full border-2"
                          style={{
                            borderColor: selected
                              ? "var(--brand-green)"
                              : "#e5e7eb",
                            backgroundColor: selected
                              ? "var(--brand-green)"
                              : "transparent",
                            color: selected ? "#ffffff" : "inherit",
                          }}>
                          {selected ? (
                            <Icon name="check" className="text-xs" />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
            </div>

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
                  {currentItem ? "Live question loaded" : "Loading question..."}
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
              onClick={() => void handleContinue()}
              disabled={loading || submitting || !selectedAnswer}
              className="primary-button text-white shadow-[0_8px_20px_-4px_rgba(142,155,250,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
              style={{ backgroundColor: "var(--brand-blue)" }}>
              <span>{submitting ? "Saving..." : "Continue"}</span>
              <Icon name="arrowRight" className="text-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
