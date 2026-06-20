export function progressPercent(currentIndex, totalItems) {
  if (!totalItems) return 0;
  return Math.floor((Number(currentIndex) / Number(totalItems)) * 100);
}

export function getAcceptedAnswers(value) {
  if (Array.isArray(value)) {
    return value.flat(Infinity).filter(Boolean);
  }

  return [value].filter(Boolean);
}

export function getCorrectAnswer(value) {
  return getAcceptedAnswers(value)[0] || "";
}

export function formatAnswerList(value) {
  return getAcceptedAnswers(value).join(", ");
}

export function toCamelSession(session) {
  if (!session) return null;

  return {
    id: session.id,
    mode: session.mode,
    source: session.source,
    sourceRefId: session.source_ref_id,
    currentIndex: session.current_index,
    totalItems: session.total_items,
    correctItems: session.correct_items,
    incorrectItems: session.incorrect_items,
    status: session.status,
    retryNo: session.retry_no,
    maxRetries: session.max_retries,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    durationMs: session.duration_ms,
    progressPercent: progressPercent(session.current_index, session.total_items),
  };
}

export function toQuestion(item) {
  if (!item) return null;

  return {
    quizItemId: item.id,
    wordId: item.word_id,
    questionType: item.question_type,
    promptDirection: item.prompt_direction,
    promptText: item.prompt_text,
    options: item.options,
    acceptedAnswers: getAcceptedAnswers(item.accepted_answers),
    sequenceNo: item.sequence_no,
  };
}

export function quizSessionPayload(session, currentItem, items = []) {
  return {
    session,
    sessionState: toCamelSession(session),
    question: toQuestion(currentItem),
    currentItem,
    totalItems: items.length || session?.total_items || 0,
    remainingItems: Math.max(
      0,
      (items.length || session?.total_items || 0) - (session?.current_index || 0),
    ),
  };
}

export function answerPayload({
  isCorrect,
  currentItem,
  updatedSession,
  nextItem,
}) {
  const correctAnswer = getCorrectAnswer(currentItem?.accepted_answers);
  const updated = {
    correctItems: updatedSession.correct_items,
    incorrectItems: updatedSession.incorrect_items,
    currentIndex: updatedSession.current_index,
    totalItems: updatedSession.total_items,
    progressPercent: progressPercent(
      updatedSession.current_index,
      updatedSession.total_items,
    ),
  };

  return {
    isCorrect,
    correct: isCorrect,
    correctAnswer,
    explanation: null,
    nextAvailable: Boolean(nextItem),
    updated,
    session: updatedSession,
    sessionState: toCamelSession(updatedSession),
    nextItem,
    nextQuestion: toQuestion(nextItem),
    completed: updatedSession.status === "completed",
  };
}
