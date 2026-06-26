"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { AuthShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { BackButton, BrandInput, GoogleMark } from "@/components/ui";
import {
  ApiError,
  getGoogleAuthUrl,
  signup as signupRequest,
} from "@/lib/api";
import { saveAuthSession } from "@/lib/session";

function passwordScore(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

const strengthLabels = ["Too weak", "Weak", "Good", "Strong"];
const strengthColors = ["#F47C7C", "#FFC800", "#8E9BFA", "#A1E8AF"];

export function SignupScreen() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = passwordScore(password);
  const matches = password.length > 0 && password === confirmPassword;

  const strengthLabel = useMemo(() => {
    if (strength === 0) return "Enter a password to check strength";
    return strengthLabels[strength - 1];
  }, [strength]);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const session = await signupRequest({
        email,
        password,
        displayName: name,
      });

      if (session.accessToken) {
        saveAuthSession(session);
        router.replace("/home");
        return;
      }

      setError("Account created. Please verify your email before signing in.");
      router.replace("/login");
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to create your account right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
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
        setError("Unable to start Google sign up right now.");
      }
      setGoogleLoading(false);
    }
  }

  return (
    <AuthShell
      accent="blue"
      icon="bolt"
      title={"Join the\ncommunity!"}
      subtitle="Start your language learning journey today."
      badgeTitle="Learn fast"
      badgeSubtitle="Master vocabulary with smart techniques">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-(--brand-border) bg-white/85 px-6 pb-4 pt-12 backdrop-blur md:px-8 md:pt-8">
        <BackButton href="/login" />
        <span className="text-xl font-bold tracking-tight">Create Account</span>
        <div className="flex items-center gap-1.5">
          <span className="step-dot done" />
          <span className="step-dot active" />
          <span className="step-dot" />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-6 pb-24 pt-8 md:mx-auto md:w-full md:max-w-md">
        <div className="flex flex-col items-center gap-2 md:hidden">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border-2 border-black bg-(--brand-blue) text-white shadow-brutal">
            <Icon name="user" className="text-2xl" />
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            Join ShobdoLab
          </h1>
          <p className="text-center text-sm font-medium text-slate-500">
            Start your language learning journey today.
          </p>
        </div>

        <div className="hidden md:block">
          <h2 className="text-3xl font-black text-slate-900">Create Account</h2>
          <p className="mt-1 font-medium text-slate-500">
            Start your language learning journey today.
          </p>
        </div>

        <button
          className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-(--brand-border) bg-white py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          type="button"
          onClick={() => void handleGoogleSignup()}
          disabled={googleLoading || loading}>
          <GoogleMark />
          {googleLoading ? "Opening Google..." : "Sign up with Google"}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-(--brand-border)" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            or
          </span>
          <div className="h-px flex-1 bg-(--brand-border)" />
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSignup}>
          <BrandInput
            label="Full Name"
            icon="user"
            placeholder="Your name"
            value={name}
            onChange={setName}
          />
          <BrandInput
            label="Email"
            icon="mail"
            placeholder="your@email.com"
            value={email}
            onChange={setEmail}
          />
          <div className="flex flex-col gap-1.5">
            <BrandInput
              label="Password"
              icon="lock"
              type={passwordVisible ? "text" : "password"}
              placeholder="Create a strong password"
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
            <div className="mt-1 flex gap-1.5 px-0.5">
              {[0, 1, 2, 3].map((segment) => (
                <span
                  key={segment}
                  className="h-1 flex-1 rounded-full bg-(--brand-border)"
                  style={{
                    backgroundColor:
                      segment < strength
                        ? strengthColors[Math.max(strength - 1, 0)]
                        : "#E5E7EB",
                  }}
                />
              ))}
            </div>
            <p
              className="text-xs font-medium text-slate-400"
              style={{
                color: strength > 0 ? strengthColors[strength - 1] : undefined,
              }}>
              {strengthLabel}
            </p>
          </div>
          <BrandInput
            label="Confirm Password"
            icon="shield"
            type="password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            trailing={
              matches ? (
                <Icon name="check" className="text-sm text-(--brand-green)" />
              ) : null
            }
          />

          {error ? (
            <p className="text-sm font-semibold text-red-500">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="primary-button bg-(--brand-blue) text-white shadow-[0_8px_20px_-4px_rgba(142,155,250,0.45)] disabled:cursor-not-allowed disabled:opacity-70">
            <span>{loading ? "Creating..." : "Create Account"}</span>
            <Icon name="arrowRight" className="text-sm" />
          </button>
        </form>

        <button
          type="button"
          onClick={() => setAccepted((value) => !value)}
          className="flex items-start gap-3 text-left">
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
              accepted
                ? "border-(--brand-green) bg-(--brand-green) text-white"
                : "border-(--brand-border) bg-white text-transparent"
            }`}>
            <Icon name="check" className="text-[10px]" />
          </span>
          <span className="text-xs font-medium leading-relaxed text-slate-500">
            I agree to ShobdoLab&apos;s{" "}
            <span className="font-semibold text-(--brand-blue)">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="font-semibold text-(--brand-blue)">
              Privacy Policy
            </span>
            .
          </span>
        </button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <a
            href="/login"
            className="font-bold text-(--brand-orange) hover:underline">
            Sign in
          </a>
        </p>
      </main>
    </AuthShell>
  );
}
