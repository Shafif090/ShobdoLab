import { supabase } from "../lib/supabaseClient.js";

function badRequest(res, code, message, details = null) {
  return res.status(400).json({
    error: {
      code,
      message,
      details,
    },
  });
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || null,
      },
    },
  });

  if (error) {
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

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
