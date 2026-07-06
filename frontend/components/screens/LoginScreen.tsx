"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { AuthShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { BackButton, BrandInput, GoogleMark } from "@/components/ui";
import {
  ApiError,
  getGoogleAuthUrl,
  login as loginRequest,
} from "@/lib/api";
import { consumeSessionMessage, saveAuthSession } from "@/lib/session";

export function LoginScreen() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const message = consumeSessionMessage();
    if (message) {
      setError(message);
    }
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const session = await loginRequest({ email, password });
      saveAuthSession(session);
      router.replace("/home");
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to sign in right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (googleLoading) return;

    setGoogleLoading(true);
    setError(null);

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const response = await getGoogleAuthUrl(redirectTo);
      window.location.assign(response.url);
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to start Google sign in right now.");
      }
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell
      accent="orange"
      icon="fire"
      title={"Welcome\nback!"}
      subtitle="Continue your language learning journey."
      badgeTitle="Keep your streak alive"
      badgeSubtitle="Sign in daily to maintain your progress">
      <header
        className="sticky top-0 z-40 flex items-center border-b bg-white/85 px-6 pb-4 pt-12 backdrop-blur md:px-8 md:pt-8"
        style={{ borderColor: "var(--brand-border)" }}>
        <BackButton href="/home" />
        <span className="ml-3 text-xl font-bold tracking-tight">Sign In</span>
      </header>

      <main className="flex flex-1 flex-col gap-8 px-6 pb-24 pt-8 md:mx-auto md:w-full md:max-w-md">
        <div className="flex flex-col items-center gap-2 md:hidden">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-[20px] border-2 border-black text-white shadow-brutal"
            style={{ backgroundColor: "var(--brand-orange)" }}>
            <Icon name="book" className="text-2xl" />
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            ShobdoLab
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Welcome back! Continue your streak.
          </p>
        </div>
        <div className="hidden md:block">
          <h2 className="text-3xl font-black text-slate-900">Sign In</h2>
          <p className="mt-1 font-medium text-slate-500">
            Welcome back! Continue your streak.
          </p>
        </div>

        <button
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 bg-white py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          style={{ borderColor: "var(--brand-border)" }}
          type="button"
          onClick={() => void handleGoogleLogin()}
          disabled={googleLoading || loading}>
          <GoogleMark />
          {googleLoading ? "Opening Google..." : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3">
          <div
            className="h-px flex-1"
            style={{ backgroundColor: "var(--brand-border)" }}
          />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            or
          </span>
          <div
            className="h-px flex-1"
            style={{ backgroundColor: "var(--brand-border)" }}
          />
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
          <BrandInput
            label="Email"
            icon="mail"
            placeholder="your@email.com"
            value={email}
            onChange={setEmail}
          />
          <BrandInput
            label="Password"
            icon="lock"
            type={passwordVisible ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
            trailing={
              <button
                type="button"
                onClick={() => setPasswordVisible((value) => !value)}
                className="text-slate-400 transition hover:text-slate-600">
                {passwordVisible ? "Hide" : "Show"}
              </button>
            }
          />

          <a
            href="/forgot-password"
            className="-mt-1 self-end text-sm font-bold text-(--brand-blue) hover:underline">
            Forgot password?
          </a>

          {error ? (
            <p className="text-sm font-semibold text-red-500">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="primary-button text-white shadow-[0_8px_20px_-4px_rgba(244,124,124,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
            style={{ backgroundColor: "var(--brand-orange)" }}>
            <span>{loading ? "Signing In..." : "Sign In"}</span>
            <Icon name="arrowRight" className="text-sm" />
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <a
            href="/signup"
            className="font-bold hover:underline"
            style={{ color: "var(--brand-blue)" }}>
            Create one
          </a>
        </p>

        <div
          className="flex items-center gap-3 rounded-2xl border p-4"
          style={{
            borderColor: "rgba(233,213,255,0.7)",
            backgroundColor: "rgba(233,213,255,0.25)",
          }}>
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-violet-700"
            style={{ backgroundColor: "var(--brand-purple)" }}>
            <Icon name="fire" className="text-sm" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">
              Keep your streak alive!
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Sign in to continue your streak.
            </p>
          </div>
        </div>
      </main>
    </AuthShell>
  );
}
