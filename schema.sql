-- =============================================================
-- ShobdoLab's Database Schema
-- =============================================================


-- ── 1. WORDS ─────────────────────────────────────────────────
CREATE TABLE words (
  id         BIGINT PRIMARY KEY,
  english    TEXT NOT NULL UNIQUE,
  bangla     TEXT[] NOT NULL,
  pos        TEXT[] NOT NULL DEFAULT '{}',
  root       TEXT NOT NULL,
  family_id  TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_words_family_id ON words(family_id);


-- ── 2. USERS ──────────────────────────────────────────────────
CREATE TABLE users (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     TEXT NULL,
  streak_days      INT NOT NULL DEFAULT 0,
  last_active_date DATE NULL,
  timezone         TEXT NOT NULL DEFAULT 'UTC',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a user row when someone signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── 3. USER_WORDS ─────────────────────────────────────────────
CREATE TABLE user_words (
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id        BIGINT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'learning'
                   CHECK (status IN ('learning', 'review', 'mastered')),
  strength       SMALLINT NOT NULL DEFAULT 0
                   CHECK (strength BETWEEN 0 AND 5),
  mistakes       INT NOT NULL DEFAULT 0,
  correct_count  INT NOT NULL DEFAULT 0,
  seen_count     INT NOT NULL DEFAULT 0,
  last_seen_at   TIMESTAMPTZ NULL,
  next_review_at TIMESTAMPTZ NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, word_id)
);

CREATE TRIGGER user_words_set_updated_at
  BEFORE UPDATE ON user_words
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_user_words_user_id     ON user_words(user_id);
CREATE INDEX idx_user_words_next_review ON user_words(user_id, next_review_at);
CREATE INDEX idx_user_words_strength    ON user_words(user_id, strength, mistakes);
CREATE INDEX idx_user_words_status      ON user_words(user_id, status);


-- ── 4. LEARNING_SETS ──────────────────────────────────────────
CREATE TABLE learning_sets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source       TEXT NOT NULL CHECK (source IN ('learn')),
  set_index    INT NOT NULL,
  total_words  INT NOT NULL,
  state        TEXT NOT NULL DEFAULT 'ready'
                 CHECK (state IN ('ready', 'in_quiz', 'completed', 'expired')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL
);

ALTER TABLE learning_sets
  ADD CONSTRAINT uq_learning_sets_user_index UNIQUE (user_id, set_index);

CREATE INDEX idx_learning_sets_user ON learning_sets(user_id, state, generated_at DESC);


-- ── 5. LEARNING_SET_ITEMS ─────────────────────────────────────
CREATE TABLE learning_set_items (
  set_id      UUID NOT NULL REFERENCES learning_sets(id) ON DELETE CASCADE,
  word_id     BIGINT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  sequence_no INT NOT NULL,
  family_id   TEXT NULL,
  PRIMARY KEY (set_id, word_id)
);

ALTER TABLE learning_set_items
  ADD CONSTRAINT uq_learning_set_items_order UNIQUE (set_id, sequence_no);


-- ── 6. QUIZ_SESSIONS ──────────────────────────────────────────
CREATE TABLE quiz_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source          TEXT NOT NULL CHECK (source IN ('learn', 'revise', 'exercise')),
  source_ref_id   UUID NULL,
  mode            TEXT NOT NULL CHECK (mode IN ('mcq', 'typing', 'mixed')),
  total_items     INT NOT NULL,
  current_index   INT NOT NULL DEFAULT 0,
  correct_items   INT NOT NULL DEFAULT 0,
  incorrect_items INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'abandoned')),
  retry_no        SMALLINT NOT NULL DEFAULT 0,
  max_retries     SMALLINT NOT NULL DEFAULT 2,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ NULL,
  duration_ms     BIGINT NULL
);

CREATE INDEX idx_quiz_sessions_user ON quiz_sessions(user_id, started_at DESC);


-- ── 7. QUIZ_ITEMS ─────────────────────────────────────────────
CREATE TABLE quiz_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  word_id          BIGINT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  question_type    TEXT NOT NULL CHECK (question_type IN ('mcq', 'typing')),
  prompt_direction TEXT NOT NULL CHECK (prompt_direction IN ('en_to_bn', 'bn_to_en')),
  prompt_text      TEXT NOT NULL,
  options          JSONB NULL,
  accepted_answers JSONB NOT NULL,
  sequence_no      INT NOT NULL
);

ALTER TABLE quiz_items
  ADD CONSTRAINT uq_quiz_items_order UNIQUE (session_id, sequence_no);

CREATE INDEX idx_quiz_items_session ON quiz_items(session_id, sequence_no);


-- ── 8. QUIZ_ATTEMPTS ──────────────────────────────────────────
CREATE TABLE quiz_attempts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  quiz_item_id     UUID NOT NULL REFERENCES quiz_items(id) ON DELETE CASCADE,
  word_id          BIGINT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  user_answer      TEXT NULL,
  is_correct       BOOLEAN NOT NULL,
  response_time_ms INT NULL,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevents double-scoring the same item in the same session
  UNIQUE (session_id, quiz_item_id)
);

CREATE INDEX idx_quiz_attempts_session ON quiz_attempts(session_id, submitted_at);


-- ── 8.1 QUIZ ANSWER TRANSACTION ───────────────────────────────
CREATE OR REPLACE FUNCTION record_quiz_answer(
  p_user_id UUID,
  p_session_id UUID,
  p_quiz_item_id UUID,
  p_word_id BIGINT,
  p_user_answer TEXT,
  p_is_correct BOOLEAN,
  p_response_time_ms INT
)
RETURNS TABLE (
  session_id UUID,
  current_index INT,
  correct_items INT,
  incorrect_items INT,
  status TEXT,
  total_items INT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_ms BIGINT,
  learning_set_id UUID,
  learning_set_state TEXT
) AS $$
DECLARE
  v_session quiz_sessions%ROWTYPE;
  v_user_word user_words%ROWTYPE;
  v_next_seen_count INT;
  v_next_correct_count INT;
  v_next_mistakes INT;
  v_next_strength SMALLINT;
  v_next_status TEXT;
  v_next_review_at TIMESTAMPTZ;
  v_next_current_index INT;
  v_completed BOOLEAN;
  v_ended_at TIMESTAMPTZ;
  v_duration_ms BIGINT;
  v_learning_set_state TEXT;
BEGIN
  SELECT * INTO v_session
  FROM quiz_sessions
  WHERE id = p_session_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz session not found for this user';
  END IF;

  IF v_session.status <> 'active' THEN
    RAISE EXCEPTION 'Quiz session is not active';
  END IF;

  PERFORM 1
  FROM quiz_items qi
  WHERE qi.id = p_quiz_item_id AND qi.session_id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quiz item not found for this session';
  END IF;

  INSERT INTO quiz_attempts (
    session_id,
    quiz_item_id,
    word_id,
    user_answer,
    is_correct,
    response_time_ms
  ) VALUES (
    p_session_id,
    p_quiz_item_id,
    p_word_id,
    p_user_answer,
    p_is_correct,
    p_response_time_ms
  )
  ON CONFLICT (session_id, quiz_item_id) DO NOTHING;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This quiz item has already been answered';
  END IF;

  SELECT * INTO v_user_word
  FROM user_words
  WHERE user_id = p_user_id AND word_id = p_word_id;

  v_next_seen_count := COALESCE(v_user_word.seen_count, 0) + 1;
  v_next_correct_count := COALESCE(v_user_word.correct_count, 0) + CASE WHEN p_is_correct THEN 1 ELSE 0 END;
  v_next_mistakes := COALESCE(v_user_word.mistakes, 0) + CASE WHEN p_is_correct THEN 0 ELSE 1 END;
  v_next_strength := CASE
    WHEN p_is_correct THEN LEAST(5, COALESCE(v_user_word.strength, 0) + 1)
    ELSE GREATEST(0, COALESCE(v_user_word.strength, 0) - 1)
  END;
  v_next_status := CASE
    WHEN v_next_strength >= 4 THEN 'mastered'
    WHEN p_is_correct THEN 'review'
    ELSE 'learning'
  END;
  v_next_review_at := CASE
    WHEN p_is_correct THEN CASE
      WHEN v_next_strength <= 0 THEN NOW() + INTERVAL '1 day'
      WHEN v_next_strength = 1 THEN NOW() + INTERVAL '3 days'
      WHEN v_next_strength = 2 THEN NOW() + INTERVAL '7 days'
      WHEN v_next_strength = 3 THEN NOW() + INTERVAL '14 days'
      ELSE NOW() + INTERVAL '30 days'
    END
    ELSE NOW() + INTERVAL '1 day'
  END;

  INSERT INTO user_words (
    user_id,
    word_id,
    status,
    strength,
    mistakes,
    correct_count,
    seen_count,
    last_seen_at,
    next_review_at
  ) VALUES (
    p_user_id,
    p_word_id,
    v_next_status,
    v_next_strength,
    v_next_mistakes,
    v_next_correct_count,
    v_next_seen_count,
    NOW(),
    v_next_review_at
  )
  ON CONFLICT (user_id, word_id) DO UPDATE SET
    status = EXCLUDED.status,
    strength = EXCLUDED.strength,
    mistakes = EXCLUDED.mistakes,
    correct_count = EXCLUDED.correct_count,
    seen_count = EXCLUDED.seen_count,
    last_seen_at = EXCLUDED.last_seen_at,
    next_review_at = EXCLUDED.next_review_at,
    updated_at = NOW();

  v_next_current_index := v_session.current_index + 1;
  v_completed := v_next_current_index >= v_session.total_items;
  v_ended_at := CASE WHEN v_completed THEN NOW() ELSE v_session.ended_at END;
  v_duration_ms := CASE
    WHEN v_completed THEN (EXTRACT(EPOCH FROM (v_ended_at - v_session.started_at)) * 1000)::BIGINT
    ELSE v_session.duration_ms
  END;

  UPDATE quiz_sessions
  SET
    current_index = v_next_current_index,
    correct_items = v_session.correct_items + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    incorrect_items = v_session.incorrect_items + CASE WHEN p_is_correct THEN 0 ELSE 1 END,
    status = CASE WHEN v_completed THEN 'completed' ELSE 'active' END,
    ended_at = v_ended_at,
    duration_ms = v_duration_ms
  WHERE id = p_session_id;

  IF v_completed AND v_session.source = 'learn' AND v_session.source_ref_id IS NOT NULL THEN
    UPDATE learning_sets
    SET state = 'completed'
    WHERE id = v_session.source_ref_id AND user_id = p_user_id;

    SELECT state INTO v_learning_set_state
    FROM learning_sets
    WHERE id = v_session.source_ref_id;
  END IF;

  RETURN QUERY
  SELECT
    v_session.id,
    v_next_current_index,
    v_session.correct_items + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    v_session.incorrect_items + CASE WHEN p_is_correct THEN 0 ELSE 1 END,
    CASE WHEN v_completed THEN 'completed' ELSE 'active' END,
    v_session.total_items,
    v_session.started_at,
    v_ended_at,
    v_duration_ms,
    v_session.source_ref_id,
    COALESCE(v_learning_set_state, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ── 9. DAILY_USER_STATS ───────────────────────────────────────
CREATE TABLE daily_user_stats (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stat_date       DATE NOT NULL,
  learned_count   INT NOT NULL DEFAULT 0,
  revised_count   INT NOT NULL DEFAULT 0,
  exercise_count  INT NOT NULL DEFAULT 0,
  correct_count   INT NOT NULL DEFAULT 0,
  incorrect_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, stat_date)
);


-- ── 10. NOTIFICATIONS ─────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);


-- ── 11. ACHIEVEMENTS ──────────────────────────────────────────
CREATE TABLE achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  target      INT NOT NULL DEFAULT 1,
  metric_key  TEXT NOT NULL DEFAULT 'manual',
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE user_achievements (
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  awarded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS target INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS metric_key TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

INSERT INTO achievements (code, title, description, target, metric_key, sort_order)
VALUES
  ('WORD_COLLECTOR_25', 'Word Collector', 'Learn 25 words.', 25, 'words_learned', 10),
  ('VOCABULARY_BUILDER_50', 'Vocabulary Builder', 'Learn 50 words.', 50, 'words_learned', 20),
  ('HUNDRED_WORD_HERO_100', 'Hundred Word Hero', 'Learn 100 words.', 100, 'words_learned', 30),
  ('WORD_VAULT_250', 'Word Vault', 'Learn 250 words.', 250, 'words_learned', 40),
  ('LIVING_DICTIONARY_500', 'Living Dictionary', 'Learn 500 words.', 500, 'words_learned', 50),
  ('MEMORY_SPARK_10', 'Memory Spark', 'Master 10 words.', 10, 'mastered_words', 60),
  ('STEADY_RECALL_25', 'Steady Recall', 'Master 25 words.', 25, 'mastered_words', 70),
  ('IRON_MEMORY_100', 'Iron Memory', 'Master 100 words.', 100, 'mastered_words', 80),
  ('THREE_DAY_FLAME_3', 'Three-Day Flame', 'Keep a 3-day streak.', 3, 'streak_days', 90),
  ('WEEK_WARRIOR_7', 'Week Warrior', 'Keep a 7-day streak.', 7, 'streak_days', 100),
  ('TWO_WEEK_TITAN_14', 'Two-Week Titan', 'Keep a 14-day streak.', 14, 'streak_days', 110),
  ('MONTH_MONK_30', 'Month Monk', 'Keep a 30-day streak.', 30, 'streak_days', 120),
  ('ACTIVE_LEARNER_7', 'Active Learner', 'Practice on 7 different days.', 7, 'active_days', 130),
  ('HABIT_ARCHITECT_30', 'Habit Architect', 'Practice on 30 different days.', 30, 'active_days', 140),
  ('REVIEW_STARTER_25', 'Review Starter', 'Revise 25 words total.', 25, 'revised_total', 150),
  ('REVIEW_RANGER_100', 'Review Ranger', 'Revise 100 words total.', 100, 'revised_total', 160),
  ('WEAK_WORD_TAMER_20', 'Weak Word Tamer', 'Improve 20 weak words to strength 3+.', 20, 'weak_words_tamed', 170),
  ('EXERCISE_REGULAR_10', 'Exercise Regular', 'Complete 10 exercise sessions.', 10, 'exercise_sessions', 180),
  ('TRAINING_MACHINE_50', 'Training Machine', 'Complete 50 exercise sessions.', 50, 'exercise_sessions', 190),
  ('SHARP_SESSION_1', 'Sharp Session', 'Score 90%+ in an exercise session.', 1, 'sharp_exercise_sessions', 200),
  ('SHARPSHOOTER_10', 'Sharpshooter', 'Score 90%+ in 10 exercise sessions.', 10, 'sharp_exercise_sessions', 210),
  ('PERFECT_RUN_1', 'Perfect Run', 'Complete an exercise with 0 mistakes.', 1, 'perfect_exercise_sessions', 220),
  ('FLAWLESS_FIVE_5', 'Flawless Five', 'Complete 5 perfect sessions.', 5, 'perfect_sessions', 230),
  ('MCQ_MARKSMAN_10', 'MCQ Marksman', 'Complete 10 MCQ sessions.', 10, 'mcq_sessions', 240),
  ('ANSWER_MARATHON_500', 'Answer Marathon', 'Answer 500 quiz questions total.', 500, 'answered_questions', 250),
  ('PRECISION_SCHOLAR_200', 'Precision Scholar', 'Reach 90%+ accuracy across at least 200 answered questions.', 1, 'precision_scholar', 260),
  ('NO_RUSH_RECALL_10', 'No-Rush Recall', 'Complete 10 sessions with at least 80% accuracy.', 10, 'steady_sessions', 270),
  ('DAILY_TRIPLE_1', 'Daily Triple', 'Learn, revise, and exercise on the same day.', 1, 'daily_triple_days', 280)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  target = EXCLUDED.target,
  metric_key = EXCLUDED.metric_key,
  sort_order = EXCLUDED.sort_order;


-- ── 12. ROW LEVEL SECURITY ────────────────────────────────────

-- words: public read only
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "words_read" ON words FOR SELECT USING (true);

-- users: own row only
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update" ON users FOR UPDATE USING (auth.uid() = id);

-- user_words: own rows only
ALTER TABLE user_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uw_select" ON user_words FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "uw_insert" ON user_words FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "uw_update" ON user_words FOR UPDATE USING (auth.uid() = user_id);

-- learning_sets: own rows only
ALTER TABLE learning_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ls_select" ON learning_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ls_insert" ON learning_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ls_update" ON learning_sets FOR UPDATE USING (auth.uid() = user_id);

-- learning_set_items: accessible if user owns the parent set
ALTER TABLE learning_set_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lsi_select" ON learning_set_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM learning_sets
    WHERE id = learning_set_items.set_id AND user_id = auth.uid()
  )
);
CREATE POLICY "lsi_insert" ON learning_set_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM learning_sets
    WHERE id = learning_set_items.set_id AND user_id = auth.uid()
  )
);

-- quiz_sessions: own rows only
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qs_select" ON quiz_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "qs_insert" ON quiz_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "qs_update" ON quiz_sessions FOR UPDATE USING (auth.uid() = user_id);

-- quiz_items: accessible if user owns the parent session
ALTER TABLE quiz_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qi_select" ON quiz_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM quiz_sessions
    WHERE id = quiz_items.session_id AND user_id = auth.uid()
  )
);
CREATE POLICY "qi_insert" ON quiz_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM quiz_sessions
    WHERE id = quiz_items.session_id AND user_id = auth.uid()
  )
);

-- quiz_attempts: accessible if user owns the parent session
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_select" ON quiz_attempts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM quiz_sessions
    WHERE id = quiz_attempts.session_id AND user_id = auth.uid()
  )
);
CREATE POLICY "qa_insert" ON quiz_attempts FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM quiz_sessions
    WHERE id = quiz_attempts.session_id AND user_id = auth.uid()
  )
);

-- daily_user_stats: own rows only
ALTER TABLE daily_user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dus_select" ON daily_user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dus_insert" ON daily_user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dus_update" ON daily_user_stats FOR UPDATE USING (auth.uid() = user_id);

-- notifications: own rows only
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- achievements: public read
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ach_read" ON achievements FOR SELECT USING (true);

-- user_achievements: own rows only
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ua_select" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ua_insert" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
