import { supabase } from "../lib/supabaseClient.js";
import {
  createQuizSessionFromWords,
  fillWords,
  getWordsByIds,
} from "./quizSessionBuilder.js";
import {
  applyConservativeProgressForWords,
  applyUserWordProgress,
  getUserWordProgressRow,
  recordDailyProgress,
} from "./progressEngine.js";
import {
  answerPayload,
  formatAnswerList,
  getCorrectAnswer,
  progressPercent,
  quizSessionPayload,
} from "./quizResponse.js";

const LEARN_SET_PASS_PERCENT = 75;

function jsonError(res, status, code, message, details = null) {
  return res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}

function normalizeAnswer(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\s\p{P}\p{S}]+$/gu, "")
    .toLowerCase();
}

function isCorrectAnswer(userAnswer, acceptedAnswers) {
  const normalizedUserAnswer = normalizeAnswer(userAnswer);
  const flattenedAnswers = Array.isArray(acceptedAnswers)
    ? acceptedAnswers.flat(Infinity)
    : [acceptedAnswers];

  return flattenedAnswers.some(
    (answer) => normalizeAnswer(answer) === normalizedUserAnswer,
  );
}

async function getSession(db, userId, sessionId) {
  const { data, error } = await db
    .from("quiz_sessions")
    .select(
      "id, user_id, source, source_ref_id, mode, total_items, current_index, correct_items, incorrect_items, status, retry_no, max_retries, started_at, ended_at, duration_ms",
    )
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function getSessionItems(db, sessionId) {
  const { data, error } = await db
    .from("quiz_items")
    .select(
      "id, session_id, word_id, question_type, prompt_direction, prompt_text, options, accepted_answers, sequence_no",
    )
    .eq("session_id", sessionId)
    .order("sequence_no", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function getSessionAttempts(db, sessionId) {
  const { data, error } = await db
    .from("quiz_attempts")
    .select(
      "id, session_id, quiz_item_id, word_id, user_answer, is_correct, response_time_ms, submitted_at",
    )
    .eq("session_id", sessionId)
    .order("submitted_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

function isNextSetGateSession(session) {
  return (
    session?.source === "learn" &&
    session?.mode === "mcq" &&
    Boolean(session?.source_ref_id)
  );
}

function normalizeResponseTimeMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.min(Math.round(parsed), 24 * 60 * 60 * 1000);
}

function sumAttemptResponseTimes(attempts) {
  return (attempts || []).reduce((total, attempt) => {
    const responseTime = Number(attempt.response_time_ms);
    return Number.isFinite(responseTime) && responseTime > 0
      ? total + responseTime
      : total;
  }, 0);
}

async function getCurrentQuizItem(db, session) {
  const items = await getSessionItems(db, session.id);
  const currentItem = items[session.current_index] || null;
  return { items, currentItem };
}

async function maybeCompleteLearnSet(db, userId, session) {
  if (session.source !== "learn" || !session.source_ref_id) {
    return;
  }

  const scorePercent =
    session.total_items > 0
      ? Math.round((session.correct_items / session.total_items) * 100)
      : 0;
  const shouldComplete = scorePercent >= LEARN_SET_PASS_PERCENT;

  if (!shouldComplete) {
    return;
  }

  await db
    .from("learning_sets")
    .update({ state: "completed" })
    .eq("id", session.source_ref_id)
    .eq("user_id", userId);
}

export async function getQuizSession(req, res) {
  try {
    const db = req.supabase || supabase;
    const session = await getSession(db, req.userId, req.params.sessionId);

    if (!session) {
      return jsonError(
        res,
        404,
        "SESSION_NOT_FOUND",
        "Quiz session not found for this user.",
      );
    }

    const { items, currentItem } = await getCurrentQuizItem(db, session);

    return res.json(quizSessionPayload(session, currentItem, items));
  } catch (error) {
    return jsonError(
      res,
      500,
      "GET_SESSION_FAILED",
      error.message || "Failed to load quiz session.",
    );
  }
}

export async function submitQuizAnswer(req, res) {
  try {
    const db = req.supabase || supabase;
    const { sessionId } = req.params;
    const {
      userAnswer,
      answer = userAnswer,
      quizItemId,
      responseTimeMs,
    } = req.body || {};

    const session = await getSession(db, req.userId, sessionId);
    if (!session) {
      return jsonError(
        res,
        404,
        "SESSION_NOT_FOUND",
        "Quiz session not found for this user.",
      );
    }

    if (session.status !== "active") {
      return jsonError(
        res,
        400,
        "SESSION_NOT_ACTIVE",
        "This quiz session is not active anymore.",
      );
    }

    const items = await getSessionItems(db, session.id);
    const currentItem = items[session.current_index];

    if (!currentItem) {
      return jsonError(
        res,
        400,
        "SESSION_COMPLETE",
        "There is no current question to answer.",
      );
    }

    if (quizItemId && quizItemId !== currentItem.id) {
      return jsonError(
        res,
        409,
        "QUIZ_ITEM_OUT_OF_SYNC",
        "The submitted quiz item does not match the current session item.",
      );
    }

    const { data: existingAttempt, error: attemptLookupError } = await db
      .from("quiz_attempts")
      .select("id")
      .eq("session_id", session.id)
      .eq("quiz_item_id", currentItem.id)
      .maybeSingle();

    if (attemptLookupError) {
      throw attemptLookupError;
    }

    if (existingAttempt) {
      return jsonError(
        res,
        409,
        "ALREADY_ANSWERED",
        "This quiz item has already been answered.",
      );
    }

    const wasCorrect = isCorrectAnswer(answer, currentItem.accepted_answers);
    const answerResponseTimeMs = normalizeResponseTimeMs(responseTimeMs);
    const now = new Date();

    const { error: attemptError } = await db.from("quiz_attempts").insert({
      session_id: session.id,
      quiz_item_id: currentItem.id,
      word_id: currentItem.word_id,
      user_answer: answer ?? null,
      is_correct: wasCorrect,
      response_time_ms: answerResponseTimeMs,
      submitted_at: now.toISOString(),
    });

    if (attemptError) {
      const isDuplicate = attemptError.code === "23505";
      return jsonError(
        res,
        isDuplicate ? 409 : 500,
        isDuplicate ? "ALREADY_ANSWERED" : "ANSWER_FAILED",
        isDuplicate
          ? "This quiz item has already been answered."
          : attemptError.message || "Failed to record the quiz attempt.",
      );
    }

    const existingUserWord = await getUserWordProgressRow(
      db,
      req.userId,
      currentItem.word_id,
    );
    await applyUserWordProgress({
      db,
      userId: req.userId,
      wordId: currentItem.word_id,
      existingRow: existingUserWord,
      isCorrect: wasCorrect,
      now,
    });
    await recordDailyProgress({
      db,
      userId: req.userId,
      source: session.source,
      isCorrect: wasCorrect,
      now,
    });

    const nextCurrentIndex = session.current_index + 1;
    const completed = nextCurrentIndex >= session.total_items;
    const endedAt = completed ? now.toISOString() : session.ended_at;
    const serverDurationMs = completed
      ? Math.max(0, now.getTime() - new Date(session.started_at).getTime())
      : session.duration_ms;
    let durationMs = serverDurationMs;

    if (completed) {
      const attemptsForDuration = await getSessionAttempts(db, session.id);
      const clientDurationMs = sumAttemptResponseTimes(attemptsForDuration);
      durationMs = Math.max(serverDurationMs || 0, clientDurationMs);
    }

    const { data: updatedSession, error: sessionUpdateError } = await db
      .from("quiz_sessions")
      .update({
        current_index: nextCurrentIndex,
        correct_items: session.correct_items + (wasCorrect ? 1 : 0),
        incorrect_items: session.incorrect_items + (wasCorrect ? 0 : 1),
        status: completed ? "completed" : "active",
        ended_at: endedAt,
        duration_ms: durationMs,
      })
      .eq("id", session.id)
      .eq("user_id", req.userId)
      .select(
        "id, user_id, source, source_ref_id, mode, total_items, current_index, correct_items, incorrect_items, status, retry_no, max_retries, started_at, ended_at, duration_ms",
      )
      .single();

    if (sessionUpdateError) {
      throw sessionUpdateError;
    }

    if (completed) {
      await maybeCompleteLearnSet(db, req.userId, updatedSession);
    }

    const nextItem = items[updatedSession.current_index] || null;

    return res.json(
      answerPayload({
        isCorrect: wasCorrect,
        currentItem,
        updatedSession,
        nextItem,
      }),
    );
  } catch (error) {
    return jsonError(
      res,
      500,
      "ANSWER_FAILED",
      error.message || "Failed to submit quiz answer.",
    );
  }
}

export async function getNextQuizItem(req, res) {
  try {
    const db = req.supabase || supabase;
    const session = await getSession(db, req.userId, req.params.sessionId);

    if (!session) {
      return jsonError(
        res,
        404,
        "SESSION_NOT_FOUND",
        "Quiz session not found for this user.",
      );
    }

    const { items, currentItem } = await getCurrentQuizItem(db, session);

    return res.json(quizSessionPayload(session, currentItem, items));
  } catch (error) {
    return jsonError(
      res,
      500,
      "NEXT_ITEM_FAILED",
      error.message || "Failed to load the next quiz item.",
    );
  }
}

export async function finishQuizSession(req, res) {
  try {
    const db = req.supabase || supabase;
    const session = await getSession(db, req.userId, req.params.sessionId);

    if (!session) {
      return jsonError(
        res,
        404,
        "SESSION_NOT_FOUND",
        "Quiz session not found for this user.",
      );
    }

    if (session.status === "completed") {
      await maybeCompleteLearnSet(db, req.userId, session);

      return res.json({ session });
    }

    const endedAt = new Date().toISOString();
    const durationMs = Math.max(
      0,
      new Date(endedAt).getTime() - new Date(session.started_at).getTime(),
    );

    const { data, error } = await db
      .from("quiz_sessions")
      .update({
        status: "completed",
        ended_at: endedAt,
        duration_ms: durationMs,
      })
      .eq("id", session.id)
      .select(
        "id, user_id, source, source_ref_id, mode, total_items, current_index, correct_items, incorrect_items, status, retry_no, max_retries, started_at, ended_at, duration_ms",
      )
      .single();

    if (error) {
      throw error;
    }

    await maybeCompleteLearnSet(db, req.userId, data);

    return res.json({ session: data });
  } catch (error) {
    return jsonError(
      res,
      500,
      "FINISH_FAILED",
      error.message || "Failed to finish quiz session.",
    );
  }
}

export async function getQuizResult(req, res) {
  try {
    const db = req.supabase || supabase;
    const session = await getSession(db, req.userId, req.params.sessionId);

    if (!session) {
      return jsonError(
        res,
        404,
        "SESSION_NOT_FOUND",
        "Quiz session not found for this user.",
      );
    }

    const attempts = await getSessionAttempts(db, session.id);
    const items = await getSessionItems(db, session.id);
    const itemById = new Map(items.map((item) => [item.id, item]));
    const attemptByItemId = new Map(
      attempts.map((attempt) => [attempt.quiz_item_id, attempt]),
    );
    const wordIds = [...new Set(items.map((item) => item.word_id))];
    const words = await getWordsByIds(db, wordIds);
    const wordById = new Map(words.map((word) => [word.id, word]));
    const accuracy =
      session.total_items > 0 ? session.correct_items / session.total_items : 0;
    const scorePercent = Math.round(accuracy * 100);
    const incorrectItems = attempts
      .filter((attempt) => !attempt.is_correct)
      .map((attempt) => {
        const item = itemById.get(attempt.quiz_item_id);
        const word = wordById.get(attempt.word_id);

        return {
          wordId: attempt.word_id,
          word: word?.english ?? item?.prompt_text ?? String(attempt.word_id),
          yourAnswer: attempt.user_answer,
          correctAnswer: formatAnswerList(item?.accepted_answers),
          correctAnswers: Array.isArray(item?.accepted_answers)
            ? item.accepted_answers.flat(Infinity)
            : [item?.accepted_answers].filter(Boolean),
        };
      });
    const breakdown = items.map((item) => {
      const attempt = attemptByItemId.get(item.id);
      const word = wordById.get(item.word_id);

      return {
        quizItemId: item.id,
        wordId: item.word_id,
        word: word?.english ?? item.prompt_text ?? String(item.word_id),
        questionType: item.question_type,
        sequenceNo: item.sequence_no,
        promptText: item.prompt_text,
        yourAnswer: attempt?.user_answer ?? null,
        correctAnswer: formatAnswerList(item.accepted_answers),
        correctAnswers: Array.isArray(item.accepted_answers)
          ? item.accepted_answers.flat(Infinity)
          : [item.accepted_answers].filter(Boolean),
        isCorrect: Boolean(attempt?.is_correct),
        answered: Boolean(attempt),
      };
    });

    const durationSec = session.duration_ms
      ? Math.round(session.duration_ms / 1000)
      : 0;
    const nextSetGate = isNextSetGateSession(session)
      ? {
          passed: scorePercent >= LEARN_SET_PASS_PERCENT,
          passPercent: LEARN_SET_PASS_PERCENT,
          statusText:
            scorePercent >= LEARN_SET_PASS_PERCENT
              ? "Next set unlocked"
              : `Score ${LEARN_SET_PASS_PERCENT}% to unlock`,
        }
      : null;
    const canRetry =
      session.status === "completed" &&
      session.retry_no < session.max_retries &&
      (session.source !== "learn" || scorePercent < LEARN_SET_PASS_PERCENT);

    return res.json({
      sessionId: session.id,
      scorePercent,
      correct: session.correct_items,
      incorrect: session.incorrect_items,
      durationSec,
      session,
      attempts,
      summary: {
        totalItems: session.total_items,
        correctItems: session.correct_items,
        incorrectItems: session.incorrect_items,
        accuracy,
        scorePercent,
        durationSec,
      },
      incorrectItems,
      breakdown,
      nextSetGate,
      canRetry,
      retryAction: {
        endpoint: `/v1/quiz/${session.id}/retry`,
        maxRetries: session.max_retries,
        retryNo: session.retry_no,
      },
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "RESULT_FAILED",
      error.message || "Failed to load quiz result.",
    );
  }
}

export async function retryQuizSession(req, res) {
  try {
    const db = req.supabase || supabase;
    const session = await getSession(db, req.userId, req.params.sessionId);

    if (!session) {
      return jsonError(
        res,
        404,
        "SESSION_NOT_FOUND",
        "Quiz session not found for this user.",
      );
    }

    if (session.retry_no >= session.max_retries) {
      if (session.source === "learn" && session.source_ref_id) {
        const attempts = await getSessionAttempts(db, session.id);
        await applyConservativeProgressForWords({
          db,
          userId: req.userId,
          wordIds: attempts
            .filter((attempt) => !attempt.is_correct)
            .map((attempt) => attempt.word_id),
        });
      }

      return jsonError(
        res,
        409,
        "RETRY_LIMIT_REACHED",
        "This quiz session has no retries left.",
      );
    }

    const attempts = await getSessionAttempts(db, session.id);
    if (attempts.length === 0) {
      return jsonError(
        res,
        400,
        "NO_ATTEMPTS_TO_RETRY",
        "Answer at least one item before retrying this session.",
      );
    }

    if (session.source === "learn") {
      const scorePercent =
        session.total_items > 0
          ? Math.round((session.correct_items / session.total_items) * 100)
          : 0;

      if (scorePercent >= LEARN_SET_PASS_PERCENT) {
        await maybeCompleteLearnSet(db, req.userId, session);
        return jsonError(
          res,
          409,
          "RETRY_NOT_NEEDED",
          "This learning set already passed the retry threshold.",
        );
      }
    }

    const incorrectWordIds = attempts
      .filter((attempt) => !attempt.is_correct)
      .map((attempt) => attempt.word_id);
    const correctWordIds = attempts
      .filter((attempt) => attempt.is_correct)
      .map((attempt) => attempt.word_id);

    const targetCount = session.total_items;
    const incorrectTarget = Math.ceil(targetCount * 0.7);
    const correctTarget = targetCount - incorrectTarget;
    const selectedWordIds = [
      ...incorrectWordIds.slice(0, incorrectTarget),
      ...correctWordIds.slice(0, correctTarget),
      ...incorrectWordIds,
      ...correctWordIds,
    ];

    const uniqueWordIds = [...new Set(selectedWordIds)].slice(0, targetCount);
    const selectedWords = await fillWords(
      db,
      await getWordsByIds(db, uniqueWordIds),
      targetCount,
    );

    const createdSession = await createQuizSessionFromWords({
      db,
      userId: req.userId,
      source: session.source,
      sourceRefId: session.source_ref_id,
      mode: session.mode,
      words: selectedWords,
      retryNo: session.retry_no + 1,
      maxRetries: session.max_retries,
    });

    if (!createdSession) {
      return jsonError(
        res,
        404,
        "NO_WORDS_AVAILABLE",
        "No words were available for retry.",
      );
    }

    return res.status(201).json({
      newSessionId: createdSession.session.id,
      retryNo: createdSession.session.retry_no,
      totalItems: createdSession.session.total_items,
      session: createdSession.session,
      firstItem: createdSession.firstItem,
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "RETRY_FAILED",
      error.message || "Failed to retry quiz session.",
    );
  }
}
