import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/theme";
import { formatWordList } from "@/lib/format";
import { AppText as Text } from "@/components/app-typography";
import { AppHeader, AppIcon, Screen, Skeleton } from "@/components";
import { ApiError, getWordDetail, type WordDetailResponse } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMode(value: string | null) {
  if (!value) return "Practice";
  return value === "mcq" ? "MCQ" : value.charAt(0).toUpperCase() + value.slice(1);
}

export default function WordDetailScreen() {
  const params = useLocalSearchParams<{ wordId?: string | string[] }>();
  const wordId = Array.isArray(params.wordId) ? params.wordId[0] : params.wordId;
  const [detail, setDetail] = useState<WordDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      const token = await getAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await getWordDetail(token, wordId);
        if (!active) return;

        setDetail(response);
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError) {
          setError(exception.message);
        } else {
          setError("Unable to load this word right now.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (wordId) {
      void loadDetail();
    }

    return () => {
      active = false;
    };
  }, [wordId]);

  const progress = detail?.progress;
  const stats = detail?.stats;

  return (
    <Screen contentStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
      <AppHeader
        title="Word Detail"
        left={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
            }}>
            <AppIcon name="back" size={16} color={Colors.text} />
          </Pressable>
        }
      />

      <View style={{ gap: 18 }}>
        {error ? (
          <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "700" }}>
            {error}
          </Text>
        ) : null}

        <View
          style={{
            borderRadius: 20,
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.22)",
            padding: 20,
          }}>
          {loading ? (
            <>
              <Skeleton style={{ width: 180, height: 38 }} />
              <Skeleton style={{ width: 220, height: 26, marginTop: 12 }} />
              <Skeleton style={{ width: 260, height: 24, marginTop: 18 }} />
            </>
          ) : detail ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "flex-start",
                }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 34,
                      fontWeight: "800",
                      color: Colors.text,
                    }}>
                    {detail.word.english}
                  </Text>
                  <Text
                    style={{
                      marginTop: 8,
                      fontSize: 22,
                      fontWeight: "800",
                      color: "#0F766E",
                    }}>
                    {formatWordList(detail.word.bangla)}
                  </Text>
                </View>
                <Text
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: "#EEF2FF",
                    color: Colors.muted,
                    fontSize: 10,
                    fontWeight: "800",
                    textTransform: "uppercase",
                  }}>
                  {formatWordList(detail.word.pos) || "Word"}
                </Text>
              </View>

              <View style={{ marginTop: 18, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Text style={{ borderRadius: 999, overflow: "hidden", backgroundColor: "#ECFDF5", color: "#047857", fontSize: 11, fontWeight: "800", paddingHorizontal: 10, paddingVertical: 5 }}>
                  {progress?.status ?? "Not learned"}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} style={{ width: "47%", height: 86, borderRadius: 20 }} />
            ))
          ) : (
            <>
              <Metric label="Strength" value={`${progress?.strength ?? 0}/5`} />
              <Metric label="Accuracy" value={`${stats?.accuracy ?? 0}%`} />
              <Metric label="Mistakes" value={String(progress?.mistakes ?? 0)} />
              <Metric label="Seen" value={String(progress?.seenCount ?? stats?.totalAttempts ?? 0)} />
            </>
          )}
        </View>

        <View
          style={{
            borderRadius: 20,
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: "rgba(148,163,184,0.22)",
            padding: 18,
          }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: Colors.text, textTransform: "uppercase", letterSpacing: 1.4 }}>
            Review Timing
          </Text>
          <Text style={{ marginTop: 14, color: Colors.muted, fontWeight: "700" }}>
            Learned: <Text style={{ color: Colors.text, fontWeight: "800" }}>{formatDate(progress?.learnedAt)}</Text>
          </Text>
          <Text style={{ marginTop: 8, color: Colors.muted, fontWeight: "700" }}>
            Last seen: <Text style={{ color: Colors.text, fontWeight: "800" }}>{formatDate(progress?.lastSeenAt)}</Text>
          </Text>
          <Text style={{ marginTop: 8, color: Colors.muted, fontWeight: "700" }}>
            Next review: <Text style={{ color: Colors.text, fontWeight: "800" }}>{formatDate(progress?.nextReviewAt)}</Text>
          </Text>
        </View>

        <Text style={{ fontSize: 12, fontWeight: "800", color: Colors.text, textTransform: "uppercase", letterSpacing: 1.4 }}>
          Recent Attempts
        </Text>

        {loading ? (
          <View style={{ gap: 10 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} style={{ width: "100%", height: 86, borderRadius: 20 }} />
            ))}
          </View>
        ) : detail?.recentAttempts.length ? (
          <View style={{ gap: 10 }}>
            {detail.recentAttempts.map((attempt) => (
              <View
                key={attempt.id}
                style={{
                  borderRadius: 20,
                  backgroundColor: Colors.surface,
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.22)",
                  padding: 16,
                }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 12,
                  }}>
                  <View>
                    <Text style={{ fontWeight: "800", color: Colors.text }}>
                      {formatMode(attempt.mode)}
                    </Text>
                    <Text style={{ marginTop: 4, color: Colors.muted, fontWeight: "700" }}>
                      {formatDate(attempt.submittedAt)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      borderRadius: 999,
                      overflow: "hidden",
                      backgroundColor: attempt.isCorrect ? "#ECFDF5" : "#FEF2F2",
                      color: attempt.isCorrect ? "#047857" : "#DC2626",
                      fontSize: 11,
                      fontWeight: "800",
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}>
                    {attempt.isCorrect ? "Correct" : "Missed"}
                  </Text>
                </View>
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: "#F1F5F9",
                  }}>
                  <Text style={{ fontWeight: "800", color: Colors.text }}>
                    Your answer: {attempt.yourAnswer || "No answer"}
                  </Text>
                  <Text style={{ marginTop: 6, fontWeight: "800", color: "#0F766E" }}>
                    Correct: {attempt.correctAnswer || "No accepted answer"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View
            style={{
              borderRadius: 20,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
              padding: 20,
              alignItems: "center",
            }}>
            <Text style={{ color: Colors.muted, fontWeight: "700" }}>
              No attempts recorded for this word yet.
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        width: "47%",
        borderRadius: 20,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: "rgba(148,163,184,0.22)",
        padding: 16,
      }}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: Colors.text }}>
        {value}
      </Text>
      <Text
        style={{
          marginTop: 4,
          fontSize: 10,
          fontWeight: "800",
          color: Colors.muted,
          textTransform: "uppercase",
          letterSpacing: 1.2,
        }}>
        {label}
      </Text>
    </View>
  );
}
