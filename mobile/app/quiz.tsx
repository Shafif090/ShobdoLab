import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Colors } from "@/constants/theme";
import { AppText as Text } from "@/components/app-typography";
import { AppIcon, IconButton, Screen, Skeleton } from "@/components";
import { formatWordList } from "@/lib/format";
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

function getAcceptedAnswer(item: QuizItem | null) {
  if (!item?.accepted_answers) return "";
  if (Array.isArray(item.accepted_answers)) {
    return item.accepted_answers[0] ?? "";
  }
  return item.accepted_answers;
}

export default function QuizScreen() {
  const [currentSet, setCurrentSet] = useState<
    LearningSetResponse["set"] | null
  >(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [currentItem, setCurrentItem] = useState<QuizItem | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const totalItems = sessionTotal || currentSet?.total_words || 0;
  const progressPercent =
    currentItem && totalItems > 0 ? (currentItem.sequence_no / totalItems) * 100 : 0;

  useEffect(() => {
    let active = true;

    async function loadQuiz() {
      const token = await getAccessToken();
      if (!token) {
        router.replace("/login");
        setLoading(false);
        return;
      }

      const storedSessionId = await loadQuizSessionId();

      try {
        if (storedSessionId) {
          const sessionResponse = await getQuizSession(token, storedSessionId);
          if (!active) return;

          setSessionId(storedSessionId);
          setSessionTotal(
            sessionResponse.session.total_items || sessionResponse.totalItems,
          );
          setCurrentItem(sessionResponse.currentItem);
          setSelectedAnswer("");
        } else {
          const setResponse = await getCurrentSet(token);
          if (!active) return;

          setCurrentSet(setResponse.set);
          const startResponse = await startLearnQuiz(token, setResponse.set.id);
          if (!active) return;

          await saveQuizSessionId(startResponse.session.id);
          setSessionId(startResponse.session.id);
          setSessionTotal(startResponse.session.total_items);
          setCurrentItem(startResponse.firstItem);
          setSelectedAnswer("");
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

        setError("Unable to load the quiz right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadQuiz();

    return () => {
      active = false;
    };
  }, []);

  const options = useMemo(() => {
    const correctAnswer = getAcceptedAnswer(currentItem);
    if (currentItem?.options?.length) {
      return currentItem.options;
    }

    const values = Array.from(
      new Set([
        correctAnswer,
        ...(currentSet?.items
          .map((item) => formatWordList(item.word?.bangla))
          .filter(Boolean) ?? []),
      ]),
    ).filter(Boolean);

    while (values.length < 4) {
      values.push(`Option ${values.length + 1}`);
    }

    return values.slice(0, 4);
  }, [currentSet, currentItem]);

  async function handleContinue() {
    if (submitting || !selectedAnswer) return;

    const token = await getAccessToken();
    if (!token || !sessionId || !currentItem) {
      router.replace("/login");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await submitQuizAnswer(
        token,
        sessionId,
        selectedAnswer,
        currentItem.id,
      );
      setSessionTotal(response.session.total_items);

      if (response.completed || !response.nextItem) {
        await finishQuizSession(token, sessionId);
        await saveQuizSessionId(sessionId);
        router.push("/result");
        return;
      }

      if (response.nextItem.question_type === "typing") {
        router.push("/typing");
        return;
      }

      setCurrentItem(response.nextItem);
      setSelectedAnswer("");
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to submit your answer right now.");
      }
    } finally {
      setSubmitting(false);
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

        <View style={{ alignItems: "center", gap: 16 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: Colors.blue,
              textTransform: "uppercase",
              letterSpacing: 1.4,
            }}>
            What is the meaning of the following word?
          </Text>
          {loading ? (
            <Skeleton style={{ width: 190, height: 44 }} />
          ) : (
            <Text style={{ fontSize: 36, fontWeight: "800", color: Colors.text }}>
              {currentItem?.prompt_text ?? "No question loaded"}
            </Text>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <IconButton icon="volume" />
            <IconButton icon="turtle" />
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

        <View style={{ gap: 12 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} style={{ width: "100%", height: 60 }} />
            ))
          ) : (
            options.map((option) => {
            const selected = option === selectedAnswer;
            return (
              <Pressable
                key={option}
                onPress={() => setSelectedAnswer(option)}
                style={{
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: selected ? Colors.green : Colors.border,
                  backgroundColor: selected
                    ? "rgba(161,232,175,0.18)"
                    : Colors.surface,
                  padding: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: selected ? "800" : "700",
                    color: Colors.text,
                  }}>
                  {option}
                </Text>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: selected ? 0 : 2,
                    borderColor: "#E2E8F0",
                    backgroundColor: selected ? Colors.green : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  {selected ? (
                    <AppIcon name="check" size={12} color="#FFFFFF" />
                  ) : null}
                </View>
              </Pressable>
            );
            })
          )}
        </View>

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
              Live question loaded
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: Colors.muted }}>
              The next screen will continue using the backend-backed session.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => void handleContinue()}
          disabled={loading || submitting || !selectedAnswer}
          style={{
            marginTop: "auto",
            minHeight: 58,
            borderRadius: 18,
            backgroundColor: Colors.blue,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            opacity: loading || submitting || !selectedAnswer ? 0.7 : 1,
          }}>
          <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "800" }}>
            {submitting ? "Saving..." : "Continue"}
          </Text>
          <AppIcon name="arrow" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </Screen>
  );
}
