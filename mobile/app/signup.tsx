import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
import { ApiError, signup as signupRequest } from "@/lib/api";
import { saveAuthSession } from "@/lib/session";

function scorePassword(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const score = scorePassword(password);
  const matches = password.length > 0 && password === confirmPassword;
  const strengthColors = ["#F47C7C", "#FFC800", "#8E9BFA", "#A1E8AF"];
  const label = useMemo(
    () => ["Too weak", "Weak", "Good", "Strong"][score - 1],
    [score],
  );

  async function handleSignup() {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const session = await signupRequest({
        email,
        password,
        displayName: name,
      });

      if (session.accessToken) {
        await saveAuthSession(session);
        router.replace("/(tabs)");
        return;
      }

      setError("Account created. Please verify your email before signing in.");
      router.replace("/login");
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to create your account right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppHeader
        title="Create Account"
        left={<IconButton icon="back" onPress={() => router.push("/login")} />}
        right={
          <View style={localStyles.stepDots}>
            <View
              style={[localStyles.stepDot, { backgroundColor: Colors.green }]}
            />
            <View
              style={[
                localStyles.stepDot,
                localStyles.stepDotActive,
                { backgroundColor: Colors.blue },
              ]}
            />
            <View
              style={[localStyles.stepDot, { backgroundColor: Colors.border }]}
            />
          </View>
        }
      />

      <View style={{ gap: 24, paddingTop: 12 }}>
        <View style={{ alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              backgroundColor: Colors.blue,
              borderWidth: 2,
              borderColor: "#000",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <AppIcon name="person" size={28} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.text }}>
            Join ShobdoLab
          </Text>
          <Text
            style={{ fontSize: 14, color: Colors.muted, fontWeight: "600" }}>
            Start your language learning journey today.
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <BrandInput
            label="Full Name"
            icon="person"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
          />
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
            placeholder="Create a strong password"
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
          <View style={{ gap: 6, marginTop: -4 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[0, 1, 2, 3].map((segment) => (
                <View
                  key={segment}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 999,
                    backgroundColor:
                      segment < score
                        ? strengthColors[Math.max(score - 1, 0)]
                        : Colors.border,
                  }}
                />
              ))}
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: score > 0 ? strengthColors[score - 1] : "#94A3B8",
              }}>
              {password.length === 0
                ? "Enter a password to check strength"
                : label}
            </Text>
          </View>
          <BrandInput
            label="Confirm Password"
            icon="shield"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            right={
              matches ? (
                <AppIcon name="check" size={16} color={Colors.green} />
              ) : undefined
            }
          />
        </View>

        <Pressable
          onPress={() => setAccepted((value) => !value)}
          style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: accepted ? Colors.green : Colors.border,
              backgroundColor: accepted ? Colors.green : Colors.surface,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 2,
            }}>
            {accepted ? (
              <AppIcon name="check" size={12} color="#FFFFFF" />
            ) : null}
          </View>
          <Text
            style={{
              flex: 1,
              color: Colors.muted,
              fontSize: 12,
              fontWeight: "600",
              lineHeight: 18,
            }}>
            I agree to ShobdoLab&apos;s{" "}
            <Text style={{ color: Colors.blue, fontWeight: "800" }}>
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text style={{ color: Colors.blue, fontWeight: "800" }}>
              Privacy Policy
            </Text>
            .
          </Text>
        </Pressable>

        {error ? (
          <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "700" }}>
            {error}
          </Text>
        ) : null}

        <PrimaryButton
          label="Create Account"
          color={Colors.blue}
          onPress={handleSignup}
          loading={loading}
        />

        <Text style={{ textAlign: "center", color: Colors.muted }}>
          Already have an account?{" "}
          <Text
            style={{ color: Colors.orange, fontWeight: "800" }}
            onPress={() => router.push("/login")}>
            Sign in
          </Text>
        </Text>
      </View>
    </Screen>
  );
}

const localStyles = StyleSheet.create({
  stepDots: {
    flexDirection: "row",
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  stepDotActive: {
    transform: [{ scale: 1.25 }],
  },
});
