import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { AppText as Text } from "@/components/app-typography";
import { AppHeader, AppIcon, Screen, Skeleton } from "@/components";
import {
  ApiError,
  getExerciseHistory,
  type ExerciseHistoryItem,
} from "@/lib/api";
import { getAccessToken } from "@/lib/session";

function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.max(1, seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function modeLabel(mode: string) {
  return mode === "mcq" ? "MCQ" : mode.charAt(0).toUpperCase() + mode.slice(1);
}

export default function ExerciseHistoryScreen() {
  const [items, setItems] = useState<ExerciseHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const loadHistory = useCallback(async (nextPage: number) => {
    if (nextPage > 1 && loadingMoreRef.current) return;

    const token = await getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    if (nextPage === 1) {
      setLoading(true);
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }
    setError(null);

    try {
      const response = await getExerciseHistory(token, nextPage);
      setItems((current) =>
        nextPage === 1 ? response.items : [...current, ...response.items],
      );
      setPage(response.page);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to load exercise history right now.");
      }
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory(1);
  }, [loadHistory]);

  return (
    <Screen contentStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
      <AppHeader
        title="History"
        left={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to Exercise"
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

      <View style={{ gap: 20 }}>
        <View>
          <Text style={{ fontSize: 32, fontWeight: "800", color: Colors.text }}>
            Exercise History
          </Text>
          <Text style={{ marginTop: 6, color: Colors.muted, fontWeight: "700" }}>
            {loading ? "Loading..." : `${total} completed sessions`}
          </Text>
        </View>

        {error ? (
          <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "700" }}>
            {error}
          </Text>
        ) : null}

        {loading ? (
          <View style={{ gap: 14 }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <View
                key={index}
                style={{
                  borderRadius: 20,
                  backgroundColor: Colors.surface,
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.22)",
                  padding: 18,
                  gap: 16,
                }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                  <Skeleton style={{ width: 140, height: 24 }} />
                  <Skeleton style={{ width: 58, height: 58, borderRadius: 29 }} />
                </View>
                <Skeleton style={{ width: "100%", height: 56 }} />
              </View>
            ))}
          </View>
        ) : items.length > 0 ? (
          <View style={{ gap: 14 }}>
            {items.map((item) => (
              <Pressable
                key={item.sessionId}
                onPress={() =>
                  router.push({
                    pathname: "/results",
                    params: { sessionId: item.sessionId },
                  })
                }
                style={{
                  borderRadius: 20,
                  backgroundColor: Colors.surface,
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.22)",
                  padding: 18,
                  shadowColor: Colors.shadow,
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.08,
                  shadowRadius: 24,
                  elevation: 3,
                }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 14,
                    alignItems: "flex-start",
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "800",
                        color: Colors.text,
                      }}>
                      {modeLabel(item.mode)} Practice
                    </Text>
                    <Text
                      style={{
                        marginTop: 4,
                        color: Colors.muted,
                        fontWeight: "700",
                      }}>
                      {formatDate(item.startedAt)}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 29,
                      backgroundColor: "rgba(142,155,250,0.14)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    <Text
                      style={{
                        color: Colors.blue,
                        fontWeight: "800",
                        fontSize: 18,
                      }}>
                      {item.scorePercent}%
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    marginTop: 16,
                    flexDirection: "row",
                    gap: 8,
                  }}>
                  <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#ECFDF5", padding: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.text }}>
                      {item.correctItems}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: Colors.muted, textTransform: "uppercase" }}>
                      Correct
                    </Text>
                  </View>
                  <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#FEF2F2", padding: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.text }}>
                      {item.incorrectItems}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: Colors.muted, textTransform: "uppercase" }}>
                      Missed
                    </Text>
                  </View>
                  <View style={{ flex: 1, borderRadius: 16, backgroundColor: "#F8FAFC", padding: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.text }}>
                      {formatDuration(item.durationSec)}
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: Colors.muted, textTransform: "uppercase" }}>
                      Time
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {item.missedWords.length > 0 ? (
                    item.missedWords.map((word) => (
                      <Text
                        key={`${item.sessionId}-${word.wordId}`}
                        style={{
                          borderRadius: 999,
                          overflow: "hidden",
                          backgroundColor: "#F1F5F9",
                          color: Colors.muted,
                          fontSize: 11,
                          fontWeight: "800",
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }}>
                        {word.word}
                      </Text>
                    ))
                  ) : (
                    <Text
                      style={{
                        borderRadius: 999,
                        overflow: "hidden",
                        backgroundColor: "#ECFDF5",
                        color: "#047857",
                        fontSize: 11,
                        fontWeight: "800",
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                      }}>
                      No missed words
                    </Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View
            style={{
              borderRadius: 20,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
              padding: 24,
              alignItems: "center",
            }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: Colors.text }}>
              No exercise history yet.
            </Text>
            <Text
              style={{
                marginTop: 8,
                textAlign: "center",
                color: Colors.muted,
                fontWeight: "600",
              }}>
              Completed exercise sessions will appear here.
            </Text>
          </View>
        )}

        {hasMore ? (
          <Pressable
            onPress={() => void loadHistory(page + 1)}
            disabled={loadingMore}
            style={{
              minHeight: 52,
              borderRadius: 16,
              backgroundColor: Colors.text,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              opacity: loadingMore ? 0.7 : 1,
            }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
              {loadingMore ? "Loading..." : "Load More"}
            </Text>
            <AppIcon name="arrow" size={14} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}
