import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublicKey = process.env.SUPABASE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseKey = supabaseServiceRoleKey || supabasePublicKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[supabase] SUPABASE_URL or SUPABASE_KEY is missing. DB-backed routes will fail until env is configured.",
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseKey || "");
export const authSupabase = createClient(
  supabaseUrl || "",
  supabasePublicKey || supabaseKey || "",
);

export function getSupabaseConfigStatus() {
  return {
    hasUrl: Boolean(supabaseUrl),
    hasPublicKey: Boolean(supabasePublicKey),
    hasServiceRoleKey: Boolean(supabaseServiceRoleKey),
  };
}

export function createSupabaseClient(accessToken) {
  if (!supabaseUrl || !supabaseKey) {
    return createClient("", "");
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
