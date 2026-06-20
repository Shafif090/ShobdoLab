import { supabase } from "../lib/supabaseClient.js";
import {
  createQuizSessionFromWords,
  fillWords,
  getActiveWords,
  getWordsByIds,
  normalizeQuizMode,
} from "./quizSessionBuilder.js";

function jsonError(res, status, code, message, details = null) {
  return res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}

const modes = {
  mcq: { estimated: "3-5 mins", items: 10 },
  mixed: { estimated: "4-6 mins", items: 10 },
  typing: { estimated: "5-8 mins", items: 10 },
};

export async function getExerciseMeta(req, res) {
  try {
    const db = req.supabase || supabase;

    const { data: latestSession, error } = await db
      .from("quiz_sessions")
      .select("correct_items, total_items")
      .eq("user_id", req.userId)
      .eq("source", "exercise")
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const lastSessionAccuracy =
      latestSession?.total_items > 0
        ? Math.round(
            (latestSession.correct_items / latestSession.total_items) * 100,
          )
        : null;

    return res.json({
      modes,
      lastSessionAccuracy,
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "EXERCISE_META_FAILED",
      error.message || "Failed to load exercise metadata.",
    );
  }
}

async function getUserWordIds(db, userId, category, limit) {
  const now = new Date().toISOString();
  let query = db
    .from("user_words")
    .select("word_id, strength, mistakes, last_seen_at, next_review_at")
    .eq("user_id", userId)
    .limit(limit);

  if (category === "weak") {
    query = query
      .or("strength.lte.2,mistakes.gte.3")
      .order("mistakes", { ascending: false })
      .order("last_seen_at", { ascending: true, nullsFirst: true });
  } else if (category === "due") {
    query = query
      .lte("next_review_at", now)
      .order("mistakes", { ascending: false })
      .order("last_seen_at", { ascending: true, nullsFirst: true });
  } else {
    query = query.order("last_seen_at", {
      ascending: false,
      nullsFirst: false,
    });
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data || []).map((row) => row.word_id);
}

async function getAnyLearnedWordIds(db, userId, excludedIds, limit) {
  const excluded = new Set(excludedIds);
  const { data, error } = await db
    .from("user_words")
    .select("word_id, mistakes, last_seen_at, created_at")
    .eq("user_id", userId)
    .order("mistakes", { ascending: false })
    .order("last_seen_at", { ascending: true, nullsFirst: true })
    .limit(Math.max(limit * 3, limit));

  if (error) {
    throw error;
  }

  return (data || [])
    .map((row) => row.word_id)
    .filter((wordId) => !excluded.has(wordId))
    .slice(0, limit);
}

function mergeUniqueIds(groups, targetCount) {
  const selected = [];
  const seen = new Set();

  for (const group of groups) {
    for (const wordId of group) {
      if (seen.has(wordId)) continue;
      seen.add(wordId);
      selected.push(wordId);
      if (selected.length >= targetCount) {
        return selected;
      }
    }
  }

  return selected;
}

async function selectExerciseWords(db, userId, targetCount) {
  const weakTarget = Math.ceil(targetCount * 0.5);
  const dueTarget = Math.ceil(targetCount * 0.3);
  const otherTarget = Math.max(1, targetCount - weakTarget - dueTarget);

  const [weakIds, dueIds, otherIds] = await Promise.all([
    getUserWordIds(db, userId, "weak", weakTarget),
    getUserWordIds(db, userId, "due", dueTarget),
    getUserWordIds(db, userId, "other", otherTarget),
  ]);

  let mergedIds = mergeUniqueIds([weakIds, dueIds, otherIds], targetCount);

  if (mergedIds.length < targetCount) {
    const fallbackLearnedIds = await getAnyLearnedWordIds(
      db,
      userId,
      mergedIds,
      targetCount - mergedIds.length,
    );
    mergedIds = mergeUniqueIds([mergedIds, fallbackLearnedIds], targetCount);
  }

  const learnedWords = await getWordsByIds(db, mergedIds);
  if (learnedWords.length > 0) {
    return fillWords(db, learnedWords, targetCount);
  }

  return getActiveWords(db, targetCount);
}

export async function startExerciseSession(req, res) {
  try {
    const db = req.supabase || supabase;
    const mode = normalizeQuizMode(req.body?.mode, "mixed");
    const targetCount = modes[mode]?.items ?? modes.mixed.items;
    const selectedWords = await selectExerciseWords(db, req.userId, targetCount);

    const createdSession = await createQuizSessionFromWords({
      db,
      userId: req.userId,
      source: "exercise",
      mode,
      words: selectedWords,
    });

    if (!createdSession) {
      return jsonError(
        res,
        404,
        "NO_WORDS_AVAILABLE",
        "No words were available to start an exercise.",
      );
    }

    return res.status(201).json({
      quizSessionId: createdSession.session.id,
      mode: createdSession.session.mode,
      totalItems: createdSession.session.total_items,
      session: createdSession.session,
      firstItem: createdSession.firstItem,
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "START_EXERCISE_FAILED",
      error.message || "Failed to start exercise.",
    );
  }
}
