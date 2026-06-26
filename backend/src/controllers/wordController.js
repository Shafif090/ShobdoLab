import { supabase } from "../lib/supabaseClient.js";
import {
  createQuizSessionFromWords,
  getWordsByIds,
  normalizeQuizMode,
} from "./quizSessionBuilder.js";
import { nextReviewAtForStrength } from "./progressEngine.js";
import { formatAnswerList, getAcceptedAnswers } from "./quizResponse.js";

function jsonError(res, status, code, message, details = null) {
  return res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}

function progressPayload(row) {
  if (!row) {
    return null;
  }

  return {
    status: row.status,
    strength: row.strength,
    mistakes: row.mistakes,
    correctCount: row.correct_count,
    seenCount: row.seen_count,
    learnedAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    nextReviewAt: row.next_review_at,
    updatedAt: row.updated_at,
  };
}

function wordPayload(word, progress = null) {
  return {
    wordId: word.id,
    english: word.english,
    bangla: word.bangla ?? [],
    pos: word.pos ?? [],
    root: word.root ?? null,
    familyId: word.family_id ?? null,
    isActive: word.is_active,
    progress: progressPayload(progress),
    learned: Boolean(progress),
  };
}

function safeSearchTerm(value) {
  return String(value ?? "")
    .trim()
    .replace(/[%,()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

async function getProgressByWordId(db, userId, wordIds) {
  const ids = [...new Set(wordIds.filter(Boolean))];
  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await db
    .from("user_words")
    .select(
      "word_id, status, strength, mistakes, correct_count, seen_count, last_seen_at, next_review_at, created_at, updated_at",
    )
    .eq("user_id", userId)
    .in("word_id", ids);

  if (error) {
    throw error;
  }

  return new Map((data || []).map((row) => [row.word_id, row]));
}

async function getWordOrError(db, wordId) {
  const { data, error } = await db
    .from("words")
    .select("id, english, bangla, pos, root, family_id, is_active, created_at")
    .eq("id", wordId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

export async function searchWords(req, res) {
  try {
    const db = req.supabase || supabase;
    const queryText = safeSearchTerm(req.query.q);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 50));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = db
      .from("words")
      .select("id, english, bangla, pos, root, family_id, is_active, created_at", {
        count: "exact",
      })
      .eq("is_active", true);

    if (queryText) {
      const pattern = `%${queryText}%`;
      query = query.or(
        `english.ilike.${pattern},root.ilike.${pattern},family_id.ilike.${pattern}`,
      );
    }

    const { data, error, count } = await query
      .order("english", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const progressByWordId = await getProgressByWordId(
      db,
      req.userId,
      (data || []).map((word) => word.id),
    );
    const items = (data || []).map((word) =>
      wordPayload(word, progressByWordId.get(word.id) || null),
    );

    return res.json({
      items,
      query: queryText,
      page,
      limit,
      total: count ?? items.length,
      hasMore: to + 1 < (count ?? 0),
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "WORD_SEARCH_FAILED",
      error.message || "Failed to search words.",
    );
  }
}

export async function addWordToUser(req, res) {
  try {
    const db = req.supabase || supabase;
    const wordId = Number(req.params.wordId);

    if (!Number.isInteger(wordId) || wordId <= 0) {
      return jsonError(
        res,
        400,
        "INVALID_WORD_ID",
        "Word id must be a positive number.",
      );
    }

    const word = await getWordOrError(db, wordId);
    if (!word) {
      return jsonError(res, 404, "WORD_NOT_FOUND", "Word was not found.");
    }

    const { data: existingProgress, error: existingError } = await db
      .from("user_words")
      .select(
        "word_id, status, strength, mistakes, correct_count, seen_count, last_seen_at, next_review_at, created_at, updated_at",
      )
      .eq("user_id", req.userId)
      .eq("word_id", wordId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    let progress = existingProgress;

    if (!progress) {
      const now = new Date();
      const { data: insertedProgress, error: insertError } = await db
        .from("user_words")
        .insert({
          user_id: req.userId,
          word_id: wordId,
          status: "learning",
          strength: 0,
          mistakes: 0,
          correct_count: 0,
          seen_count: 0,
          last_seen_at: null,
          next_review_at: nextReviewAtForStrength(0, now),
          updated_at: now.toISOString(),
        })
        .select(
          "word_id, status, strength, mistakes, correct_count, seen_count, last_seen_at, next_review_at, created_at, updated_at",
        )
        .single();

      if (insertError) {
        throw insertError;
      }

      progress = insertedProgress;
    }

    return res.status(existingProgress ? 200 : 201).json({
      item: wordPayload(word, progress),
      added: !existingProgress,
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "ADD_WORD_FAILED",
      error.message || "Failed to add this word.",
    );
  }
}

export async function practiceWord(req, res) {
  try {
    const db = req.supabase || supabase;
    const wordId = Number(req.params.wordId);
    const mode = normalizeQuizMode(req.body?.mode, "mixed");

    if (!Number.isInteger(wordId) || wordId <= 0) {
      return jsonError(
        res,
        400,
        "INVALID_WORD_ID",
        "Word id must be a positive number.",
      );
    }

    const selectedWords = await getWordsByIds(db, [wordId]);
    if (selectedWords.length === 0) {
      return jsonError(res, 404, "WORD_NOT_FOUND", "Word was not found.");
    }

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
        "No words were available to practice.",
      );
    }

    return res.status(201).json({
      quizSessionId: createdSession.session.id,
      mode,
      totalItems: createdSession.session.total_items,
      session: createdSession.session,
      firstItem: createdSession.firstItem,
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "PRACTICE_WORD_FAILED",
      error.message || "Failed to start word practice.",
    );
  }
}

export async function getWordDetail(req, res) {
  try {
    const db = req.supabase || supabase;
    const wordId = Number(req.params.wordId);

    if (!Number.isInteger(wordId) || wordId <= 0) {
      return jsonError(
        res,
        400,
        "INVALID_WORD_ID",
        "Word id must be a positive number.",
      );
    }

    const [{ data: word, error: wordError }, { data: progress, error: progressError }] =
      await Promise.all([
        db
          .from("words")
          .select("id, english, bangla, pos, root, family_id, is_active, created_at")
          .eq("id", wordId)
          .maybeSingle(),
        db
          .from("user_words")
          .select(
            "status, strength, mistakes, correct_count, seen_count, last_seen_at, next_review_at, created_at, updated_at",
          )
          .eq("user_id", req.userId)
          .eq("word_id", wordId)
          .maybeSingle(),
      ]);

    if (wordError) {
      throw wordError;
    }

    if (progressError) {
      throw progressError;
    }

    if (!word) {
      return jsonError(res, 404, "WORD_NOT_FOUND", "Word was not found.");
    }

    const { data: attempts, error: attemptsError, count } = await db
      .from("quiz_attempts")
      .select(
        "id, session_id, quiz_item_id, word_id, user_answer, is_correct, response_time_ms, submitted_at, quiz_sessions!inner(user_id, source, mode), quiz_items(question_type, prompt_text, accepted_answers, sequence_no)",
        { count: "exact" },
      )
      .eq("word_id", wordId)
      .eq("quiz_sessions.user_id", req.userId)
      .order("submitted_at", { ascending: false })
      .limit(20);

    if (attemptsError) {
      throw attemptsError;
    }

    const recentAttempts = (attempts || []).map((attempt) => {
      const session = Array.isArray(attempt.quiz_sessions)
        ? attempt.quiz_sessions[0]
        : attempt.quiz_sessions;
      const item = Array.isArray(attempt.quiz_items)
        ? attempt.quiz_items[0]
        : attempt.quiz_items;

      return {
        id: attempt.id,
        sessionId: attempt.session_id,
        quizItemId: attempt.quiz_item_id,
        source: session?.source ?? null,
        mode: session?.mode ?? null,
        questionType: item?.question_type ?? null,
        promptText: item?.prompt_text ?? word.english,
        sequenceNo: item?.sequence_no ?? null,
        yourAnswer: attempt.user_answer,
        correctAnswer: formatAnswerList(item?.accepted_answers),
        correctAnswers: getAcceptedAnswers(item?.accepted_answers),
        isCorrect: attempt.is_correct,
        responseTimeMs: attempt.response_time_ms,
        submittedAt: attempt.submitted_at,
      };
    });

    const correctAttempts = recentAttempts.filter((attempt) => attempt.isCorrect).length;
    const totalAttempts = count ?? recentAttempts.length;
    const statsCorrect = progress?.correct_count ?? correctAttempts;
    const statsIncorrect = progress?.mistakes ?? Math.max(0, totalAttempts - correctAttempts);
    const statsSeen = progress?.seen_count ?? totalAttempts;

    return res.json({
      word: {
        wordId: word.id,
        english: word.english,
        bangla: word.bangla ?? [],
        pos: word.pos ?? [],
        root: word.root ?? null,
        familyId: word.family_id ?? null,
        isActive: word.is_active,
        createdAt: word.created_at,
      },
      progress: progressPayload(progress),
      stats: {
        totalAttempts: statsSeen,
        correctAttempts: statsCorrect,
        incorrectAttempts: statsIncorrect,
        accuracy:
          statsSeen > 0 ? Math.round((statsCorrect / statsSeen) * 100) : null,
        lastAttemptAt: recentAttempts[0]?.submittedAt ?? null,
      },
      recentAttempts,
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "WORD_DETAIL_FAILED",
      error.message || "Failed to load word detail.",
    );
  }
}
