import type { AuthSession } from "./api";

const AUTH_KEY = "shobdolab.auth-session";
const QUIZ_SESSION_KEY = "shobdolab.quiz-session-id";

function readStorage(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(key);
}

function writeStorage(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value);
}

function removeStorage(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
}

export function saveAuthSession(session: AuthSession) {
  writeStorage(AUTH_KEY, JSON.stringify(session));
}

export function loadAuthSession() {
  const stored = readStorage(AUTH_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthSession;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return loadAuthSession()?.accessToken ?? null;
}

export function clearAuthSession() {
  removeStorage(AUTH_KEY);
}

export function saveQuizSessionId(sessionId: string) {
  writeStorage(QUIZ_SESSION_KEY, sessionId);
}

export function loadQuizSessionId() {
  return readStorage(QUIZ_SESSION_KEY);
}

export function clearQuizSessionId() {
  removeStorage(QUIZ_SESSION_KEY);
}
