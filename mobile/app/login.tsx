import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/constants/theme";
import { AppText as Text } from "@/components/app-typography";
import {
  AppHeader,
  AppIcon,
  BrandInput,
  IconButton,
  PrimaryButton,
  Screen,
} from "@/components";
import { ApiError, login as loginRequest } from "@/lib/api";
import { getOAuthErrorMessage, signInWithGoogle } from "@/lib/oauth";
import { consumeSessionMessage, saveAuthSession } from "@/lib/session";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSessionMessage() {
      const message = await consumeSessionMessage();
      if (active && message) {
        setError(message);
      }
    }

    void loadSessionMessage();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogin() {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const session = await loginRequest({ email, password });
      await saveAuthSession(session);
      router.replace("/(tabs)");
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to sign in right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (googleLoading) return;

    setGoogleLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
      router.replace("/(tabs)");
    } catch (exception) {
      setError(getOAuthErrorMessage(exception));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <Screen>
      <AppHeader
        title="Sign In"
        left={<IconButton icon="back" onPress={() => router.push("/(tabs)")} />}
      />

      <View style={{ gap: 28, paddingTop: 12 }}>
        <View style={{ alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: Colors.orange,
              borderWidth: 2,
              borderColor: "#000",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 0,
            }}>
            <AppIcon name="book" size={28} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.text }}>
            ShobdoLab
          </Text>
          <Text
            style={{ fontSize: 14, color: Colors.muted, fontWeight: "600" }}>
            Welcome back! Continue your streak.
          </Text>
        </View>

        <Pressable
          onPress={() => void handleGoogleLogin()}
          disabled={googleLoading || loading}
          style={{
            minHeight: 56,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: Colors.border,
            backgroundColor: Colors.surface,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            opacity: googleLoading || loading ? 0.7 : 1,
          }}>
          <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
            <Path
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.56 2.68-3.86 2.68-6.62Z"
              fill="#4285F4"
            />
            <Path
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z"
              fill="#34A853"
            />
            <Path
              d="M3.98 10.72A5.4 5.4 0 0 1 3.7 9c0-.6.1-1.18.28-1.72V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.06l3.02-2.34Z"
              fill="#FBBC05"
            />
            <Path
              d="M9 3.58c1.32 0 2.5.46 3.42 1.35l2.56-2.56C13.46.96 11.42 0 9 0 5.48 0 2.48 2.02.96 4.94l3.02 2.34c.7-2.12 2.68-3.7 5.02-3.7Z"
              fill="#EA4335"
            />
          </Svg>
          <Text style={{ fontWeight: "700", color: "#334155" }}>
            {googleLoading ? "Opening Google..." : "Continue with Google"}
          </Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{ flex: 1, height: 1, backgroundColor: Colors.border }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: "#94A3B8",
              letterSpacing: 2,
            }}>
            OR
          </Text>
          <View
            style={{ flex: 1, height: 1, backgroundColor: Colors.border }}
          />
        </View>

        <View style={{ gap: 16 }}>
          <BrandInput
            label="Email"
            icon="mail"
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
          />
          <BrandInput
            label="Password"
            icon="lock"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!visible}
            right={
              <Pressable onPress={() => setVisible((value) => !value)}>
                <Text style={{ color: "#94A3B8", fontWeight: "700" }}>
                  {visible ? "Hide" : "Show"}
                </Text>
              </Pressable>
            }
          />
        </View>

        {error ? (
          <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "700" }}>
            {error}
          </Text>
        ) : null}

        <PrimaryButton
          label="Sign In"
          color={Colors.orange}
          onPress={handleLogin}
          loading={loading}
        />

        <Text style={{ textAlign: "center", color: Colors.muted }}>
          Don&apos;t have an account?{" "}
          <Text
            style={{ color: Colors.blue, fontWeight: "800" }}
            onPress={() => router.push("/signup")}>
            Create one
          </Text>
        </Text>

        <View
          style={{
            flexDirection: "row",
            gap: 12,
            borderWidth: 1,
            borderColor: "rgba(233,213,255,0.8)",
            backgroundColor: "rgba(233,213,255,0.25)",
            borderRadius: 18,
            padding: 16,
            alignItems: "center",
          }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.purple,
              alignItems: "center",
              justifyContent: "center",
            }}>
            <AppIcon name="fire" size={16} color="#7C3AED" />
          </View>
          <View>
            <Text style={{ fontWeight: "800", color: Colors.text }}>
              Keep your streak alive!
            </Text>
            <Text style={{ fontSize: 12, color: Colors.muted }}>
              Sign in to continue your streak.
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}
