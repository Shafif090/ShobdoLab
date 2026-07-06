"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { Icon } from "./icons";
import { getHomeHeader } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

type NavKey = "home" | "learn" | "revise" | "exercise" | "dictionary";

const navItems: Array<{
  key: NavKey;
  href: string;
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
}> = [
  { key: "home", href: "/home", label: "Home", icon: "home" },
  { key: "learn", href: "/learn", label: "Learn", icon: "book" },
  { key: "revise", href: "/revise", label: "Revise", icon: "revise" },
  { key: "exercise", href: "/exercise", label: "Exercise", icon: "exercise" },
  {
    key: "dictionary",
    href: "/dictionary",
    label: "Dictionary",
    icon: "search",
  },
];

export function AppShell({
  active,
  title,
  headerAction,
  children,
}: {
  active: NavKey;
  title: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [streakDays, setStreakDays] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadShellSummary() {
      const token = getAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      setAuthChecked(true);

      try {
        const response = await getHomeHeader(token);
        if (!active) return;

        setStreakDays(response.streakDays);
      } catch {
        if (!active) return;
        setStreakDays(0);
      }
    }

    void loadShellSummary();

    return () => {
      active = false;
    };
  }, [router]);

  if (!authChecked) {
    return null;
  }

  return (
    <div
      className="min-h-screen bg-grid md:flex"
      style={{
        backgroundColor: "var(--brand-bg)",
        color: "var(--brand-text)",
      }}>
      <aside
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r bg-white md:flex lg:w-72"
        style={{ borderColor: "var(--brand-border)" }}>
        <div className="flex h-full flex-col gap-6 p-6">
          <Link href="/home" className="flex items-center gap-3 pt-2">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-black text-white shadow-brutal-sm"
              style={{ backgroundColor: "var(--brand-orange)" }}>
              <Icon name="book" className="text-base" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              ShobdoLab
            </span>
          </Link>
          <nav className="mt-2 flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const isActive = item.key === active;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition"
                  style={
                    isActive
                      ? {
                          backgroundColor: "rgba(244,124,124,0.10)",
                          color: "var(--brand-orange)",
                        }
                      : undefined
                  }>
                  <Icon name={item.icon} className="text-base" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div
            className="flex items-center gap-3 rounded-2xl border p-4 shadow-soft"
            style={{
              borderColor: "rgba(233,213,255,0.8)",
              backgroundColor: "rgba(233,213,255,0.3)",
            }}>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-violet-700"
              style={{ backgroundColor: "var(--brand-purple)" }}>
              <Icon name="fire" className="text-sm" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {streakDays}-Day Streak!
              </p>
              <p className="text-xs text-slate-500">Keep going</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header
          className="sticky top-0 z-50 flex items-center justify-between border-b bg-white/85 px-5 pb-4 pt-12 backdrop-blur sm:px-6 md:px-10 md:pt-6"
          style={{ borderColor: "var(--brand-border)" }}>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            {title}
          </h1>
          {headerAction ?? (
            <div className="flex items-center gap-3">
              <Link
                href="/achievements"
                className="icon-button"
                aria-label="Open achievements">
                <Icon name="trophy" className="text-sm" />
              </Link>
            </div>
          )}
        </header>

        <main className="flex-1 px-5 pb-28 pt-5 sm:px-6 sm:pt-6 md:px-10 md:pb-12 md:pt-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between border-t border-slate-100 bg-white px-5 pb-7 pt-3 md:hidden">
          {navItems.map((item) => {
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex flex-col items-center gap-1">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={
                    isActive
                      ? {
                          backgroundColor: "rgba(244,124,124,0.10)",
                          color: "var(--brand-orange)",
                        }
                      : { color: "#9CA3AF" }
                  }>
                  <Icon name={item.icon} className="text-lg" />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#111827" : "#9CA3AF",
                  }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function AuthShell({
  accent,
  icon,
  title,
  subtitle,
  badgeTitle,
  badgeSubtitle,
  children,
}: {
  accent: "orange" | "blue";
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  subtitle: string;
  badgeTitle: string;
  badgeSubtitle: string;
  children: ReactNode;
}) {
  const accentVar =
    accent === "orange" ? "var(--brand-orange)" : "var(--brand-blue)";

  return (
    <div
      className="flex min-h-screen flex-col md:flex-row"
      style={{ backgroundColor: "var(--brand-bg)" }}>
      <aside
        className="relative hidden min-h-screen flex-1 flex-col justify-between overflow-hidden p-12 text-white md:flex"
        style={{ backgroundColor: accentVar }}>
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20" />
        <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />

        <div className="relative z-10 flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-black/10 bg-white text-xl shadow-[0_4px_0_0_rgba(0,0,0,0.3)]"
            style={{ color: accentVar }}>
            <Icon name="book" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">
            ShobdoLab
          </span>
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          <div>
            <h2 className="whitespace-pre-line text-4xl font-black leading-tight">
              {title}
            </h2>
            <p className="mt-3 text-lg font-medium text-white/80">{subtitle}</p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Icon name={icon} className="text-base" />
                </div>
                <div>
                  <p className="text-sm font-bold">{badgeTitle}</p>
                  <p className="mt-0.5 text-xs text-white/70">
                    {badgeSubtitle}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Icon name="trophy" className="text-base" />
                </div>
                <div>
                  <p className="text-sm font-bold">Track progress</p>
                  <p className="mt-0.5 text-xs text-white/70">
                    See your improvement over time
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Icon name="exercise" className="text-base" />
                </div>
                <div>
                  <p className="text-sm font-bold">Practice with exercises</p>
                  <p className="mt-0.5 text-xs text-white/70">
                    Quiz yourself with MCQ and typing modes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/50">
          © 2026 ShobdoLab · All rights reserved
        </p>
      </aside>

      <section className="relative flex flex-1 flex-col bg-grid bg-white">
        {children}
      </section>
    </div>
  );
}
