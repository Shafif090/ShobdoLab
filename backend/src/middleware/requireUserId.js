import { createSupabaseClient, supabase } from "../lib/supabaseClient.js";

export async function requireUserId(req, res, next) {
  const authHeader = req.header("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const accessToken = authHeader.slice("Bearer ".length).trim();
    if (accessToken) {
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (!error && data?.user?.id) {
        req.userId = data.user.id;
        req.authUser = data.user;
        req.supabase = createSupabaseClient(accessToken);
        return next();
      }
    }
  }

  return res.status(401).json({
    error: {
      code: "AUTH_REQUIRED",
      message: "Provide a valid Authorization: Bearer <accessToken> header.",
      details: null,
    },
  });
}
