import { Router } from "express";
import { getSupabaseConfigStatus } from "../lib/supabaseClient.js";

const router = Router();

router.get("/health", (req, res) => {
  return res.json({
    status: "ok",
    uptimeSec: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.get("/ready", (req, res) => {
  const supabase = getSupabaseConfigStatus();
  const ready = supabase.hasUrl && supabase.hasPublicKey;

  return res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    services: {
      supabase: {
        configured: ready,
        serviceRoleConfigured: supabase.hasServiceRoleKey,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
