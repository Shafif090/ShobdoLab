import { supabase } from "../lib/supabaseClient.js";
import {
  createQuizSessionFromWords,
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

async function getExactCount(query) {
  const { count, error } = await query;
  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getReviseSummary(req, res) {
  try {
    const db = req.supabase || supabase;
    const now = new Date().toISOString();

    const [dueTodayCount, weakWordsCount, recentWordsCount] =
      await Promise.all([
        getExactCount(
          db
            .from("user_words")
            .select("word_id", { count: "exact", head: true })
            .eq("user_id", req.userId)
            .lte("next_review_at", now),
        ),
        getExactCount(
          db
            .from("user_words")
            .select("word_id", { count: "exact", head: true })
            .eq("user_id", req.userId)
            .or("strength.lte.2,mistakes.gte.3"),
        ),
        getExactCount(
          db
            .from("user_words")
            .select("word_id", { count: "exact", head: true })
            .eq("user_id", req.userId),
        ),
      ]);

    return res.json({
      dueTodayCount,
      weakWordsCount,
      recentWordsCount,
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "REVISE_SUMMARY_FAILED",
      error.message || "Failed to load revise summary.",
    );
  }
}

async function getReviseWordIds(db, userId, type, limit = null) {
  const normalizedType = ["due", "weak", "recent", "all"].includes(type)
    ? type
    : "due";
  const now = new Date().toISOString();

  let query = db
    .from("user_words")
    .select("word_id, strength, mistakes, last_seen_at, next_review_at, created_at")
    .eq("user_id", userId);

  if (normalizedType === "due") {
    query = query
      .lte("next_review_at", now)
      .order("strength", { ascending: true })
      .order("mistakes", { ascending: false })
      .order("last_seen_at", { ascending: true, nullsFirst: true });
  } else if (normalizedType === "weak") {
    query = query
      .or("strength.lte.2,mistakes.gte.3")
      .order("strength", { ascending: true })
      .order("mistakes", { ascending: false })
      .order("last_seen_at", { ascending: true, nullsFirst: true });
  } else {
    query = query
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data || []).map((row) => row.word_id);
}

export async function startReviseSession(req, res) {
  try {
    const db = req.supabase || supabase;
    const { type = "due", mode = "mixed", limit = null } = req.body || {};
    const targetLimit = limit
      ? Math.max(1, Math.min(Number(limit) || 50, 500))
      : null;

    const wordIds = await getReviseWordIds(db, req.userId, type, targetLimit);
    const selectedWords = await getWordsByIds(db, wordIds);

    const createdSession = await createQuizSessionFromWords({
      db,
      userId: req.userId,
      source: "revise",
      mode: normalizeQuizMode(mode),
      words: selectedWords,
    });

    if (!createdSession) {
      return jsonError(
        res,
        404,
        "NO_WORDS_AVAILABLE",
        "No words were available to revise.",
      );
    }

    return res.status(201).json({
      quizSessionId: createdSession.session.id,
      totalItems: createdSession.session.total_items,
      estimatedMinutes: `${Math.max(
        1,
        Math.ceil(createdSession.session.total_items / 4),
      )}-${Math.max(2, Math.ceil(createdSession.session.total_items / 2))}`,
      session: createdSession.session,
      firstItem: createdSession.firstItem,
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "START_REVISE_FAILED",
      error.message || "Failed to start revision.",
    );
  }
}
