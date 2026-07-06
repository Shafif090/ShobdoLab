import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublicKey = process.env.SUPABASE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabasePublicKey) {
  console.warn(
    "[supabase] SUPABASE_URL or SUPABASE_KEY is missing. DB-backed routes will fail until env is configured.",
  );
}

export const supabase = createClient(supabaseUrl || "", supabasePublicKey || "");
export const adminSupabase = createClient(
  supabaseUrl || "",
  supabaseServiceRoleKey || supabasePublicKey || "",
);
export const authSupabase = createClient(
  supabaseUrl || "",
  supabasePublicKey || "",
);

export function getSupabaseConfigStatus() {
  return {
    hasUrl: Boolean(supabaseUrl),
    hasPublicKey: Boolean(supabasePublicKey),
    hasServiceRoleKey: Boolean(supabaseServiceRoleKey),
  };
}

export function assertSupabaseConfig() {
  if (!supabaseUrl || !supabasePublicKey) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY must be configured.");
  }
}

export function createAuthSupabaseClient() {
  return createClient(supabaseUrl || "", supabasePublicKey || "", {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "implicit",
      persistSession: false,
    },
  });
}

export function createSupabaseClient(accessToken) {
  if (!supabaseUrl || !supabasePublicKey) {
    return createClient("", "");
  }

  return createClient(supabaseUrl, supabasePublicKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
