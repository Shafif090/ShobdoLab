export const SESSION_SELECT =
  "id, user_id, source, source_ref_id, mode, total_items, current_index, correct_items, incorrect_items, status, retry_no, max_retries, started_at, ended_at, duration_ms";

function firstMeaning(word) {
  return Array.isArray(word?.bangla) ? word.bangla[0] : word?.bangla;
}

function meaningAt(word, seed = 0) {
  const meanings = Array.isArray(word?.bangla) ? word.bangla.filter(Boolean) : [];
  if (meanings.length === 0) {
    return word?.bangla || "";
  }

  return meanings[Math.abs(seed) % meanings.length];
}

export function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

export function hashValue(value) {
  const text = String(value ?? "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function seededShuffle(values, seed) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = hashValue(`${seed}:${index}`) % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function hasSharedPartOfSpeech(left, right) {
  const leftPos = new Set(Array.isArray(left?.pos) ? left.pos : []);
  const rightPos = Array.isArray(right?.pos) ? right.pos : [];
  return rightPos.some((part) => leftPos.has(part));
}

function buildMcqOptions(word, allWords, index) {
  const acceptedAnswers = Array.isArray(word?.bangla) ? word.bangla : [];
  const acceptedSet = new Set(acceptedAnswers.filter(Boolean));
  const seed = hashValue(`${word.id}:${index}`);
  const correctOption = meaningAt(word, seed);
  const candidates = allWords.filter((candidate) => {
    if (!candidate || candidate.id === word.id) return false;
    return !acceptedSet.has(firstMeaning(candidate));
  });
  const samePartOfSpeech = seededShuffle(
    candidates.filter((candidate) => hasSharedPartOfSpeech(word, candidate)),
    `${seed}:same-pos`,
  );
  const otherCandidates = seededShuffle(
    candidates.filter((candidate) => !hasSharedPartOfSpeech(word, candidate)),
    `${seed}:other`,
  );
  const distractorWords = [...samePartOfSpeech, ...otherCandidates];
  const distractors = [];

  for (const distractor of distractorWords) {
    const option = meaningAt(distractor, seed + distractors.length + 1);
    if (!option || acceptedSet.has(option) || distractors.includes(option)) {
      continue;
    }

    distractors.push(option);
    if (distractors.length === 3) {
      break;
    }
  }

  while (distractors.length < 3) {
    distractors.push(`Option ${distractors.length + 1}`);
  }

  return seededShuffle([correctOption, ...distractors], `${seed}:options`);
}

function getQuestionType(mode, index) {
  if (mode === "mixed") {
    return index % 2 === 0 ? "mcq" : "typing";
  }

  return mode;
}

export function normalizeQuizMode(mode, fallback = "mixed") {
  return ["mcq", "typing", "mixed"].includes(mode) ? mode : fallback;
}

export async function getWordsByIds(db, wordIds) {
  const orderedIds = uniqueValues(wordIds);
  if (orderedIds.length === 0) {
    return [];
  }

  const { data, error } = await db
    .from("words")
    .select("id, english, bangla, pos, root, family_id, is_active")
    .eq("is_active", true)
    .in("id", orderedIds);

  if (error) {
    throw error;
  }

  const byId = new Map((data || []).map((word) => [word.id, word]));
  return orderedIds.map((wordId) => byId.get(wordId)).filter(Boolean);
}

export async function getActiveWords(db, limit, excludedIds = []) {
  let query = db
    .from("words")
    .select("id, english, bangla, pos, root, family_id, is_active")
    .eq("is_active", true)
    .order("id", { ascending: true })
    .limit(limit);

  if (excludedIds.length > 0) {
    query = query.not("id", "in", `(${uniqueValues(excludedIds).join(",")})`);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data || [];
}

export async function fillWords(db, words, targetCount) {
  const selected = [...words];
  if (selected.length >= targetCount) {
    return selected.slice(0, targetCount);
  }

  const fallbackWords = await getActiveWords(
    db,
    targetCount - selected.length,
    selected.map((word) => word.id),
  );

  return [...selected, ...fallbackWords].slice(0, targetCount);
}

export async function createQuizSessionFromWords({
  db,
  userId,
  source,
  sourceRefId = null,
  mode = "mixed",
  words,
  retryNo = 0,
  maxRetries = 2,
}) {
  const normalizedMode = normalizeQuizMode(mode);
  const selectedWords = words.filter(Boolean);

  if (selectedWords.length === 0) {
    return null;
  }

  const optionWords = await getActiveWords(db, Math.max(80, selectedWords.length * 4));

  const { data: sessionRow, error: sessionError } = await db
    .from("quiz_sessions")
    .insert({
      user_id: userId,
      source,
      source_ref_id: sourceRefId,
      mode: normalizedMode,
      total_items: selectedWords.length,
      current_index: 0,
      correct_items: 0,
      incorrect_items: 0,
      status: "active",
      retry_no: retryNo,
      max_retries: maxRetries,
    })
    .select(SESSION_SELECT)
    .single();

  if (sessionError) {
    throw sessionError;
  }

  const quizItems = selectedWords.map((word, index) => {
    const questionType = getQuestionType(normalizedMode, index);

    return {
      session_id: sessionRow.id,
      word_id: word.id,
      question_type: questionType,
      prompt_direction: "en_to_bn",
      prompt_text: word.english,
      options:
        questionType === "mcq"
          ? buildMcqOptions(word, optionWords, index)
          : null,
      accepted_answers: word.bangla || [],
      sequence_no: index + 1,
    };
  });

  const { data: insertedItems, error: itemsError } = await db
    .from("quiz_items")
    .insert(quizItems)
    .select(
      "id, session_id, word_id, question_type, prompt_direction, prompt_text, options, accepted_answers, sequence_no",
    )
    .order("sequence_no", { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  const firstInsertedItem = insertedItems?.[0] || quizItems[0];

  return {
    session: sessionRow,
    firstItem: {
      id: firstInsertedItem.id,
      session_id: firstInsertedItem.session_id,
      word_id: firstInsertedItem.word_id,
      question_type: firstInsertedItem.question_type,
      prompt_direction: firstInsertedItem.prompt_direction,
      prompt_text: firstInsertedItem.prompt_text,
      options: firstInsertedItem.options,
      accepted_answers: firstInsertedItem.accepted_answers,
      sequence_no: firstInsertedItem.sequence_no,
    },
  };
}
