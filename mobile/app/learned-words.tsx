import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { formatWordList } from "@/constants/data";
import { AppText as Text } from "@/components/app-typography";
import { AppHeader, AppIcon, Screen, Skeleton } from "@/components";
import {
  ApiError,
  getLearnedWords,
  type LearnedWord,
} from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export default function LearnedWordsScreen() {
  const [words, setWords] = useState<LearnedWord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const loadWords = useCallback(async (nextPage: number) => {
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
      const response = await getLearnedWords(token, nextPage);
      setWords((current) =>
        nextPage === 1 ? response.items : [...current, ...response.items],
      );
      setPage(response.page);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to load learned words right now.");
      }
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadWords(1);
  }, [loadWords]);

  return (
    <Screen contentStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
      <AppHeader
        title="Learned Words"
        left={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to Revise"
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
          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              color: Colors.text,
            }}>
            Recent
          </Text>
          <View
            style={{
              marginTop: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}>
            <Text
              style={{
                backgroundColor: "rgba(161,232,175,0.22)",
                color: "#047857",
                fontSize: 10,
                fontWeight: "800",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 8,
                textTransform: "uppercase",
              }}>
              History
            </Text>
            <Text style={{ color: Colors.muted, fontWeight: "700" }}>
              {loading ? "Loading..." : `${total} Words`}
            </Text>
          </View>
        </View>

        {error ? (
          <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "700" }}>
            {error}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{ height: 1, backgroundColor: Colors.border, flex: 1 }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: "#94A3B8",
              letterSpacing: 2,
            }}>
            NEWEST LEARNED
          </Text>
          <View
            style={{ height: 1, backgroundColor: Colors.border, flex: 1 }}
          />
        </View>

        {loading ? (
          <View style={{ gap: 14 }}>
            {Array.from({ length: 8 }).map((_, index) => (
              <View
                key={index}
                style={{
                  borderRadius: 20,
                  backgroundColor: Colors.surface,
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.22)",
                  padding: 18,
                  gap: 18,
                }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                  }}>
                  <Skeleton style={{ width: 140, height: 32 }} />
                  <Skeleton style={{ width: 58, height: 20, borderRadius: 8 }} />
                </View>
                <Skeleton style={{ width: 170, height: 24 }} />
                <Skeleton style={{ width: 220, height: 22 }} />
              </View>
            ))}
          </View>
        ) : words.length > 0 ? (
          <View style={{ gap: 14 }}>
            {words.map((word) => (
              <View
                key={word.wordId}
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
                    gap: 12,
                    alignItems: "flex-start",
                  }}>
                  <Text
                    style={{
                      fontSize: 26,
                      fontWeight: "800",
                      color: Colors.text,
                      flex: 1,
                    }}>
                    {word.english}
                  </Text>
                  <Text
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                      backgroundColor: "#EEF2FF",
                      color: Colors.muted,
                      fontSize: 10,
                      fontWeight: "800",
                      textTransform: "uppercase",
                    }}>
                    {formatWordList(word.pos)}
                  </Text>
                </View>

                <View
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTopWidth: 1,
                    borderTopColor: "#F1F5F9",
                  }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "800",
                      color: "#0F766E",
                    }}>
                    {formatWordList(word.bangla)}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 12,
                    }}>
                    <Text
                      style={{
                        borderRadius: 999,
                        overflow: "hidden",
                        backgroundColor: "#F1F5F9",
                        color: Colors.muted,
                        fontSize: 10,
                        fontWeight: "800",
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        textTransform: "uppercase",
                      }}>
                      {word.status}
                    </Text>
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
                      Strength {word.strength}/5
                    </Text>
                    <Text
                      style={{
                        borderRadius: 999,
                        overflow: "hidden",
                        backgroundColor: "#F0F9FF",
                        color: "#0369A1",
                        fontSize: 11,
                        fontWeight: "800",
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                      }}>
                      Seen {word.seenCount}
                    </Text>
                  </View>
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
              padding: 24,
              alignItems: "center",
            }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: Colors.text,
              }}>
              No learned words yet.
            </Text>
            <Text
              style={{
                marginTop: 8,
                textAlign: "center",
                color: Colors.muted,
                fontWeight: "600",
              }}>
              Words appear here after you learn them.
            </Text>
          </View>
        )}

        {hasMore ? (
          <Pressable
            onPress={() => void loadWords(page + 1)}
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
