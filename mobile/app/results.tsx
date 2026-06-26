import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { Colors } from "@/constants/theme";
import { AppText as Text } from "@/components/app-typography";
import { AppHeader, AppIcon, IconButton, Screen, Skeleton } from "@/components";
import { result } from "@/constants/data";
import {
  ApiError,
  getQuizResult,
  retryQuizSession,
  type QuizResultResponse,
} from "@/lib/api";
import {
  getAccessToken,
  loadQuizSessionId,
  saveQuizSessionId,
} from "@/lib/session";

export default function ResultsScreen() {
  const { sessionId: requestedSessionId } = useLocalSearchParams<{
    sessionId?: string;
  }>();
  const [liveResult, setLiveResult] = useState<QuizResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadResult() {
      const token = await getAccessToken();
      const sessionId = requestedSessionId || (await loadQuizSessionId());
      if (!token || !sessionId) {
        setLoading(false);
        return;
      }

      try {
        const response = await getQuizResult(token, sessionId);
        if (!active) return;

        setLiveResult(response);
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError) {
          setError(exception.message);
          return;
        }

        setError("Unable to load your latest result right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadResult();

    return () => {
      active = false;
    };
  }, [requestedSessionId]);

  const summary = liveResult?.summary;
  const score = summary ? Math.round(summary.accuracy * 100) : result.score;
  const correct = summary?.correctItems ?? result.correct;
  const incorrect = summary?.incorrectItems ?? result.incorrect;
  const duration = liveResult?.session.duration_ms
    ? `${Math.max(1, Math.round(liveResult.session.duration_ms / 1000))}s`
    : result.duration;
  const missedItems = liveResult?.breakdown?.length
    ? liveResult.breakdown.filter((item) => !item.isCorrect)
    : liveResult?.incorrectItems.map((item, index) => ({
        ...item,
        quizItemId: item.wordId,
        wordId: item.wordId,
        questionType: "review",
        sequenceNo: index + 1,
      }));
  const fallbackMissedItems =
    !loading && !liveResult
      ? [
          {
            quizItemId: "demo",
            wordId: "demo",
            word: result.missedWord,
            questionType: "review",
            sequenceNo: 1,
            yourAnswer: result.yourAnswer,
            correctAnswer: result.correctAnswer,
          },
        ]
      : [];
  const quickBreakdownItems = missedItems ?? fallbackMissedItems;

  async function handleRetry() {
    const token = await getAccessToken();
    const sessionId = requestedSessionId || (await loadQuizSessionId());
    if (!token || !sessionId || !liveResult?.canRetry) {
      return;
    }

    try {
      const response = await retryQuizSession(token, sessionId);
      await saveQuizSessionId(response.session.id);
      router.push(response.session.mode === "mcq" ? "/quiz" : "/typing");
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
        return;
      }

      setError("Unable to retry this quiz right now.");
    }
  }

  return (
    <Screen>
      <AppHeader
        title="Results"
        left={
          <IconButton
            icon="back"
            onPress={() => router.push("/(tabs)/exercise")}
          />
        }
        right={<IconButton icon="share" />}
      />

      <View style={{ gap: 22, alignItems: "center", paddingTop: 12 }}>
        <Text
          style={{
            textAlign: "center",
            fontSize: 42,
            lineHeight: 42,
            fontWeight: "800",
            color: Colors.orange,
            textTransform: "uppercase",
          }}>
          Quiz{"\n"}Complete!
        </Text>

        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <View
            style={{
              width: 164,
              height: 164,
              borderRadius: 82,
              backgroundColor: Colors.blue,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 4,
              borderColor: "#FFFFFF",
              shadowColor: Colors.blue,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 22,
              elevation: 5,
            }}>
            {loading ? (
              <Skeleton style={{ width: 92, height: 52, backgroundColor: "rgba(255,255,255,0.35)" }} />
            ) : (
              <>
                <Text style={{ fontSize: 48, fontWeight: "800", color: "#FFFFFF" }}>
                  {score}%
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: 1.4,
                  }}>
                  Score
                </Text>
              </>
            )}
          </View>
          <View
            style={{
              position: "absolute",
              right: -10,
              bottom: 8,
              backgroundColor: Colors.surface,
              borderRadius: 999,
              borderWidth: 2,
              borderColor: Colors.border,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flexDirection: "row",
              gap: 6,
              alignItems: "center",
            }}>
            <AppIcon name="clock" size={12} color={Colors.orange} />
            {loading ? (
              <Skeleton style={{ width: 34, height: 16 }} />
            ) : (
              <Text style={{ fontWeight: "800", color: Colors.text }}>
                {duration}
              </Text>
            )}
          </View>
        </View>

        {error ? (
          <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "700" }}>
            {error}
          </Text>
        ) : null}

        <View style={{ width: "100%", flexDirection: "row", gap: 12 }}>
          <View
            style={{
              flex: 1,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(161,232,175,0.4)",
              backgroundColor: "rgba(161,232,175,0.25)",
              padding: 16,
              alignItems: "center",
            }}>
            {loading ? (
              <Skeleton style={{ width: 36, height: 34 }} />
            ) : (
              <Text
                style={{ fontSize: 28, fontWeight: "800", color: Colors.text }}>
                {correct}
              </Text>
            )}
            <Text
              style={{
                fontSize: 10,
                fontWeight: "800",
                color: Colors.muted,
                textTransform: "uppercase",
                letterSpacing: 1.2,
              }}>
              Correct
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(244,124,124,0.3)",
              backgroundColor: "rgba(244,124,124,0.1)",
              padding: 16,
              alignItems: "center",
            }}>
            {loading ? (
              <Skeleton style={{ width: 36, height: 34 }} />
            ) : (
              <Text
                style={{ fontSize: 28, fontWeight: "800", color: Colors.text }}>
                {incorrect}
              </Text>
            )}
            <Text
              style={{
                fontSize: 10,
                fontWeight: "800",
                color: Colors.muted,
                textTransform: "uppercase",
                letterSpacing: 1.2,
              }}>
              Incorrect
            </Text>
          </View>
        </View>

        <View style={{ width: "100%", gap: 10 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "800",
              color: Colors.text,
              textTransform: "uppercase",
              letterSpacing: 1.3,
            }}>
            Quick Breakdown
          </Text>
          {loading ? (
            <View style={{ gap: 10 }}>
              {Array.from({ length: 3 }).map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: "100%",
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: "rgba(244,124,124,0.2)",
                    backgroundColor: Colors.surface,
                    padding: 16,
                    flexDirection: "row",
                    gap: 12,
                  }}>
                  <Skeleton style={{ width: 32, height: 32, borderRadius: 16 }} />
                  <View style={{ flex: 1 }}>
                    <Skeleton style={{ width: 90, height: 14 }} />
                    <Skeleton style={{ width: 120, height: 16, marginTop: 8 }} />
                    <Skeleton style={{ width: 130, height: 16, marginTop: 8 }} />
                  </View>
                </View>
              ))}
            </View>
          ) : quickBreakdownItems.length > 0 ? (
            <View style={{ gap: 10 }}>
              {quickBreakdownItems.map((item) => (
                <Pressable
                  key={item.quizItemId}
                  onPress={() => {
                    if (item.wordId !== "demo") {
                      router.push(`/word/${item.wordId}`);
                    }
                  }}
                  style={{
                    width: "100%",
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: "rgba(244,124,124,0.2)",
                    backgroundColor: Colors.surface,
                    padding: 16,
                    flexDirection: "row",
                    gap: 12,
                  }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: "rgba(244,124,124,0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    <AppIcon name="close" size={14} color={Colors.orange} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 6,
                        alignItems: "center",
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "800",
                          color: Colors.muted,
                          textTransform: "uppercase",
                        }}>
                        {item.word}
                      </Text>
                      <Text
                        style={{
                          borderRadius: 999,
                          overflow: "hidden",
                          backgroundColor: "#F1F5F9",
                          color: Colors.muted,
                          fontSize: 10,
                          fontWeight: "800",
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          textTransform: "uppercase",
                        }}>
                        #{item.sequenceNo} {item.questionType}
                      </Text>
                    </View>
                    <Text
                      style={{
                        marginTop: 6,
                        fontWeight: "800",
                        color: Colors.text,
                        textDecorationLine: "line-through",
                      }}>
                      {item.yourAnswer || "No answer"}
                    </Text>
                    <Text
                      style={{
                        marginTop: 6,
                        fontWeight: "800",
                        color: "#16A34A",
                      }}>
                      {item.correctAnswer || "No accepted answer"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View
              style={{
                width: "100%",
                borderRadius: 20,
                borderWidth: 2,
                borderColor: "rgba(161,232,175,0.35)",
                backgroundColor: Colors.surface,
                padding: 16,
                flexDirection: "row",
                gap: 12,
              }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#ECFDF5",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                <AppIcon name="check" size={14} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontWeight: "800",
                    color: Colors.text,
                  }}>
                  No missed words
                </Text>
                <Text
                  style={{
                    marginTop: 6,
                    fontWeight: "600",
                    color: Colors.muted,
                  }}>
                  Every answer in this session was correct.
                </Text>
              </View>
            </View>
          )}
        </View>

        <Pressable
          onPress={() => void handleRetry()}
          disabled={!liveResult?.canRetry}
          style={{
            width: "100%",
            minHeight: 58,
            borderRadius: 18,
            backgroundColor: Colors.blue,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            marginTop: 8,
            opacity: liveResult?.canRetry ? 1 : 0.65,
          }}>
          <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "800" }}>
            Test Again
          </Text>
          <AppIcon name="revise" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </Screen>
  );
}
