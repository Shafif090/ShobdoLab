import {
  authSupabase,
  createAuthSupabaseClient,
  getSupabaseConfigStatus,
  supabase,
} from "../lib/supabaseClient.js";
import { env } from "../config/env.js";

function badRequest(res, code, message, details = null) {
  return res.status(400).json({
    error: {
      code,
      message,
      details,
    },
  });
}

function isSupabaseNetworkError(error) {
  if (!error) return false;

  const message = String(error.message || "").toLowerCase();
  return (
    error.name === "AuthRetryableFetchError" ||
    message.includes("fetch failed") ||
    message.includes("failed to fetch") ||
    message.includes("network")
  );
}

function authServiceUnavailable(res, message = "Authentication service is unavailable.") {
  return res.status(503).json({
    error: {
      code: "AUTH_SERVICE_UNAVAILABLE",
      message,
      details: getSupabaseConfigStatus(),
    },
  });
}

function normalizeRedirectTo(value) {
  if (!value) return null;

  try {
    const url = new URL(String(value));
    const allowedProtocols = new Set([
      "http:",
      "https:",
      "mobile:",
      "shobdolab:",
      "exp:",
    ]);
    if (!allowedProtocols.has(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function getPasswordResetRedirectTo(value) {
  return normalizeRedirectTo(value) || env.passwordResetRedirectUrl || null;
}

function getDisplayName(user) {
  return (
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    null
  );
}

function buildAuthSession(session, user) {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token || null,
    expiresIn: session.expires_in || null,
    expiresAt: session.expires_at ? session.expires_at * 1000 : null,
    user: {
      id: user.id,
      email: user.email || null,
      displayName: getDisplayName(user),
    },
  };
}

async function ensureUserProfile(user) {
  if (!user?.id) return;

  const displayName = getDisplayName(user);
  const profile = { id: user.id };

  if (displayName) {
    profile.display_name = displayName;
  }

  await supabase.from("users").upsert(
    profile,
    {
      onConflict: "id",
      ignoreDuplicates: false,
    },
  );
}

export async function signup(req, res) {
  const { email, password, displayName } = req.body || {};

  if (!email || !password) {
    return badRequest(
      res,
      "EMAIL_PASSWORD_REQUIRED",
      "email and password are required.",
    );
  }

  if (String(password).length < 6) {
    return badRequest(
      res,
      "WEAK_PASSWORD",
      "password must be at least 6 characters.",
    );
  }

  const { data, error } = await authSupabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || null,
      },
    },
  });

  if (error) {
    if (isSupabaseNetworkError(error)) {
      return authServiceUnavailable(
        res,
        "Unable to reach Supabase Auth. Check the backend network connection and Supabase environment variables.",
      );
    }

    return res.status(400).json({
      error: {
        code: "SIGNUP_FAILED",
        message: error.message,
        details: null,
      },
    });
  }

  if (displayName && data?.user?.id) {
    await supabase.from("users").upsert(
      {
        id: data.user.id,
        display_name: displayName,
      },
      { onConflict: "id" },
    );
  }

  return res.status(201).json({
    user: {
      id: data.user.id,
      email: data.user.email,
      displayName: displayName || data.user.user_metadata?.display_name || null,
    },
    accessToken: data.session?.access_token || null,
    refreshToken: data.session?.refresh_token || null,
    expiresIn: data.session?.expires_in || null,
  });
}

export async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return badRequest(
      res,
      "EMAIL_PASSWORD_REQUIRED",
      "email and password are required.",
    );
  }

  const { data, error } = await authSupabase.auth.signInWithPassword({
    email,
    password,
  });

  if (isSupabaseNetworkError(error)) {
    return authServiceUnavailable(
      res,
      "Unable to reach Supabase Auth. Check the backend network connection and Supabase environment variables.",
    );
  }

  if (error || !data?.session || !data?.user) {
    return res.status(401).json({
      error: {
        code: "LOGIN_FAILED",
        message: error?.message || "Invalid credentials.",
        details: null,
      },
    });
  }

  return res.json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
}

export async function forgotPassword(req, res) {
  const email = normalizeEmail(req.body?.email);
  const redirectTo = getPasswordResetRedirectTo(req.body?.redirectTo);

  if (!email) {
    return badRequest(res, "EMAIL_REQUIRED", "email is required.");
  }

  if (!redirectTo) {
    return badRequest(
      res,
      "RESET_REDIRECT_REQUIRED",
      "A password reset redirect URL must be configured.",
    );
  }

  const { error } = await authSupabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (isSupabaseNetworkError(error)) {
    return authServiceUnavailable(
      res,
      "Unable to reach Supabase Auth. Check the backend network connection and Supabase environment variables.",
    );
  }

  if (error) {
    return res.status(400).json({
      error: {
        code: "PASSWORD_RESET_FAILED",
        message: error.message || "Unable to send password reset email.",
        details: null,
      },
    });
  }

  return res.json({
    ok: true,
    message: "If an account exists for that email, a reset link has been sent.",
  });
}

export async function resetPassword(req, res) {
  const { accessToken, refreshToken, password } = req.body || {};

  if (!accessToken || !refreshToken || !password) {
    return badRequest(
      res,
      "RESET_TOKEN_PASSWORD_REQUIRED",
      "accessToken, refreshToken, and password are required.",
    );
  }

  if (String(password).length < 6) {
    return badRequest(
      res,
      "WEAK_PASSWORD",
      "password must be at least 6 characters.",
    );
  }

  const resetClient = createAuthSupabaseClient();
  const { data: sessionData, error: sessionError } =
    await resetClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

  if (isSupabaseNetworkError(sessionError)) {
    return authServiceUnavailable(
      res,
      "Unable to reach Supabase Auth. Check the backend network connection and Supabase environment variables.",
    );
  }

  if (sessionError || !sessionData?.session || !sessionData?.user) {
    return res.status(401).json({
      error: {
        code: "RESET_TOKEN_INVALID",
        message: sessionError?.message || "This password reset link is invalid or expired.",
        details: null,
      },
    });
  }

  const { error } = await resetClient.auth.updateUser({ password });

  if (isSupabaseNetworkError(error)) {
    return authServiceUnavailable(
      res,
      "Unable to reach Supabase Auth. Check the backend network connection and Supabase environment variables.",
    );
  }

  if (error) {
    return res.status(400).json({
      error: {
        code: "PASSWORD_UPDATE_FAILED",
        message: error.message || "Unable to update password.",
        details: null,
      },
    });
  }

  return res.json({
    ok: true,
    message: "Password updated. Please sign in with your new password.",
  });
}

export async function refreshSession(req, res) {
  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    return badRequest(
      res,
      "REFRESH_TOKEN_REQUIRED",
      "refreshToken is required.",
    );
  }

  const { data, error } = await authSupabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (isSupabaseNetworkError(error)) {
    return authServiceUnavailable(
      res,
      "Unable to reach Supabase Auth. Check the backend network connection and Supabase environment variables.",
    );
  }

  if (error || !data?.session || !data?.user) {
    return res.status(401).json({
      error: {
        code: "REFRESH_FAILED",
        message: error?.message || "Unable to refresh this session.",
        details: null,
      },
    });
  }

  await ensureUserProfile(data.user);

  return res.json(buildAuthSession(data.session, data.user));
}

export async function googleAuthUrl(req, res) {
  const redirectTo = normalizeRedirectTo(req.body?.redirectTo);

  if (!redirectTo) {
    return badRequest(
      res,
      "REDIRECT_REQUIRED",
      "A valid redirectTo URL is required.",
    );
  }

  const { data, error } = await authSupabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      scopes: "openid email profile",
      skipBrowserRedirect: true,
    },
  });

  if (isSupabaseNetworkError(error)) {
    return authServiceUnavailable(
      res,
      "Unable to reach Supabase Auth. Check the backend network connection and Supabase environment variables.",
    );
  }

  if (error || !data?.url) {
    return res.status(400).json({
      error: {
        code: "GOOGLE_AUTH_URL_FAILED",
        message: error?.message || "Unable to create Google sign-in URL.",
        details: null,
      },
    });
  }

  return res.json({ url: data.url });
}

export async function oauthSession(req, res) {
  const { accessToken, refreshToken, expiresIn, expiresAt } = req.body || {};

  if (!accessToken) {
    return badRequest(
      res,
      "ACCESS_TOKEN_REQUIRED",
      "accessToken is required.",
    );
  }

  const { data, error } = await authSupabase.auth.getUser(accessToken);

  if (isSupabaseNetworkError(error)) {
    return authServiceUnavailable(
      res,
      "Unable to reach Supabase Auth. Check the backend network connection and Supabase environment variables.",
    );
  }

  if (error || !data?.user) {
    return res.status(401).json({
      error: {
        code: "OAUTH_SESSION_FAILED",
        message: error?.message || "Unable to verify Google session.",
        details: null,
      },
    });
  }

  await ensureUserProfile(data.user);

  return res.json(
    buildAuthSession(
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        expires_at: expiresAt ? Math.floor(Number(expiresAt) / 1000) : null,
      },
      data.user,
    ),
  );
}
