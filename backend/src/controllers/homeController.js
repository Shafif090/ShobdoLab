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

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function dateInTimezone(date, timezone = "UTC") {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

async function getExactCount(query) {
  const { count, error } = await query;
  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getHomeSummary(req, res) {
  try {
    const db = req.supabase || supabase;
    const now = new Date();

    const { data: userRow, error: userError } = await db
      .from("users")
      .select("streak_days, timezone")
      .eq("id", req.userId)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    const wordsLearnedTotal = await getExactCount(
      db
        .from("user_words")
        .select("word_id", { count: "exact", head: true })
        .eq("user_id", req.userId),
    );

    const timezone = userRow?.timezone || "UTC";
    const today = dateInTimezone(now, timezone);

    const { data: dailyStats, error: dailyStatsError } = await db
      .from("daily_user_stats")
      .select("learned_count, revised_count, exercise_count")
      .eq("user_id", req.userId)
      .eq("stat_date", today)
      .maybeSingle();

    if (dailyStatsError) {
      throw dailyStatsError;
    }

    const tomorrow = dateInTimezone(addDays(now, 1), timezone);
    const dayAfterTomorrow = dateInTimezone(addDays(now, 2), timezone);
    const dueTomorrowCount = await getExactCount(
      db
        .from("user_words")
        .select("word_id", { count: "exact", head: true })
        .eq("user_id", req.userId)
        .gte("next_review_at", `${tomorrow}T00:00:00.000Z`)
        .lt("next_review_at", `${dayAfterTomorrow}T00:00:00.000Z`),
    );

    const unreadNotifications = await getExactCount(
      db
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", req.userId)
        .eq("is_read", false),
    );

    const achievementSnapshot = await syncAchievementsForUser(db, req.userId);

    return res.json({
      streakDays: userRow?.streak_days ?? 0,
      wordsLearnedTotal,
      today: {
        learned: dailyStats?.learned_count ?? 0,
        revised: dailyStats?.revised_count ?? 0,
        exercise: dailyStats?.exercise_count ?? 0,
      },
      dueTomorrowCount,
      unreadNotifications,
      latestAchievement: achievementSnapshot.latestAchievement,
      achievements: achievementSnapshot.achievements,
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "HOME_SUMMARY_FAILED",
      error.message || "Failed to load home summary.",
    );
  }
}
