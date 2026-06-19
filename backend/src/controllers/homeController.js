import { supabase } from "../lib/supabaseClient.js";

function jsonError(res, status, code, message, details = null) {
  return res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
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
    const today = todayDateString();

    const { data: userRow, error: userError } = await db
      .from("users")
      .select("streak_days")
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

    const { data: dailyStats, error: dailyStatsError } = await db
      .from("daily_user_stats")
      .select("learned_count, revised_count, exercise_count")
      .eq("user_id", req.userId)
      .eq("stat_date", today)
      .maybeSingle();

    if (dailyStatsError) {
      throw dailyStatsError;
    }

    const unreadNotifications = await getExactCount(
      db
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", req.userId)
        .eq("is_read", false),
    );

    let latestAchievement = null;
    const { data: achievementRows } = await db
      .from("user_achievements")
      .select("awarded_at, achievements(title)")
      .eq("user_id", req.userId)
      .order("awarded_at", { ascending: false })
      .limit(1);

    if (achievementRows?.[0]) {
      const achievement = Array.isArray(achievementRows[0].achievements)
        ? achievementRows[0].achievements[0]
        : achievementRows[0].achievements;

      latestAchievement = {
        title: achievement?.title ?? null,
        awardedAt: achievementRows[0].awarded_at,
      };
    }

    return res.json({
      streakDays: userRow?.streak_days ?? 0,
      wordsLearnedTotal,
      today: {
        learned: dailyStats?.learned_count ?? 0,
        revised: dailyStats?.revised_count ?? 0,
        exercise: dailyStats?.exercise_count ?? 0,
      },
      unreadNotifications,
      latestAchievement,
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
