import { supabase } from "../lib/supabaseClient.js";
import {
  createQuizSessionFromWords,
  getWordsByIds,
  hashValue,
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

export async function getLearnedWords(req, res) {
  try {
    const db = req.supabase || supabase;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 50));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await db
      .from("user_words")
      .select(
        "word_id, status, strength, mistakes, correct_count, seen_count, last_seen_at, next_review_at, created_at, words(id, english, bangla, pos, root, family_id)",
        { count: "exact" },
      )
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    const items = (data || []).map((row) => {
      const word = Array.isArray(row.words) ? row.words[0] : row.words;

      return {
        wordId: row.word_id,
        english: word?.english ?? "",
        bangla: word?.bangla ?? [],
        pos: word?.pos ?? [],
        root: word?.root ?? null,
        familyId: word?.family_id ?? null,
        status: row.status,
        strength: row.strength,
        mistakes: row.mistakes,
        correctCount: row.correct_count,
        seenCount: row.seen_count,
        learnedAt: row.created_at,
        lastSeenAt: row.last_seen_at,
        nextReviewAt: row.next_review_at,
      };
    });

    return res.json({
      items,
      page,
      limit,
      total: count ?? items.length,
      hasMore: to + 1 < (count ?? 0),
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "LEARNED_WORDS_FAILED",
      error.message || "Failed to load learned words.",
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
    query = query.lte("next_review_at", now);
  } else if (normalizedType === "weak") {
    query = query.or("strength.lte.2,mistakes.gte.3");
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const todaySeed = new Date().toISOString().slice(0, 10);
  const rows = [...(data || [])].sort((left, right) => {
    if (normalizedType === "all" || normalizedType === "recent") {
      const leftCreated = new Date(left.created_at || left.last_seen_at || 0).getTime();
      const rightCreated = new Date(right.created_at || right.last_seen_at || 0).getTime();
      return rightCreated - leftCreated;
    }

    if (left.mistakes !== right.mistakes) {
      return right.mistakes - left.mistakes;
    }

    const leftSeen = left.last_seen_at ? new Date(left.last_seen_at).getTime() : 0;
    const rightSeen = right.last_seen_at ? new Date(right.last_seen_at).getTime() : 0;
    if (leftSeen !== rightSeen) {
      return leftSeen - rightSeen;
    }

    return (
      hashValue(`${userId}:${todaySeed}:${left.word_id}`) -
      hashValue(`${userId}:${todaySeed}:${right.word_id}`)
    );
  });

  return rows.slice(0, limit || rows.length).map((row) => row.word_id);
}

export async function startReviseSession(req, res) {
  try {
    const db = req.supabase || supabase;
    const { type = "due", mode = "mixed", limit = null } = req.body || {};
    if (!["due", "weak"].includes(type)) {
      return jsonError(
        res,
        400,
        "INVALID_REVISE_TYPE",
        "Only due and weak words can start a revise quiz. Use /v1/revise/words for learned word history.",
      );
    }

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
