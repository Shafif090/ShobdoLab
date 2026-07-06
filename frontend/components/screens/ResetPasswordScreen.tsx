"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { AuthShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { BackButton, BrandInput } from "@/components/ui";
import { ApiError, resetPassword } from "@/lib/api";

function readResetParams() {
  if (typeof window === "undefined") {
    return { accessToken: "", refreshToken: "", type: "" };
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);

  return {
    accessToken:
      hashParams.get("access_token") || queryParams.get("access_token") || "",
    refreshToken:
      hashParams.get("refresh_token") || queryParams.get("refresh_token") || "",
    type: hashParams.get("type") || queryParams.get("type") || "",
  };
}

export function ResetPasswordScreen() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resetParams = readResetParams();
    setAccessToken(resetParams.accessToken);
    setRefreshToken(resetParams.refreshToken);

    if (resetParams.accessToken || resetParams.refreshToken || resetParams.type) {
      window.history.replaceState(null, "", "/reset-password");
    }
  }, []);

  const hasResetSession = Boolean(accessToken && refreshToken);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = useMemo(
    () => hasResetSession && passwordsMatch && password.length >= 6 && !loading,
    [hasResetSession, loading, password.length, passwordsMatch],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await resetPassword({
        accessToken,
        refreshToken,
        password,
      });
      setMessage(response.message);
      setPassword("");
      setConfirmPassword("");
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to update your password right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      accent="blue"
      icon="shield"
      title={"Choose a\nnew password"}
      subtitle="Secure your account and continue learning."
      badgeTitle="Almost done"
      badgeSubtitle="Use a password you do not use elsewhere">
      <header className="sticky top-0 z-40 flex items-center border-b border-(--brand-border) bg-white/85 px-6 pb-4 pt-12 backdrop-blur md:px-8 md:pt-8">
        <BackButton href="/login" />
        <span className="ml-3 text-xl font-bold tracking-tight">
          Reset Password
        </span>
      </header>

      <main className="flex flex-1 flex-col gap-8 px-6 pb-24 pt-8 md:mx-auto md:w-full md:max-w-md">
        <div className="flex flex-col items-center gap-2 md:hidden">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border-2 border-black bg-(--brand-blue) text-white shadow-brutal">
            <Icon name="shield" className="text-2xl" />
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            New Password
          </h1>
          <p className="text-center text-sm font-medium text-slate-500">
            Set a fresh password for your ShobdoLab account.
          </p>
        </div>

        <div className="hidden md:block">
          <h2 className="text-3xl font-black text-slate-900">New Password</h2>
          <p className="mt-1 font-medium text-slate-500">
            Set a fresh password for your ShobdoLab account.
          </p>
        </div>

        {!hasResetSession ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-600">
              Reset link is invalid or expired.
            </p>
            <p className="mt-1 text-sm font-medium text-red-600/80">
              Request a new link and open it from your email.
            </p>
          </div>
        ) : message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-700">
              Password updated
            </p>
            <p className="mt-1 text-sm font-medium text-emerald-700/80">
              {message}
            </p>
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <BrandInput
              label="New Password"
              icon="lock"
              type={passwordVisible ? "text" : "password"}
              placeholder="Create a new password"
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
            <BrandInput
              label="Confirm Password"
              icon="shield"
              type="password"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              trailing={
                passwordsMatch ? (
                  <Icon name="check" className="text-sm text-(--brand-green)" />
                ) : null
              }
            />

            {password.length > 0 && password.length < 6 ? (
              <p className="text-sm font-semibold text-red-500">
                Password must be at least 6 characters.
              </p>
            ) : null}
            {confirmPassword.length > 0 && !passwordsMatch ? (
              <p className="text-sm font-semibold text-red-500">
                Passwords do not match.
              </p>
            ) : null}
            {error ? (
              <p className="text-sm font-semibold text-red-500">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="primary-button bg-(--brand-blue) text-white shadow-[0_8px_20px_-4px_rgba(142,155,250,0.45)] disabled:cursor-not-allowed disabled:opacity-70">
              <span>{loading ? "Updating..." : "Update Password"}</span>
              <Icon name="arrowRight" className="text-sm" />
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-500">
          {message ? (
            <Link
              href="/login"
              className="font-bold text-(--brand-orange) hover:underline">
              Back to sign in
            </Link>
          ) : (
            <Link
              href="/forgot-password"
              className="font-bold text-(--brand-orange) hover:underline">
              Request a new link
            </Link>
          )}
        </p>
      </main>
    </AuthShell>
  );
}
