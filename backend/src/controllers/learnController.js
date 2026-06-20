import { supabase } from "../lib/supabaseClient.js";
import {
  createQuizSessionFromWords,
  getWordsByIds,
} from "./quizSessionBuilder.js";

const DEFAULT_SET_SIZE = 10;
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

async function chooseWordsForSet(
  db,
  userId,
  desiredCount = DEFAULT_SET_SIZE,
  excludedIds = [],
) {
  const { data: userWords, error: userWordsError } = await db
    .from("user_words")
    .select("word_id, status, strength, mistakes, seen_count, next_review_at")
    .eq("user_id", userId);

  if (userWordsError) {
    throw userWordsError;
  }

  const excluded = new Set(excludedIds);
  const seenWordIds = new Set((userWords || []).map((row) => row.word_id));
  const selectedWords = [];
  const blockedIds = [...new Set([...seenWordIds, ...excluded])];

  let unseenQuery = db
    .from("words")
    .select("id, english, bangla, pos, root, family_id, is_active")
    .eq("is_active", true)
    .order("family_id", { ascending: true })
    .order("id", { ascending: true });

  if (blockedIds.length > 0) {
    unseenQuery = unseenQuery.not("id", "in", `(${blockedIds.join(",")})`);
  }

  const { data: unseenWords, error: unseenError } = await unseenQuery;
  if (unseenError) {
    throw unseenError;
  }

  const unseenByFamily = new Map();
  for (const word of unseenWords || []) {
    const familyKey = word.family_id || `word:${word.id}`;
    const familyWords = unseenByFamily.get(familyKey) || [];
    familyWords.push(word);
    unseenByFamily.set(familyKey, familyWords);
  }

  const familyGroups = [...unseenByFamily.entries()]
    .map(([familyId, words]) => ({ familyId, words }))
    .sort((left, right) => {
      const rightCanFill = right.words.length >= desiredCount ? 1 : 0;
      const leftCanFill = left.words.length >= desiredCount ? 1 : 0;
      if (leftCanFill !== rightCanFill) return rightCanFill - leftCanFill;
      if (right.words.length !== left.words.length) {
        return right.words.length - left.words.length;
      }
      return String(left.familyId).localeCompare(String(right.familyId));
    });

  const primaryFamily = familyGroups[0];
  if (primaryFamily) {
    selectedWords.push(...primaryFamily.words.slice(0, desiredCount));
  }

  if (selectedWords.length < desiredCount) {
    const selectedIds = new Set(selectedWords.map((word) => word.id));
    const remainingUnseen = (unseenWords || []).filter(
      (word) => !selectedIds.has(word.id),
    );
    selectedWords.push(
      ...remainingUnseen.slice(0, desiredCount - selectedWords.length),
    );
  }

  if (selectedWords.length >= desiredCount) {
    return selectedWords.slice(0, desiredCount);
  }

  const statusRank = {
    learning: 0,
    review: 1,
    mastered: 2,
  };

  const prioritizedUserWords = [...(userWords || [])].sort((left, right) => {
    const leftStatus = statusRank[left.status] ?? 99;
    const rightStatus = statusRank[right.status] ?? 99;

    if (leftStatus !== rightStatus) return leftStatus - rightStatus;

    const leftReview = left.next_review_at
      ? new Date(left.next_review_at).getTime()
      : 0;
    const rightReview = right.next_review_at
      ? new Date(right.next_review_at).getTime()
      : 0;
    if (leftReview !== rightReview) return leftReview - rightReview;

    if (left.strength !== right.strength) return left.strength - right.strength;

    return left.seen_count - right.seen_count;
  });

  const selectedWordIds = prioritizedUserWords
    .filter((row) => !excluded.has(row.word_id))
    .slice(0, desiredCount - selectedWords.length)
    .map((row) => row.word_id);

  if (selectedWordIds.length > 0) {
    const { data: words, error: selectedWordsError } = await db
      .from("words")
      .select("id, english, bangla, pos, root, family_id, is_active")
      .eq("is_active", true)
      .in("id", selectedWordIds);

    if (selectedWordsError) {
      throw selectedWordsError;
    }

    const byId = new Map(words.map((word) => [word.id, word]));
    for (const wordId of selectedWordIds) {
      const word = byId.get(wordId);
      if (word) selectedWords.push(word);
    }
  }

  if (selectedWords.length < desiredCount) {
    const excludedFallbackIds = [
      ...new Set([...selectedWords.map((word) => word.id), ...excluded]),
    ];
    let query = db
      .from("words")
      .select("id, english, bangla, pos, root, family_id, is_active")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .limit(desiredCount - selectedWords.length);

    if (excludedFallbackIds.length > 0) {
      query = query.not("id", "in", `(${excludedFallbackIds.join(",")})`);
    }

    const { data: fallbackWords, error: fallbackError } = await query;

    if (fallbackError) {
      throw fallbackError;
    }

    selectedWords.push(...(fallbackWords || []));
  }

  return selectedWords.slice(0, desiredCount);
}

async function createLearningSet(db, userId, excludedIds = []) {
  const latestSetIndex = await getLatestSetIndex(db, userId);
  const words = await chooseWordsForSet(
    db,
    userId,
    DEFAULT_SET_SIZE,
    excludedIds,
  );

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

      await db
        .from("learning_sets")
        .update({ state: activeSet.state === "in_quiz" ? "completed" : "expired" })
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
