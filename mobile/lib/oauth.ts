import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { ApiError, createOAuthSession, getGoogleAuthUrl } from "./api";
import { saveAuthSession } from "./session";

WebBrowser.maybeCompleteAuthSession();

function readOAuthParams(url: string) {
  const parsed = Linking.parse(url);
  const queryParams = parsed.queryParams ?? {};
  const hash = url.includes("#") ? url.split("#")[1] : "";
  const hashParams = new URLSearchParams(hash);

  const accessToken =
    hashParams.get("access_token") ??
    (typeof queryParams.access_token === "string"
      ? queryParams.access_token
      : null);
  const refreshToken =
    hashParams.get("refresh_token") ??
    (typeof queryParams.refresh_token === "string"
      ? queryParams.refresh_token
      : null);
  const expiresInRaw =
    hashParams.get("expires_in") ??
    (typeof queryParams.expires_in === "string" ? queryParams.expires_in : null);
  const expiresAtRaw =
    hashParams.get("expires_at") ??
    (typeof queryParams.expires_at === "string" ? queryParams.expires_at : null);
  const errorDescription =
    hashParams.get("error_description") ??
    (typeof queryParams.error_description === "string"
      ? queryParams.error_description
      : null) ??
    hashParams.get("error") ??
    (typeof queryParams.error === "string" ? queryParams.error : null);

  return {
    accessToken,
    refreshToken,
    expiresIn: expiresInRaw ? Number(expiresInRaw) : null,
    expiresAt: expiresAtRaw ? Number(expiresAtRaw) * 1000 : null,
    errorDescription,
  };
}

export async function signInWithGoogle() {
  const redirectTo = Linking.createURL("auth/callback");
  const response = await getGoogleAuthUrl(redirectTo);
  const result = await WebBrowser.openAuthSessionAsync(response.url, redirectTo);

  if (result.type !== "success") {
    throw new Error("Google sign in was cancelled.");
  }

  const oauth = readOAuthParams(result.url);

  if (oauth.errorDescription) {
    throw new Error(oauth.errorDescription);
  }

  if (!oauth.accessToken) {
    throw new Error("Google did not return a valid sign-in session.");
  }

  const session = await createOAuthSession({
    accessToken: oauth.accessToken,
    refreshToken: oauth.refreshToken,
    expiresIn: oauth.expiresIn,
    expiresAt: oauth.expiresAt,
  });

  await saveAuthSession(session);
  return session;
}

export function getOAuthErrorMessage(exception: unknown) {
  if (exception instanceof ApiError) {
    return exception.message;
  }

  if (exception instanceof Error) {
    return exception.message;
  }

  return "Unable to sign in with Google right now.";
}
