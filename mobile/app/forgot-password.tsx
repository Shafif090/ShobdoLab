import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
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
import { ApiError, forgotPassword } from "@/lib/api";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResetRequest() {
    if (loading) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await forgotPassword({ email });
      setMessage(response.message);
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to send a reset email right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <AppHeader
        title="Reset Password"
        left={<IconButton icon="back" onPress={() => router.push("/login")} />}
      />

      <View style={{ gap: 28, paddingTop: 12 }}>
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
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 0,
            }}>
            <AppIcon name="lock" size={26} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.text }}>
            Forgot password?
          </Text>
          <Text
            style={{
              maxWidth: 300,
              textAlign: "center",
              fontSize: 14,
              color: Colors.muted,
              fontWeight: "600",
            }}>
            Enter your email and we&apos;ll send you a secure reset link.
          </Text>
        </View>

        <BrandInput
          label="Email"
          icon="mail"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
        />

        {message ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: "rgba(16,185,129,0.28)",
              backgroundColor: "rgba(16,185,129,0.10)",
              borderRadius: 18,
              padding: 16,
            }}>
            <Text style={{ color: "#047857", fontSize: 13, fontWeight: "800" }}>
              {message}
            </Text>
          </View>
        ) : null}

        {error ? (
          <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "700" }}>
            {error}
          </Text>
        ) : null}

        <PrimaryButton
          label="Send Reset Link"
          color={Colors.blue}
          onPress={handleResetRequest}
          loading={loading}
        />

        <Text style={{ textAlign: "center", color: Colors.muted }}>
          Remembered your password?{" "}
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
