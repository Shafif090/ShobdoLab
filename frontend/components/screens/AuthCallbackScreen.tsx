"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/app-shell";
import { Icon } from "@/components/icons";
import { ApiError, createOAuthSession } from "@/lib/api";
import { saveAuthSession } from "@/lib/session";

function readOAuthParams() {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const accessToken =
    hashParams.get("access_token") ?? params.get("access_token");
  const refreshToken =
    hashParams.get("refresh_token") ?? params.get("refresh_token");
  const expiresInRaw =
    hashParams.get("expires_in") ?? params.get("expires_in");
  const expiresAtRaw =
    hashParams.get("expires_at") ?? params.get("expires_at");
  const errorDescription =
    hashParams.get("error_description") ??
    params.get("error_description") ??
    hashParams.get("error") ??
    params.get("error");

  return {
    accessToken,
    refreshToken,
    expiresIn: expiresInRaw ? Number(expiresInRaw) : null,
    expiresAt: expiresAtRaw ? Number(expiresAtRaw) * 1000 : null,
    errorDescription,
  };
}

export function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function finishOAuthLogin() {
      const oauth = readOAuthParams();

      if (oauth.errorDescription) {
        setError(oauth.errorDescription);
        return;
      }

      if (!oauth.accessToken) {
        setError("Google did not return a valid sign-in session.");
        return;
      }

      try {
        const session = await createOAuthSession({
          accessToken: oauth.accessToken,
          refreshToken: oauth.refreshToken,
          expiresIn: oauth.expiresIn,
          expiresAt: oauth.expiresAt,
        });

        if (!active) return;

        saveAuthSession(session);
        router.replace("/home");
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError) {
          setError(exception.message);
        } else {
          setError("Unable to finish Google sign in right now.");
        }
      }
    }

    void finishOAuthLogin();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <AuthShell
      accent="orange"
      icon="fire"
      title={"Signing\nyou in"}
      subtitle="Finishing your Google sign in."
      badgeTitle="Almost there"
      badgeSubtitle="Your session is being verified">
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-[20px] border-2 border-black text-white shadow-brutal"
          style={{ backgroundColor: "var(--brand-orange)" }}>
          <Icon name={error ? "close" : "book"} className="text-2xl" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {error ? "Sign in failed" : "Signing you in..."}
          </h1>
          <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">
            {error ?? "Please wait while ShobdoLab verifies your Google account."}
          </p>
        </div>
        {error ? (
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">
            Back to Sign In
          </button>
        ) : null}
      </main>
    </AuthShell>
  );
}
