"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { AuthShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { BackButton, BrandInput } from "@/components/ui";
import { ApiError, forgotPassword } from "@/lib/api";

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const response = await forgotPassword({ email, redirectTo });
      setMessage(response.message);
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to send a reset email right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      accent="blue"
      icon="lock"
      title={"Reset your\npassword"}
      subtitle="Get a secure link and come right back."
      badgeTitle="Account recovery"
      badgeSubtitle="A reset link will be sent to your email">
      <header className="sticky top-0 z-40 flex items-center border-b border-(--brand-border) bg-white/85 px-6 pb-4 pt-12 backdrop-blur md:px-8 md:pt-8">
        <BackButton href="/login" />
        <span className="ml-3 text-xl font-bold tracking-tight">
          Forgot Password
        </span>
      </header>

      <main className="flex flex-1 flex-col gap-8 px-6 pb-24 pt-8 md:mx-auto md:w-full md:max-w-md">
        <div className="flex flex-col items-center gap-2 md:hidden">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border-2 border-black bg-(--brand-blue) text-white shadow-brutal">
            <Icon name="lock" className="text-2xl" />
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            Reset Password
          </h1>
          <p className="text-center text-sm font-medium text-slate-500">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="hidden md:block">
          <h2 className="text-3xl font-black text-slate-900">
            Reset Password
          </h2>
          <p className="mt-1 font-medium text-slate-500">
            Enter your email and we&apos;ll send you a secure reset link.
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <BrandInput
            label="Email"
            icon="mail"
            placeholder="your@email.com"
            value={email}
            onChange={setEmail}
          />

          {message ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="text-sm font-semibold text-red-500">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="primary-button bg-(--brand-blue) text-white shadow-[0_8px_20px_-4px_rgba(142,155,250,0.45)] disabled:cursor-not-allowed disabled:opacity-70">
            <span>{loading ? "Sending..." : "Send Reset Link"}</span>
            <Icon name="arrowRight" className="text-sm" />
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-bold text-(--brand-orange) hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </AuthShell>
  );
}
