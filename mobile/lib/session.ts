import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AuthSession } from "./api";

const SESSION_KEY = "shobdolab.auth-session";
const QUIZ_SESSION_KEY = "shobdolab.quiz-session-id";
const SESSION_MESSAGE_KEY = "shobdolab.session-message";

function canUseWebStorage() {
  return Platform.OS === "web" && typeof window !== "undefined";
}

async function setStorageItem(key: string, value: string) {
  if (canUseWebStorage()) {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getStorageItem(key: string) {
  if (canUseWebStorage()) {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function deleteStorageItem(key: string) {
  if (canUseWebStorage()) {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function saveAuthSession(session: AuthSession) {
  const expiresAt =
    session.expiresAt ??
    (session.expiresIn ? Date.now() + session.expiresIn * 1000 : null);

  await setStorageItem(SESSION_KEY, JSON.stringify({ ...session, expiresAt }));
  await deleteStorageItem(SESSION_MESSAGE_KEY);
}

export async function loadAuthSession() {
  const stored = await getStorageItem(SESSION_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthSession;
  } catch {
    return null;
  }
}

export async function getAccessToken() {
  const session = await loadAuthSession();
  if (session?.expiresAt && Date.now() >= session.expiresAt - 30000) {
    await expireAuthSession();
    return null;
  }

  return session?.accessToken ?? null;
}

export async function clearAuthSession() {
  await deleteStorageItem(SESSION_KEY);
}

export async function expireAuthSession(
  message = "Your session expired. Please sign in again.",
) {
  await deleteStorageItem(SESSION_KEY);
  await setStorageItem(SESSION_MESSAGE_KEY, message);
}

export async function consumeSessionMessage() {
  const message = await getStorageItem(SESSION_MESSAGE_KEY);
  await deleteStorageItem(SESSION_MESSAGE_KEY);
  return message;
}

export async function saveQuizSessionId(sessionId: string) {
  await setStorageItem(QUIZ_SESSION_KEY, sessionId);
}

export async function loadQuizSessionId() {
  return getStorageItem(QUIZ_SESSION_KEY);
}

export async function clearQuizSessionId() {
  await deleteStorageItem(QUIZ_SESSION_KEY);
}
