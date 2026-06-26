import type { AuthSession } from "./api";

const AUTH_KEY = "shobdolab.auth-session";
const QUIZ_SESSION_KEY = "shobdolab.quiz-session-id";
const SESSION_MESSAGE_KEY = "shobdolab.session-message";

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
  const expiresAt =
    session.expiresAt ??
    (session.expiresIn ? Date.now() + session.expiresIn * 1000 : null);

  writeStorage(AUTH_KEY, JSON.stringify({ ...session, expiresAt }));
  removeStorage(SESSION_MESSAGE_KEY);
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
  const session = loadAuthSession();
  if (!session?.accessToken) {
    return null;
  }

  if (session.expiresAt && Date.now() >= session.expiresAt - 30000) {
    expireAuthSession();
    return null;
  }

  return session.accessToken;
}

export function clearAuthSession() {
  removeStorage(AUTH_KEY);
}

export function expireAuthSession(
  message = "Your session expired. Please sign in again.",
) {
  removeStorage(AUTH_KEY);
  writeStorage(SESSION_MESSAGE_KEY, message);
}

export function consumeSessionMessage() {
  const message = readStorage(SESSION_MESSAGE_KEY);
  removeStorage(SESSION_MESSAGE_KEY);
  return message;
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
