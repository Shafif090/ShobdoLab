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

function normalizeAnswer(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, "")
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

async function getCurrentQuizItem(db, session) {
  const items = await getSessionItems(db, session.id);
  const currentItem = items[session.current_index] || null;
  return { items, currentItem };
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

    return res.json({
      session,
      currentItem,
      totalItems: items.length,
      remainingItems: Math.max(0, items.length - session.current_index),
    });
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
    const { userAnswer, responseTimeMs } = req.body || {};

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

    const wasCorrect = isCorrectAnswer(
      userAnswer,
      currentItem.accepted_answers,
    );

    const { data: progressRows, error: progressError } = await db.rpc(
      "record_quiz_answer",
      {
        p_user_id: req.userId,
        p_session_id: session.id,
        p_quiz_item_id: currentItem.id,
        p_word_id: currentItem.word_id,
        p_user_answer: userAnswer ?? null,
        p_is_correct: wasCorrect,
        p_response_time_ms: responseTimeMs ?? null,
      },
    );

    if (progressError) {
      const errorMessage =
        progressError.message || "Failed to submit quiz answer.";
      const status = errorMessage.includes("already been answered")
        ? 409
        : errorMessage.includes("not found")
          ? 404
          : errorMessage.includes("not active")
            ? 400
            : 500;

      return jsonError(res, status, "ANSWER_FAILED", errorMessage);
    }

    const updatedSession = progressRows?.[0]
      ? {
          id: progressRows[0].session_id,
          user_id: req.userId,
          source: session.source,
          source_ref_id: session.source_ref_id,
          mode: session.mode,
          total_items: progressRows[0].total_items,
          current_index: progressRows[0].current_index,
          correct_items: progressRows[0].correct_items,
          incorrect_items: progressRows[0].incorrect_items,
          status: progressRows[0].status,
          retry_no: session.retry_no,
          max_retries: session.max_retries,
          started_at: progressRows[0].started_at,
          ended_at: progressRows[0].ended_at,
          duration_ms: progressRows[0].duration_ms,
        }
      : await getSession(db, req.userId, session.id);

    const nextItem = items[updatedSession.current_index] || null;

    return res.json({
      correct: wasCorrect,
      session: updatedSession,
      nextItem,
      completed: updatedSession.status === "completed",
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "ANSWER_FAILED",
      error.message || "Failed to submit quiz answer.",
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
      if (session.source === "learn" && session.source_ref_id) {
        await db
          .from("learning_sets")
          .update({ state: "completed" })
          .eq("id", session.source_ref_id)
          .eq("user_id", req.userId);
      }

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

    if (session.source === "learn" && session.source_ref_id) {
      await db
        .from("learning_sets")
        .update({ state: "completed" })
        .eq("id", session.source_ref_id)
        .eq("user_id", req.userId);
    }

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
    const accuracy =
      session.total_items > 0 ? session.correct_items / session.total_items : 0;

    return res.json({
      session,
      attempts,
      summary: {
        totalItems: session.total_items,
        correctItems: session.correct_items,
        incorrectItems: session.incorrect_items,
        accuracy,
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
