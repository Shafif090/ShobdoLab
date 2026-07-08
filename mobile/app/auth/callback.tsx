import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";
import { AppText as Text } from "@/components/app-typography";
import { AppIcon } from "@/components/ui";
import { Colors } from "@/constants/theme";
import { ApiError } from "@/lib/api";
import { completeGoogleSignInFromUrl } from "@/lib/oauth";

function getCurrentCallbackUrl() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.href;
  }

  return Linking.getInitialURL();
}

export default function AuthCallbackRoute() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function finishSignIn() {
      try {
        const url = await getCurrentCallbackUrl();

        if (!url) {
          throw new Error("Google did not return a valid sign-in session.");
        }

        await completeGoogleSignInFromUrl(url);

        if (!active) return;
        router.replace("/(tabs)");
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError) {
          setError(exception.message);
          return;
        }

        if (exception instanceof Error) {
          setError(exception.message);
          return;
        }

        setError("Unable to finish Google sign in right now.");
      }
    }

    void finishSignIn();

    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={[styles.iconWrap, error && styles.iconWrapError]}>
          {error ? (
            <AppIcon name="close" size={26} color="#FFFFFF" />
          ) : (
            <ActivityIndicator color="#FFFFFF" />
          )}
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>
            {error ? "Sign in failed" : "Signing you in..."}
          </Text>
          <Text style={styles.subtitle}>
            {error ??
              "Please wait while ShobdoLab verifies your Google account."}
          </Text>
        </View>
        {error ? (
          <Pressable
            onPress={() => router.replace("/login")}
            style={styles.button}>
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 66,
    height: 66,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.orange,
    borderWidth: 2,
    borderColor: Colors.text,
  },
  iconWrapError: {
    backgroundColor: "#EF4444",
  },
  copy: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
  },
  subtitle: {
    maxWidth: 320,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    color: Colors.muted,
    textAlign: "center",
  },
  button: {
    minHeight: 48,
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: Colors.text,
    paddingHorizontal: 22,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
