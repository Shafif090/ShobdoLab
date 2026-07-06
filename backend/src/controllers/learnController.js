import { randomInt } from "node:crypto";
import { supabase } from "../lib/supabaseClient.js";
import { nextReviewAtForStrength } from "./progressEngine.js";
import {
  createQuizSessionFromWords,
  getWordsByIds,
} from "./quizSessionBuilder.js";

const MIN_LEARNING_SET_SIZE = 10;
const LEARN_SET_PASS_PERCENT = 75;
const WORD_PAGE_SIZE = 1000;
const SET_EXPIRES_IN_DAYS = 7;

function jsonError(res, status, code, message, details = null) {
  return res.status(status).json({
    error: {
      code,
      message,
      details,
    },
  });
}

function addDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

async function getLatestSetIndex(db, userId) {
  const { data, error } = await db
    .from("learning_sets")
    .select("set_index")
    .eq("user_id", userId)
    .order("set_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.set_index ?? 0;
}

async function getActiveLearningSet(db, userId) {
  const { data, error } = await db
    .from("learning_sets")
    .select(
      "id, user_id, source, set_index, total_words, state, generated_at, expires_at",
    )
    .eq("user_id", userId)
    .in("state", ["ready", "in_quiz"])
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function getLearningSetWithItems(db, setRow) {
  const { data: items, error: itemsError } = await db
    .from("learning_set_items")
    .select("set_id, word_id, sequence_no, family_id")
    .eq("set_id", setRow.id)
    .order("sequence_no", { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  const wordIds = items.map((item) => item.word_id);
  const { data: words, error: wordsError } = await db
    .from("words")
    .select("id, english, bangla, pos, root, family_id, is_active")
    .in("id", wordIds);

  if (wordsError) {
    throw wordsError;
  }

  const wordById = new Map(words.map((word) => [word.id, word]));

  return {
    ...setRow,
    items: items.map((item) => ({
      sequenceNo: item.sequence_no,
      familyId: item.family_id,
      word: wordById.get(item.word_id) || null,
    })),
  };
}

async function loadActiveWords(db) {
  const words = [];
  let from = 0;

  while (true) {
    const to = from + WORD_PAGE_SIZE - 1;
    const { data, error } = await db
      .from("words")
      .select("id, english, bangla, pos, root, family_id, is_active")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    words.push(...(data || []));

    if (!data || data.length < WORD_PAGE_SIZE) {
      break;
    }

    from += WORD_PAGE_SIZE;
  }

  return words;
}

async function chooseWordsForSet(db, userId, excludedIds = []) {
  const { data: userWords, error: userWordsError } = await db
    .from("user_words")
    .select("word_id")
    .eq("user_id", userId);

  if (userWordsError) {
    throw userWordsError;
  }

  const blockedIds = new Set([
    ...(userWords || []).map((row) => row.word_id),
    ...excludedIds,
  ]);

  const activeWords = await loadActiveWords(db);
  const eligibleWords = activeWords.filter((word) => !blockedIds.has(word.id));

  const wordsByRoot = new Map();
  for (const word of eligibleWords) {
    const rootKey = word.root || `word:${word.id}`;
    const rootWords = wordsByRoot.get(rootKey) || [];
    rootWords.push(word);
    wordsByRoot.set(rootKey, rootWords);
  }

  const selectedWords = [];
  for (const rootGroup of shuffle([...wordsByRoot.values()])) {
    selectedWords.push(...rootGroup);

    if (selectedWords.length >= MIN_LEARNING_SET_SIZE) {
      break;
    }
  }

  return selectedWords;
}

async function registerLearningSetWords(db, userId, words) {
  if (words.length === 0) {
    return;
  }

  const now = new Date();
  const rows = words.map((word) => ({
    user_id: userId,
    word_id: word.id,
    status: "learning",
    strength: 0,
    mistakes: 0,
    correct_count: 0,
    seen_count: 0,
    last_seen_at: null,
    next_review_at: nextReviewAtForStrength(0, now),
    updated_at: now.toISOString(),
  }));

  const { error } = await db
    .from("user_words")
    .upsert(rows, { onConflict: "user_id,word_id", ignoreDuplicates: true });

  if (error) {
    throw error;
  }
}

async function getPassedLearnSetSession(db, userId, setId) {
  const { data, error } = await db
    .from("quiz_sessions")
    .select("id, correct_items, total_items, status")
    .eq("user_id", userId)
    .eq("source", "learn")
    .eq("source_ref_id", setId)
    .eq("mode", "mcq")
    .eq("status", "completed");

  if (error) {
    throw error;
  }

  return (data || []).find((session) => {
    const totalItems = Number(session.total_items || 0);
    const correctItems = Number(session.correct_items || 0);
    if (totalItems <= 0) {
      return false;
    }

    return Math.round((correctItems / totalItems) * 100) >= LEARN_SET_PASS_PERCENT;
  });
}

async function startLearnSetGateExam(db, userId, setRow) {
  const { data: existingSession, error: sessionLookupError } = await db
    .from("quiz_sessions")
    .select(
      "id, user_id, source, source_ref_id, mode, total_items, current_index, correct_items, incorrect_items, status, retry_no, max_retries, started_at, ended_at, duration_ms",
    )
    .eq("user_id", userId)
    .eq("source", "learn")
    .eq("source_ref_id", setRow.id)
    .eq("mode", "mcq")
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionLookupError) {
    throw sessionLookupError;
  }

  if (existingSession) {
    return {
      status: "exam_required",
      session: existingSession,
      firstItem: null,
    };
  }

  const hydratedSet = await getLearningSetWithItems(db, setRow);
  const words = hydratedSet.items.flatMap((item) =>
    item.word ? [item.word] : [],
  );
  const createdSession = await createQuizSessionFromWords({
    db,
    userId,
    source: "learn",
    sourceRefId: setRow.id,
    mode: "mcq",
    words,
  });

  if (!createdSession) {
    return null;
  }

  await db
    .from("learning_sets")
    .update({ state: "in_quiz" })
    .eq("id", setRow.id)
    .eq("user_id", userId);

  return {
    status: "exam_required",
    session: createdSession.session,
    firstItem: createdSession.firstItem,
  };
}

async function createLearningSet(db, userId, excludedIds = []) {
  const latestSetIndex = await getLatestSetIndex(db, userId);
  const words = await chooseWordsForSet(db, userId, excludedIds);

  if (words.length === 0) {
    return null;
  }

  const { data: setRow, error: setError } = await db
    .from("learning_sets")
    .insert({
      user_id: userId,
      source: "learn",
      set_index: latestSetIndex + 1,
      total_words: words.length,
      state: "ready",
      expires_at: addDays(SET_EXPIRES_IN_DAYS),
    })
    .select(
      "id, user_id, source, set_index, total_words, state, generated_at, expires_at",
    )
    .single();

  if (setError) {
    throw setError;
  }

  const items = words.map((word, index) => ({
    set_id: setRow.id,
    word_id: word.id,
    sequence_no: index + 1,
    family_id: word.family_id,
  }));

  const { error: itemsError } = await db
    .from("learning_set_items")
    .insert(items);

  if (itemsError) {
    throw itemsError;
  }

  await registerLearningSetWords(db, userId, words);

  return getLearningSetWithItems(db, setRow);
}

async function getOrCreateCurrentSet(db, userId) {
  const activeSet = await getActiveLearningSet(db, userId);
  if (activeSet) {
    return activeSet;
  }

  const createdSet = await createLearningSet(db, userId);
  if (!createdSet) {
    return null;
  }

  return createdSet;
}

export async function getCurrentSet(req, res) {
  try {
    const db = req.supabase || supabase;
    const currentSet = await getOrCreateCurrentSet(db, req.userId);

    if (!currentSet) {
      return jsonError(
        res,
        404,
        "NO_WORDS_AVAILABLE",
        "No active words were available to create a set.",
      );
    }

    const hydratedSet = currentSet.items
      ? currentSet
      : await getLearningSetWithItems(db, currentSet);

    await registerLearningSetWords(
      db,
      req.userId,
      hydratedSet.items.flatMap((item) => (item.word ? [item.word] : [])),
    );

    return res.json({
      setId: hydratedSet.id,
      label: "Vocabulary",
      totalWords: hydratedSet.total_words,
      words: hydratedSet.items.flatMap((item) =>
        item.word
          ? [
              {
                wordId: item.word.id,
                english: item.word.english,
                bangla: item.word.bangla,
                pos: item.word.pos,
              },
            ]
          : [],
      ),
      status: hydratedSet.state,
      set: hydratedSet,
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "CURRENT_SET_FAILED",
      error.message || "Failed to load the current learning set.",
    );
  }
}

export async function createNextSet(req, res) {
  try {
    const db = req.supabase || supabase;
    const activeSet = await getActiveLearningSet(db, req.userId);
    let excludedIds = [];

    if (activeSet) {
      const hydratedSet = await getLearningSetWithItems(db, activeSet);
      excludedIds = hydratedSet.items.flatMap((item) =>
        item.word?.id ? [item.word.id] : [],
      );

      const passedSession = await getPassedLearnSetSession(
        db,
        req.userId,
        activeSet.id,
      );

      if (!passedSession) {
        const gateExam = await startLearnSetGateExam(db, req.userId, activeSet);
        if (!gateExam) {
          return jsonError(
            res,
            404,
            "NO_WORDS_AVAILABLE",
            "No words were available for the current set exam.",
          );
        }

        return res.status(202).json({
          ...gateExam,
          passPercent: LEARN_SET_PASS_PERCENT,
          message: `Score at least ${LEARN_SET_PASS_PERCENT}% on this set exam to unlock the next set.`,
        });
      }

      await db
        .from("learning_sets")
        .update({ state: "completed" })
        .eq("id", activeSet.id)
        .eq("user_id", req.userId);
    }

    const createdSet = await createLearningSet(db, req.userId, excludedIds);

    if (!createdSet) {
      return jsonError(
        res,
        404,
        "NO_WORDS_AVAILABLE",
        "No active words were available to create a set.",
      );
    }

    return res.status(201).json({
      setId: createdSet.id,
      label: "Vocabulary",
      totalWords: createdSet.total_words,
      words: createdSet.items.flatMap((item) =>
        item.word
          ? [
              {
                wordId: item.word.id,
                english: item.word.english,
                bangla: item.word.bangla,
                pos: item.word.pos,
              },
            ]
          : [],
      ),
      status: "created",
      set: createdSet,
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "NEXT_SET_FAILED",
      error.message || "Failed to create the next learning set.",
    );
  }
}

export async function startLearnQuiz(req, res) {
  try {
    const db = req.supabase || supabase;
    const { setId } = req.params;

    const { data: setRow, error: setError } = await db
      .from("learning_sets")
      .select(
        "id, user_id, source, set_index, total_words, state, generated_at, expires_at",
      )
      .eq("id", setId)
      .eq("user_id", req.userId)
      .maybeSingle();

    if (setError) {
      throw setError;
    }

    if (!setRow) {
      return jsonError(
        res,
        404,
        "SET_NOT_FOUND",
        "Learning set not found for this user.",
      );
    }

    const { data: existingSession, error: sessionLookupError } = await db
      .from("quiz_sessions")
      .select(
        "id, user_id, source, source_ref_id, mode, total_items, current_index, correct_items, incorrect_items, status, retry_no, max_retries, started_at, ended_at, duration_ms",
      )
      .eq("user_id", req.userId)
      .eq("source_ref_id", setId)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionLookupError) {
      throw sessionLookupError;
    }

    if (existingSession) {
      return res.json({
        status: "existing",
        session: existingSession,
      });
    }

    const { data: items, error: itemsError } = await db
      .from("learning_set_items")
      .select("set_id, word_id, sequence_no, family_id")
      .eq("set_id", setId)
      .order("sequence_no", { ascending: true });

    if (itemsError) {
      throw itemsError;
    }

    if (!items || items.length === 0) {
      return jsonError(
        res,
        400,
        "SET_HAS_NO_ITEMS",
        "This learning set has no items.",
      );
    }

    const words = await getWordsByIds(
      db,
      items.map((item) => item.word_id),
    );
    const createdSession = await createQuizSessionFromWords({
      db,
      userId: req.userId,
      source: "learn",
      sourceRefId: setRow.id,
      mode: "typing",
      words,
    });

    if (!createdSession) {
      return jsonError(
        res,
        404,
        "NO_WORDS_AVAILABLE",
        "No active words were available for this learning set.",
      );
    }

    await db
      .from("learning_sets")
      .update({ state: "in_quiz" })
      .eq("id", setRow.id);

    return res.status(201).json({
      status: "created",
      session: createdSession.session,
      firstItem: createdSession.firstItem,
    });
  } catch (error) {
    return jsonError(
      res,
      500,
      "START_QUIZ_FAILED",
      error.message || "Failed to start the quiz for this learning set.",
    );
  }
}
