import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Colors } from "@/constants/theme";
import {
  AppText as Text,
  AppTextInput as TextInput,
} from "@/components/app-typography";
import {
  AppIcon,
  IconButton,
  Screen,
  Skeleton,
  SpeakerButton,
} from "@/components";
import {
  ApiError,
  finishQuizSession,
  getCurrentSet,
  getQuizSession,
  startLearnQuiz,
  submitQuizAnswer,
  type LearningSetResponse,
  type QuizItem,
} from "@/lib/api";
import {
  getAccessToken,
  loadQuizSessionId,
  saveQuizSessionId,
} from "@/lib/session";

export default function TypingScreen() {
  const [currentSet, setCurrentSet] = useState<
    LearningSetResponse["set"] | null
  >(null);
  const [currentItem, setCurrentItem] = useState<QuizItem | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const questionStartedAtRef = useRef(Date.now());
  const totalItems = sessionTotal || currentSet?.total_words || 0;
  const progressPercent =
    currentItem && totalItems > 0 ? (currentItem.sequence_no / totalItems) * 100 : 0;

  useEffect(() => {
    let active = true;

    async function loadTyping() {
      const token = await getAccessToken();
      if (!token) {
        router.replace("/login");
        setInitialLoading(false);
        return;
      }

      const storedSessionId = await loadQuizSessionId();

      try {
        if (storedSessionId) {
          const response = await getQuizSession(token, storedSessionId);
          if (!active) return;

          setSessionId(storedSessionId);
          setSessionTotal(response.session.total_items || response.totalItems);
          setCurrentItem(response.currentItem);
          setValue("");
        } else {
          const setResponse = await getCurrentSet(token);
          if (!active) return;

          setCurrentSet(setResponse.set);
          const startResponse = await startLearnQuiz(token, setResponse.set.id);
          if (!active) return;

          setSessionId(startResponse.session.id);
          setSessionTotal(startResponse.session.total_items);
          await saveQuizSessionId(startResponse.session.id);
          setCurrentItem(startResponse.firstItem);
          setValue("");
        }

        const latestSet = await getCurrentSet(token);
        if (!active) return;
        setCurrentSet(latestSet.set);
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError) {
          setError(exception.message);
          return;
        }

        setError("Unable to load the typing exercise right now.");
      } finally {
        if (active) {
          setInitialLoading(false);
        }
      }
    }

    void loadTyping();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (currentItem) {
      questionStartedAtRef.current = Date.now();
    }
  }, [currentItem]);

  async function handleCheck() {
    if (loading) return;

    const token = await getAccessToken();
    if (!token || !sessionId || !currentItem) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await submitQuizAnswer(
        token,
        sessionId,
        value,
        currentItem.id,
        Math.max(0, Date.now() - questionStartedAtRef.current),
      );
      setSessionTotal(response.session.total_items);

      if (response.completed || !response.nextItem) {
        await finishQuizSession(token, sessionId);
        await saveQuizSessionId(sessionId);
        router.push("/result");
        return;
      }

      if (response.nextItem.question_type === "mcq") {
        router.push("/quiz");
        return;
      }

      setCurrentItem(response.nextItem);
      setValue("");
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to submit your answer right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: 28, flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingTop: 16,
          }}>
          <IconButton
            icon="close"
            onPress={() => router.push("/(tabs)/exercise")}
          />
          <View
            style={{
              flex: 1,
              height: 8,
              borderRadius: 999,
              backgroundColor: "#F1F5F9",
              overflow: "hidden",
            }}>
            <View
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                backgroundColor: Colors.blue,
                borderRadius: 999,
              }}
            />
          </View>
          <Text style={{ color: "#94A3B8", fontWeight: "800" }}>
            {currentItem?.sequence_no ?? 0}/{totalItems}
          </Text>
        </View>

        <View style={{ alignItems: "center", gap: 16, marginTop: 12 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: Colors.blue,
              textTransform: "uppercase",
              letterSpacing: 1.4,
            }}>
            Type the translation
          </Text>
          {initialLoading ? (
            <Skeleton style={{ width: 180, height: 48 }} />
          ) : (
            <Text style={{ fontSize: 42, fontWeight: "800", color: Colors.text }}>
              {currentItem?.prompt_text ?? "No question loaded"}
            </Text>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <SpeakerButton
              text={initialLoading ? "" : currentItem?.prompt_text ?? ""}
            />
          </View>
        </View>

        <View style={{ position: "relative" }}>
          {initialLoading ? (
            <Skeleton style={{ width: "100%", height: 62, borderRadius: 18 }} />
          ) : (
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder="Type your answer here..."
              placeholderTextColor="#C7CDD5"
              style={{
                minHeight: 62,
                borderRadius: 18,
                borderWidth: 2,
                borderColor: Colors.border,
                backgroundColor: Colors.surface,
                paddingHorizontal: 52,
                textAlign: "center",
                fontSize: 22,
                fontWeight: "800",
                color: Colors.text,
              }}
            />
          )}
          <View style={{ position: "absolute", right: 18, top: 18 }}>
            <AppIcon name="keyboard" size={18} color="#CBD5E1" />
          </View>
        </View>

        {error ? (
          <Text
            style={{
              color: "#DC2626",
              fontSize: 12,
              fontWeight: "700",
              textAlign: "center",
            }}>
            {error}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            gap: 12,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "rgba(161,232,175,0.35)",
            backgroundColor: "rgba(161,232,175,0.16)",
            padding: 16,
          }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: Colors.green,
              alignItems: "center",
              justifyContent: "center",
            }}>
            <AppIcon name="check" size={14} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", color: Colors.text }}>
              Live typing exercise
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: Colors.muted }}>
              The backend session is driving this prompt.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => void handleCheck()}
          disabled={loading}
          style={{
            marginTop: "auto",
            minHeight: 58,
            borderRadius: 18,
            backgroundColor: Colors.blue,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            opacity: loading ? 0.75 : 1,
          }}>
          <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "800" }}>
            {loading ? "Checking..." : "Check"}
          </Text>
          <AppIcon name="check" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </Screen>
  );
}
