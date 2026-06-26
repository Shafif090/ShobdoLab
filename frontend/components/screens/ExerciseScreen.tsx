"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { Skeleton } from "@/components/ui";
import {
  ApiError,
  getCurrentSet,
  getExerciseMeta,
  startExerciseSession,
  type ExerciseMetaResponse,
} from "@/lib/api";
import {
  getAccessToken,
  clearQuizSessionId,
  saveQuizSessionId,
} from "@/lib/session";

export function ExerciseScreen() {
  const router = useRouter();
  const modes = {
    mcq: {
      title: "MCQ Practice",
      icon: "book",
      time: "3-5 mins",
      items: "10 Questions",
      start: "Start MCQ",
      href: "/quiz",
    },
    mixed: {
      title: "Mixed Practice",
      icon: "bolt",
      time: "4-6 mins",
      items: "10 Questions",
      start: "Start Test",
      href: "/typing",
    },
    typing: {
      title: "Typing Practice",
      icon: "keyboard",
      time: "5-8 mins",
      items: "10 Questions",
      start: "Start Typing",
      href: "/typing",
    },
  } as const;

  const [mode, setMode] = useState<keyof typeof modes>("mixed");
  const current = modes[mode];
  const [meta, setMeta] = useState<ExerciseMetaResponse | null>(null);
  const [syncMessage, setSyncMessage] = useState(
    "Sign in to sync your current learning set.",
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadCurrentSet() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [setResponse, metaResponse] = await Promise.all([
          getCurrentSet(token),
          getExerciseMeta(token),
        ]);
        if (!active) return;

        setMeta(metaResponse);
        setSyncMessage(
          `Live set #${setResponse.set.set_index} with ${setResponse.set.total_words} words ready`,
        );
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError && exception.status === 401) {
          setSyncMessage("Your session expired. Sign in again to sync.");
          return;
        }

        setSyncMessage("Unable to load your live set right now.");
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

  async function startMode(target: "/quiz" | "/typing") {
    const token = getAccessToken();
    if (!token) {
      router.push(target);
      return;
    }

    try {
      const response = await startExerciseSession(token, mode);
      saveQuizSessionId(response.session.id);
    } catch {
      clearQuizSessionId();
    }

    router.push(target);
  }

  const modeMeta = meta?.modes[mode];
  const estimatedTime = modeMeta?.estimated ?? current.time;
  const itemCount = modeMeta ? `${modeMeta.items} Questions` : current.items;
  const lastAccuracy = meta?.lastSessionAccuracy;

  return (
    <AppShell active="exercise" title="Exercise">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <div className="mt-4 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Ready to Practice?
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose your preferred mode to begin.
          </p>
        </div>

        <div className="flex gap-1 rounded-full bg-slate-100/80 p-1.5 shadow-inner">
          {(Object.keys(modes) as Array<keyof typeof modes>).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm transition ${
                item === mode
                  ? "bg-white font-bold text-slate-900 shadow-sm"
                  : "font-medium text-slate-500 hover:text-slate-900"
              }`}>
              <Icon
                name={modes[item].icon as Parameters<typeof Icon>[0]["name"]}
                className="text-sm text-(--brand-blue)"
              />
              {item.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="rounded-3xl border border-[rgba(161,232,175,0.25)] bg-[rgba(161,232,175,0.12)] p-4 text-sm font-medium text-slate-700">
          {loading ? (
            <Skeleton className="h-5 w-3/4" />
          ) : (
            <>
              {syncMessage}
            </>
          )}
        </div>

        <div className="relative mt-4 flex flex-col items-center gap-6 overflow-hidden rounded-[20px] border border-slate-100 bg-white p-8 text-center shadow-soft">
          <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border border-slate-50 bg-(--brand-bg) shadow-inner">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-(--brand-blue) shadow-sm">
              <Icon
                name={current.icon as Parameters<typeof Icon>[0]["name"]}
                className="text-3xl"
              />
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-slate-900">
              {current.title}
            </h3>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
                style={{
                  borderColor: "rgba(233,213,255,0.8)",
                  backgroundColor: "rgba(233,213,255,0.25)",
                }}>
                <Icon name="clock" className="text-[10px]" /> {estimatedTime}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
                style={{
                  borderColor: "rgba(161,232,175,0.8)",
                  backgroundColor: "rgba(161,232,175,0.25)",
                }}>
                <Icon name="layers" className="text-[10px]" /> {itemCount}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void startMode(current.href as "/quiz" | "/typing")}
            className="primary-button relative z-10 w-full bg-(--brand-orange) text-lg text-white shadow-[0_8px_20px_-4px_rgba(244,124,124,0.45)]">
            <span>{current.start}</span>
            <Icon name="arrowRight" className="text-sm" />
          </button>
        </div>

        <div className="flex items-center justify-between px-2 text-xs font-medium">
          <span className="text-slate-500">
            {loading ? (
              <Skeleton className="h-4 w-36" />
            ) : (
              <>
                Last session:{" "}
                <strong className="text-slate-900">
                  {lastAccuracy === null || lastAccuracy === undefined
                    ? "No sessions yet"
                    : `${lastAccuracy}% accuracy`}
                </strong>
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => router.push("/exercise/history")}
            className="font-semibold"
            style={{ color: "var(--brand-blue)" }}>
            View History
          </button>
        </div>
      </div>
    </AppShell>
  );
}
