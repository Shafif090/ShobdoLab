import { expireAuthSession } from "./session";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5500"
).replace(/\/$/, "");

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;

  constructor(status: number, code: string, message: string, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (null as T);
}

async function request<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    token?: string | null;
    body?: unknown;
  } = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/v1/auth")) {
      expireAuthSession();
      if (typeof window !== "undefined") {
        window.location.assign("/login");
      }
    }

    const fallback = {
      error: {
        code: "REQUEST_FAILED",
        message: `Request failed with status ${response.status}.`,
        details: null,
      },
    };

    const parsed = (await parseResponse<ApiErrorBody>(response).catch(
      () => fallback,
    )) as ApiErrorBody;
    const error = parsed?.error ?? fallback.error;

    throw new ApiError(
      response.status,
      error.code ?? "REQUEST_FAILED",
      error.message ?? fallback.error.message,
      error.details ?? null,
    );
  }

  return parseResponse<T>(response);
}

export type AuthSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
  expiresAt?: number | null;
  user: {
    id: string;
    email: string | null;
    displayName?: string | null;
  };
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = LoginInput & {
  displayName?: string;
};

export type GoogleAuthUrlResponse = {
  url: string;
};

export type OAuthSessionInput = {
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
  expiresAt?: number | null;
};

export type HomeSummaryResponse = {
  streakDays: number;
  wordsLearnedTotal: number;
  today: {
    learned: number;
    revised: number;
    exercise: number;
  };
  dueTomorrowCount: number;
  unreadNotifications: number;
  latestAchievement: {
    title: string | null;
    awardedAt: string;
  } | null;
  achievements: Array<{
    code: string;
    title: string;
    description: string;
    earned: boolean;
    awardedAt: string | null;
    progress: number;
    target: number;
  }>;
};

export type ReviseSummaryResponse = {
  dueTodayCount: number;
  weakWordsCount: number;
  recentWordsCount: number;
};

export type LearnedWord = {
  wordId: string;
  english: string;
  bangla: string[];
  pos: string[];
  root: string | null;
  familyId: string | null;
  status: string;
  strength: number;
  mistakes: number;
  correctCount: number;
  seenCount: number;
  learnedAt: string;
  lastSeenAt: string | null;
  nextReviewAt: string | null;
};

export type LearnedWordsResponse = {
  items: LearnedWord[];
  type?: "due" | "weak" | "recent";
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type LearnedWordsSort =
  | "newest"
  | "oldest"
  | "az"
  | "za"
  | "strength_high"
  | "strength_low"
  | "mistakes_high"
  | "last_seen";

export type ExerciseMetaResponse = {
  modes: {
    mcq: { estimated: string; items: number };
    mixed: { estimated: string; items: number };
    typing: { estimated: string; items: number };
  };
  lastSessionAccuracy: number | null;
};

export type ExerciseHistoryItem = {
  sessionId: string;
  mode: string;
  totalItems: number;
  correctItems: number;
  incorrectItems: number;
  scorePercent: number;
  accuracy: number;
  durationSec: number;
  startedAt: string;
  endedAt: string | null;
  retryNo: number;
  missedWords: Array<{
    wordId: string;
    word: string;
  }>;
};

export type ExerciseHistoryResponse = {
  items: ExerciseHistoryItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type WordDetailResponse = {
  word: {
    wordId: string;
    english: string;
    bangla: string[];
    pos: string[];
    root: string | null;
    familyId: string | null;
    isActive: boolean;
    createdAt: string;
  };
  progress: {
    status: string;
    strength: number;
    mistakes: number;
    correctCount: number;
    seenCount: number;
    learnedAt: string;
    lastSeenAt: string | null;
    nextReviewAt: string | null;
    updatedAt: string;
  } | null;
  stats: {
    totalAttempts: number;
    correctAttempts: number;
    incorrectAttempts: number;
    accuracy: number | null;
    lastAttemptAt: string | null;
  };
  recentAttempts: Array<{
    id: string;
    sessionId: string;
    quizItemId: string;
    source: string | null;
    mode: string | null;
    questionType: string | null;
    promptText: string;
    sequenceNo: number | null;
    yourAnswer: string | null;
    correctAnswer: string;
    correctAnswers: string[];
    isCorrect: boolean;
    responseTimeMs: number | null;
    submittedAt: string;
  }>;
};

export type DictionaryWord = {
  wordId: string;
  english: string;
  bangla: string[];
  pos: string[];
  root: string | null;
  familyId: string | null;
  isActive: boolean;
  learned: boolean;
  progress: WordDetailResponse["progress"];
};

export type WordSearchResponse = {
  items: DictionaryWord[];
  query: string;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type AddWordResponse = {
  item: DictionaryWord;
  added: boolean;
};

export type LearningSetItem = {
  sequenceNo: number;
  familyId: number | null;
  word: {
    id: string;
    english: string;
    bangla: string[];
    pos: string[];
    root: string | null;
    family_id: number | null;
    is_active: boolean | null;
  } | null;
};

export type LearningSetResponse = {
  status: string;
  set: {
    id: string;
    user_id: string;
    source: string;
    set_index: number;
    total_words: number;
    state: string;
    generated_at: string;
    expires_at: string;
    items: LearningSetItem[];
  };
};

export type QuizSession = {
  id: string;
  user_id: string;
  source: string;
  source_ref_id: string | null;
  mode: string;
  total_items: number;
  current_index: number;
  correct_items: number;
  incorrect_items: number;
  status: string;
  retry_no: number;
  max_retries: number;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
};

export type QuizSessionState = {
  id: string;
  mode: string;
  source: string;
  sourceRefId: string | null;
  currentIndex: number;
  totalItems: number;
  correctItems: number;
  incorrectItems: number;
  status: string;
  retryNo: number;
  maxRetries: number;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  progressPercent: number;
};

export type QuizItem = {
  id?: string;
  session_id?: string;
  word_id?: string;
  question_type: string;
  prompt_direction: string;
  prompt_text: string;
  options: string[] | null;
  accepted_answers: string[] | string | null;
  sequence_no: number;
};

export type QuizQuestion = {
  quizItemId: string;
  wordId: string;
  questionType: string;
  promptDirection: string;
  promptText: string;
  options: string[] | null;
  acceptedAnswers: string[];
  sequenceNo: number;
};

export type QuizSessionResponse = {
  session: QuizSession;
  sessionState?: QuizSessionState;
  question?: QuizQuestion | null;
  currentItem: QuizItem | null;
  totalItems: number;
  remainingItems: number;
};

export type QuizStartResponse = {
  status: string;
  session: QuizSession;
  firstItem: QuizItem;
};

export type ReviseStartResponse = {
  quizSessionId: string;
  totalItems: number;
  estimatedMinutes: string;
  session: QuizSession;
  firstItem: QuizItem;
};

export type ExerciseStartResponse = {
  quizSessionId: string;
  mode: string;
  totalItems: number;
  session: QuizSession;
  firstItem: QuizItem;
};

export type QuizRetryResponse = {
  newSessionId: string;
  retryNo: number;
  totalItems: number;
  session: QuizSession;
  firstItem: QuizItem;
};

export type QuizAnswerResponse = {
  isCorrect?: boolean;
  correct: boolean;
  correctAnswer?: string;
  explanation?: string | null;
  nextAvailable?: boolean;
  updated?: {
    correctItems: number;
    incorrectItems: number;
    currentIndex: number;
    totalItems: number;
    progressPercent: number;
  };
  session: QuizSession;
  sessionState?: QuizSessionState;
  nextItem: QuizItem | null;
  nextQuestion?: QuizQuestion | null;
  completed: boolean;
};

export type QuizResultResponse = {
  sessionId?: string;
  scorePercent?: number;
  correct?: number;
  incorrect?: number;
  durationSec?: number;
  session: QuizSession;
  attempts: Array<{
    id: string;
    session_id: string;
    quiz_item_id: string;
    word_id: string;
    user_answer: string | null;
    is_correct: boolean;
    response_time_ms: number | null;
    submitted_at: string;
  }>;
  summary: {
    totalItems: number;
    correctItems: number;
    incorrectItems: number;
    accuracy: number;
    scorePercent?: number;
    durationSec?: number;
  };
  incorrectItems: Array<{
    wordId: string;
    word: string;
    yourAnswer: string | null;
    correctAnswer: string;
    correctAnswers: string[];
  }>;
  breakdown?: Array<{
    quizItemId: string;
    wordId: string;
    word: string;
    questionType: string;
    sequenceNo: number;
    promptText: string;
    yourAnswer: string | null;
    correctAnswer: string;
    correctAnswers: string[];
    isCorrect: boolean;
    answered: boolean;
  }>;
  canRetry: boolean;
  retryAction: {
    endpoint: string;
    maxRetries: number;
    retryNo: number;
  };
};

export async function login(input: LoginInput) {
  return request<AuthSession>("/v1/auth/login", {
    method: "POST",
    body: input,
  });
}

export async function signup(input: SignupInput) {
  return request<AuthSession>("/v1/auth/signup", {
    method: "POST",
    body: input,
  });
}

export async function getGoogleAuthUrl(redirectTo: string) {
  return request<GoogleAuthUrlResponse>("/v1/auth/google/url", {
    method: "POST",
    body: { redirectTo },
  });
}

export async function createOAuthSession(input: OAuthSessionInput) {
  return request<AuthSession>("/v1/auth/oauth/session", {
    method: "POST",
    body: input,
  });
}

export async function getHomeSummary(token: string) {
  return request<HomeSummaryResponse>("/v1/home/summary", { token });
}

export async function getReviseSummary(token: string) {
  return request<ReviseSummaryResponse>("/v1/revise/summary", { token });
}

export async function getLearnedWords(
  token: string,
  page = 1,
  limit = 20,
  type: "due" | "weak" | "recent" = "recent",
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    type,
  });

  return request<LearnedWordsResponse>(`/v1/revise/words?${params.toString()}`, {
    token,
  });
}

export async function getExerciseMeta(token: string) {
  return request<ExerciseMetaResponse>("/v1/exercise/meta", { token });
}

export async function getExerciseHistory(token: string, page = 1, limit = 10) {
  return request<ExerciseHistoryResponse>(
    `/v1/exercise/history?page=${page}&limit=${limit}`,
    { token },
  );
}

export async function getWordDetail(token: string, wordId: string | number) {
  return request<WordDetailResponse>(`/v1/words/${wordId}`, { token });
}

export async function searchWords(token: string, query = "", page = 1, limit = 20) {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: String(limit),
  });

  return request<WordSearchResponse>(`/v1/words/search?${params.toString()}`, {
    token,
  });
}

export async function addWord(token: string, wordId: string | number) {
  return request<AddWordResponse>(`/v1/words/${wordId}/add`, {
    method: "POST",
    token,
  });
}

export async function practiceWord(
  token: string,
  wordId: string | number,
  mode = "mixed",
) {
  return request<ExerciseStartResponse>(`/v1/words/${wordId}/practice`, {
    method: "POST",
    token,
    body: { mode },
  });
}

export async function startReviseSession(
  token: string,
  input: { type: "due" | "weak" | "recent" | "all"; mode?: string; limit?: number },
) {
  return request<ReviseStartResponse>("/v1/revise/start", {
    method: "POST",
    token,
    body: input,
  });
}

export async function startExerciseSession(token: string, mode: string) {
  return request<ExerciseStartResponse>("/v1/exercise/start", {
    method: "POST",
    token,
    body: { mode },
  });
}

export async function getCurrentSet(token: string) {
  return request<LearningSetResponse>("/v1/learn/current-set", { token });
}

export async function createNextSet(token: string) {
  return request<LearningSetResponse>("/v1/learn/next-set", {
    method: "POST",
    token,
  });
}

export async function startLearnQuiz(token: string, setId: string) {
  return request<QuizStartResponse>(`/v1/learn/${setId}/start-quiz`, {
    method: "POST",
    token,
  });
}

export async function getQuizSession(token: string, sessionId: string) {
  return request<QuizSessionResponse>(`/v1/quiz/${sessionId}`, { token });
}

export async function getNextQuizItem(token: string, sessionId: string) {
  return request<QuizSessionResponse>(`/v1/quiz/${sessionId}/next`, {
    method: "POST",
    token,
  });
}

export async function submitQuizAnswer(
  token: string,
  sessionId: string,
  userAnswer: string,
  quizItemId?: string,
  responseTimeMs?: number,
) {
  return request<QuizAnswerResponse>(`/v1/quiz/${sessionId}/answer`, {
    method: "POST",
    token,
    body: {
      userAnswer,
      answer: userAnswer,
      quizItemId,
      responseTimeMs,
    },
  });
}

export async function finishQuizSession(token: string, sessionId: string) {
  return request<{ session: QuizSession }>(`/v1/quiz/${sessionId}/finish`, {
    method: "POST",
    token,
  });
}

export async function getQuizResult(token: string, sessionId: string) {
  return request<QuizResultResponse>(`/v1/quiz/${sessionId}/result`, { token });
}

export async function retryQuizSession(token: string, sessionId: string) {
  return request<QuizRetryResponse>(`/v1/quiz/${sessionId}/retry`, {
    method: "POST",
    token,
  });
}
