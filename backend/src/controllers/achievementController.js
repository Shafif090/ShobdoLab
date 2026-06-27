import { supabase } from "../lib/supabaseClient.js";
import { syncAchievementsForUser } from "./achievementEngine.js";

function jsonError(res, status, code, message, details = null) {
  return res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}

export async function getAchievements(req, res) {
  try {
    const db = req.supabase || supabase;
    const snapshot = await syncAchievementsForUser(db, req.userId);

    return res.json({
      latestAchievement: snapshot.latestAchievement,
      achievements: snapshot.achievements,
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "ACHIEVEMENTS_FAILED",
      error.message || "Failed to load achievements.",
    );
  }
}
