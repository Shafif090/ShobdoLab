const SRS_INTERVAL_DAYS = [1, 2, 4, 7, 14, 30];

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

function previousDateString(dateString) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return addDays(date, -1).toISOString().slice(0, 10);
}

export function statusForStrength(strength) {
  if (strength >= 5) return "mastered";
  if (strength >= 3) return "review";
  return "learning";
}

export function nextReviewAtForStrength(strength, now = new Date()) {
  const safeStrength = Math.max(0, Math.min(5, Number(strength) || 0));
  return addDays(now, SRS_INTERVAL_DAYS[safeStrength]).toISOString();
}

export function computeUserWordProgress(existingRow, isCorrect, now = new Date()) {
  const previousStrength = Number(existingRow?.strength ?? 0);
  const strength = isCorrect
    ? Math.min(5, previousStrength + 1)
    : Math.max(0, previousStrength - 1);

  return {
    status: statusForStrength(strength),
    strength,
    mistakes: Number(existingRow?.mistakes ?? 0) + (isCorrect ? 0 : 1),
    correct_count: Number(existingRow?.correct_count ?? 0) + (isCorrect ? 1 : 0),
    seen_count: Number(existingRow?.seen_count ?? 0) + 1,
    last_seen_at: now.toISOString(),
    next_review_at: nextReviewAtForStrength(strength, now),
  };
}

export async function getUserWordProgressRow(db, userId, wordId) {
  const { data, error } = await db
    .from("user_words")
    .select(
      "user_id, word_id, status, strength, mistakes, correct_count, seen_count, last_seen_at, next_review_at",
    )
    .eq("user_id", userId)
    .eq("word_id", wordId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function applyUserWordProgress({
  db,
  userId,
  wordId,
  existingRow,
  isCorrect,
  now = new Date(),
}) {
  const progress = computeUserWordProgress(existingRow, isCorrect, now);

  const { error } = await db.from("user_words").upsert(
    {
      user_id: userId,
      word_id: wordId,
      ...progress,
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id,word_id" },
  );

  if (error) {
    throw error;
  }

  return progress;
}

export async function recordDailyProgress({
  db,
  userId,
  source,
  isCorrect,
  now = new Date(),
}) {
  const { data: userRow, error: userError } = await db
    .from("users")
    .select("streak_days, last_active_date, timezone")
    .eq("id", userId)
    .maybeSingle();

  if (userError) {
    throw userError;
  }

  const timezone = userRow?.timezone || "UTC";
  const statDate = dateInTimezone(now, timezone);
  const previousDate = previousDateString(statDate);
  const activeColumn =
    source === "learn"
      ? "learned_count"
      : source === "revise"
        ? "revised_count"
        : "exercise_count";

  const { data: statRow, error: statError } = await db
    .from("daily_user_stats")
    .select(
      "user_id, stat_date, learned_count, revised_count, exercise_count, correct_count, incorrect_count",
    )
    .eq("user_id", userId)
    .eq("stat_date", statDate)
    .maybeSingle();

  if (statError) {
    throw statError;
  }

  const nextStats = {
    user_id: userId,
    stat_date: statDate,
    learned_count:
      Number(statRow?.learned_count ?? 0) + (activeColumn === "learned_count" ? 1 : 0),
    revised_count:
      Number(statRow?.revised_count ?? 0) + (activeColumn === "revised_count" ? 1 : 0),
    exercise_count:
      Number(statRow?.exercise_count ?? 0) + (activeColumn === "exercise_count" ? 1 : 0),
    correct_count: Number(statRow?.correct_count ?? 0) + (isCorrect ? 1 : 0),
    incorrect_count: Number(statRow?.incorrect_count ?? 0) + (isCorrect ? 0 : 1),
  };

  const { error: upsertError } = await db
    .from("daily_user_stats")
    .upsert(nextStats, { onConflict: "user_id,stat_date" });

  if (upsertError) {
    throw upsertError;
  }

  const lastActiveDate = userRow?.last_active_date || null;
  let streakDays = Number(userRow?.streak_days ?? 0);

  if (lastActiveDate !== statDate) {
    streakDays = lastActiveDate === previousDate ? streakDays + 1 : 1;

    const { error: userUpdateError } = await db
      .from("users")
      .update({
        streak_days: streakDays,
        last_active_date: statDate,
      })
      .eq("id", userId);

    if (userUpdateError) {
      throw userUpdateError;
    }
  }

  return {
    statDate,
    streakDays,
    stats: nextStats,
  };
}

export async function applyConservativeProgressForWords({
  db,
  userId,
  wordIds,
  now = new Date(),
}) {
  const uniqueWordIds = [...new Set(wordIds.filter(Boolean))];
  if (uniqueWordIds.length === 0) {
    return;
  }

  const rows = uniqueWordIds.map((wordId) => ({
    user_id: userId,
    word_id: wordId,
    status: "learning",
    strength: 1,
    last_seen_at: now.toISOString(),
    next_review_at: nextReviewAtForStrength(1, now),
    updated_at: now.toISOString(),
  }));

  const { error } = await db
    .from("user_words")
    .upsert(rows, { onConflict: "user_id,word_id" });

  if (error) {
    throw error;
  }
}
