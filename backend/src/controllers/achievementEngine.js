const ACHIEVEMENT_SELECT =
  "id, code, title, description, target, metric_key, sort_order";

async function getExactCount(query) {
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

function sumRows(rows, key) {
  return (rows || []).reduce((total, row) => total + Number(row[key] || 0), 0);
}

function accuracyFor(session) {
  const total = Number(session.total_items || 0);
  if (total <= 0) return 0;
  return Number(session.correct_items || 0) / total;
}

function progressValue(rawValue, target) {
  return Math.max(0, Math.min(Number(rawValue) || 0, Number(target) || 1));
}

async function loadCatalog(db) {
  const { data, error } = await db
    .from("achievements")
    .select(ACHIEVEMENT_SELECT)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function loadAwardedMap(db, userId) {
  const { data, error } = await db
    .from("user_achievements")
    .select("achievement_id, awarded_at, achievements(code)")
    .eq("user_id", userId);

  if (error) throw error;

  return new Map(
    (data || []).flatMap((row) => {
      const achievement = Array.isArray(row.achievements)
        ? row.achievements[0]
        : row.achievements;
      return achievement?.code ? [[achievement.code, row]] : [];
    }),
  );
}

async function loadAchievementMetrics(db, userId) {
  const [
    userResult,
    wordsLearned,
    masteredWords,
    weakWordsTamed,
    dailyStatsResult,
    completedSessionsResult,
  ] = await Promise.all([
    db
      .from("users")
      .select("streak_days")
      .eq("id", userId)
      .maybeSingle(),
    getExactCount(
      db
        .from("user_words")
        .select("word_id", { count: "exact", head: true })
        .eq("user_id", userId),
    ),
    getExactCount(
      db
        .from("user_words")
        .select("word_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .or("status.eq.mastered,strength.gte.5"),
    ),
    getExactCount(
      db
        .from("user_words")
        .select("word_id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gt("mistakes", 0)
        .gte("strength", 3),
    ),
    db
      .from("daily_user_stats")
      .select("learned_count, revised_count, exercise_count")
      .eq("user_id", userId),
    db
      .from("quiz_sessions")
      .select(
        "source, mode, total_items, correct_items, incorrect_items, status",
      )
      .eq("user_id", userId)
      .eq("status", "completed"),
  ]);

  if (userResult.error) throw userResult.error;
  if (dailyStatsResult.error) throw dailyStatsResult.error;
  if (completedSessionsResult.error) throw completedSessionsResult.error;

  const dailyStats = dailyStatsResult.data || [];
  const sessions = completedSessionsResult.data || [];
  const answeredQuestions = sessions.reduce(
    (total, session) => total + Number(session.total_items || 0),
    0,
  );
  const correctAnswers = sessions.reduce(
    (total, session) => total + Number(session.correct_items || 0),
    0,
  );
  const precisionScholar =
    answeredQuestions >= 200 && correctAnswers / answeredQuestions >= 0.9
      ? 1
      : 0;

  return {
    words_learned: wordsLearned,
    mastered_words: masteredWords,
    streak_days: Number(userResult.data?.streak_days || 0),
    active_days: dailyStats.length,
    revised_total: sumRows(dailyStats, "revised_count"),
    weak_words_tamed: weakWordsTamed,
    exercise_sessions: sessions.filter(
      (session) => session.source === "exercise",
    ).length,
    sharp_exercise_sessions: sessions.filter(
      (session) => session.source === "exercise" && accuracyFor(session) >= 0.9,
    ).length,
    perfect_exercise_sessions: sessions.filter(
      (session) =>
        session.source === "exercise" &&
        Number(session.total_items || 0) > 0 &&
        Number(session.incorrect_items || 0) === 0,
    ).length,
    perfect_sessions: sessions.filter(
      (session) =>
        Number(session.total_items || 0) > 0 &&
        Number(session.incorrect_items || 0) === 0,
    ).length,
    mcq_sessions: sessions.filter((session) => session.mode === "mcq").length,
    answered_questions: answeredQuestions,
    precision_scholar: precisionScholar,
    steady_sessions: sessions.filter((session) => accuracyFor(session) >= 0.8)
      .length,
    daily_triple_days: dailyStats.filter(
      (stat) =>
        Number(stat.learned_count || 0) > 0 &&
        Number(stat.revised_count || 0) > 0 &&
        Number(stat.exercise_count || 0) > 0,
    ).length,
  };
}

async function awardEarnedAchievements(db, userId, catalog, awardedMap, metrics) {
  const rows = catalog
    .filter((achievement) => {
      const value = metrics[achievement.metric_key] ?? 0;
      return value >= achievement.target && !awardedMap.has(achievement.code);
    })
    .map((achievement) => ({
      user_id: userId,
      achievement_id: achievement.id,
    }));

  if (rows.length === 0) return;

  const { error } = await db
    .from("user_achievements")
    .upsert(rows, { onConflict: "user_id,achievement_id" });

  if (error) {
    console.warn("[achievements] Unable to persist awards:", error.message);
  }
}

function buildAchievementSnapshot(catalog, awardedMap, metrics) {
  return catalog
    .map((achievement) => {
      const award = awardedMap.get(achievement.code);
      const rawProgress = metrics[achievement.metric_key] ?? 0;
      const progress = progressValue(rawProgress, achievement.target);
      const earned = Boolean(award) || rawProgress >= achievement.target;

      return {
        code: achievement.code,
        title: achievement.title,
        description: achievement.description,
        earned,
        awardedAt: award?.awarded_at ?? null,
        progress,
        target: achievement.target,
        sortOrder: achievement.sort_order,
      };
    })
    .sort((left, right) => {
      if (left.earned !== right.earned) return left.earned ? -1 : 1;

      if (!left.earned && !right.earned) {
        const leftRatio = left.target > 0 ? left.progress / left.target : 0;
        const rightRatio = right.target > 0 ? right.progress / right.target : 0;
        if (rightRatio !== leftRatio) return rightRatio - leftRatio;
      }

      return left.sortOrder - right.sortOrder;
    })
    .map(({ sortOrder, ...achievement }) => achievement);
}

function latestAwardedAchievement(achievements) {
  const latest = achievements
    .filter((achievement) => achievement.earned)
    .sort((left, right) =>
      String(right.awardedAt ?? "").localeCompare(String(left.awardedAt ?? "")),
    )[0];

  return latest
    ? {
        title: latest.title,
        awardedAt: latest.awardedAt ?? new Date().toISOString(),
      }
    : null;
}

export async function syncAchievementsForUser(db, userId) {
  const [catalog, metrics] = await Promise.all([
    loadCatalog(db),
    loadAchievementMetrics(db, userId),
  ]);
  let awardedMap = await loadAwardedMap(db, userId);

  await awardEarnedAchievements(db, userId, catalog, awardedMap, metrics);
  awardedMap = await loadAwardedMap(db, userId);

  const achievements = buildAchievementSnapshot(catalog, awardedMap, metrics);

  return {
    metrics,
    achievements,
    latestAchievement: latestAwardedAchievement(achievements),
  };
}
