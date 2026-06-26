import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { formatWordList } from "@/lib/format";
import { AppText as Text } from "@/components/app-typography";
import { AppIcon, Skeleton, TabScreen } from "@/components";
import {
  addWord,
  ApiError,
  practiceWord,
  searchWords,
  type DictionaryWord,
} from "@/lib/api";
import {
  clearQuizSessionId,
  getAccessToken,
  saveQuizSessionId,
} from "@/lib/session";

export default function DictionaryTab() {
  const [query, setQuery] = useState("");
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyWordId, setBusyWordId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  const loadWords = useCallback(
    async (nextPage: number, nextQuery = query) => {
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
        const response = await searchWords(token, nextQuery, nextPage, 20);
        setWords((current) =>
          nextPage === 1 ? response.items : [...current, ...response.items],
        );
        setPage(response.page);
        setTotal(response.total);
        setHasMore(response.hasMore);
      } catch (exception) {
        setError(
          exception instanceof ApiError
            ? exception.message
            : "Unable to search the dictionary right now.",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [query],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadWords(1, query);
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadWords, query]);

  async function addSelectedWord(wordId: string) {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setBusyWordId(wordId);
    setError(null);

    try {
      const response = await addWord(token, wordId);
      setWords((current) =>
        current.map((word) =>
          word.wordId === wordId ? { ...response.item, wordId: String(response.item.wordId) } : word,
        ),
      );
    } catch (exception) {
      setError(
        exception instanceof ApiError
          ? exception.message
          : "Unable to add this word right now.",
      );
    } finally {
      setBusyWordId(null);
    }
  }

  async function startPractice(wordId: string) {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setBusyWordId(wordId);
    setError(null);

    try {
      const response = await practiceWord(token, wordId, "mixed");
      await saveQuizSessionId(response.session.id);
      router.push("/typing");
    } catch (exception) {
      await clearQuizSessionId();
      setError(
        exception instanceof ApiError
          ? exception.message
          : "Unable to start practice right now.",
      );
    } finally {
      setBusyWordId(null);
    }
  }

  return (
    <TabScreen title="Dictionary" active="dictionary">
      <View style={{ gap: 22 }}>
        <View
          style={{
            borderRadius: 24,
            borderWidth: 1,
            borderColor: Colors.border,
            backgroundColor: Colors.surface,
            padding: 20,
            gap: 16,
          }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 12,
            }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: "800",
                  color: Colors.text,
                }}>
                Dictionary
              </Text>
              <Text
                style={{
                  marginTop: 6,
                  color: Colors.muted,
                  fontWeight: "600",
                  lineHeight: 20,
                }}>
                Search all words, add them to your list, or practice one now.
              </Text>
            </View>
            <Text
              style={{
                borderRadius: 999,
                overflow: "hidden",
                backgroundColor: "#F1F5F9",
                paddingHorizontal: 10,
                paddingVertical: 5,
                color: Colors.muted,
                fontSize: 11,
                fontWeight: "800",
              }}>
              {loading ? "Searching" : `${total} words`}
            </Text>
          </View>

          <View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: Colors.muted,
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}>
              Search
            </Text>
            <View
              style={{
                marginTop: 8,
                minHeight: 54,
                borderRadius: 18,
                borderWidth: 2,
                borderColor: Colors.border,
                backgroundColor: Colors.surface,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                gap: 10,
              }}>
              <AppIcon name="search" size={16} color="#9CA3AF" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="English or Bangla"
                placeholderTextColor="#C7CDD5"
                style={{
                  flex: 1,
                  fontFamily: "Inter",
                  color: Colors.text,
                  fontWeight: "700",
                }}
              />
            </View>
          </View>
        </View>

        {error ? (
          <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "700" }}>
            {error}
          </Text>
        ) : null}

        {loading ? (
          <View style={{ gap: 14 }}>
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} style={{ height: 184, borderRadius: 22 }} />
            ))}
          </View>
        ) : words.length > 0 ? (
          <View style={{ gap: 14 }}>
            {words.map((word) => (
              <View
                key={word.wordId}
                style={{
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.22)",
                  backgroundColor: Colors.surface,
                  padding: 18,
                  shadowColor: Colors.shadow,
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.08,
                  shadowRadius: 20,
                  elevation: 2,
                }}>
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
                        fontSize: 26,
                        fontWeight: "800",
                        color: Colors.text,
                      }}>
                      {word.english}
                    </Text>
                    <Text
                      style={{
                        marginTop: 8,
                        fontSize: 18,
                        fontWeight: "800",
                        color: "#0F766E",
                      }}>
                      {formatWordList(word.bangla)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                      overflow: "hidden",
                      backgroundColor: "#EEF2FF",
                      color: Colors.muted,
                      fontSize: 10,
                      fontWeight: "800",
                      textTransform: "uppercase",
                    }}>
                    {formatWordList(word.pos) || "Word"}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 14,
                  }}>
                  <Text
                    style={[
                      chipStyle,
                      word.learned
                        ? { backgroundColor: "#ECFDF5", color: "#047857" }
                        : null,
                    ]}>
                    {word.learned
                      ? `${word.progress?.status ?? "Learning"} · Strength ${word.progress?.strength ?? 0}/5`
                      : "Not added"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
                  <Pressable
                    onPress={() => void addSelectedWord(word.wordId)}
                    disabled={word.learned || busyWordId === word.wordId}
                    style={[
                      actionButtonStyle,
                      { backgroundColor: Colors.green, opacity: word.learned ? 0.55 : 1 },
                    ]}>
                    <Text style={actionButtonTextDark}>
                      {word.learned ? "Added" : "Add"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void startPractice(word.wordId)}
                    disabled={busyWordId === word.wordId}
                    style={[actionButtonStyle, { backgroundColor: Colors.text }]}>
                    <Text style={actionButtonTextLight}>Practice</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push(`/word/${word.wordId}`)}
                    style={[
                      actionButtonStyle,
                      {
                        backgroundColor: Colors.surface,
                        borderWidth: 1,
                        borderColor: Colors.border,
                      },
                    ]}>
                    <Text style={actionButtonTextDark}>Details</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View
            style={{
              borderRadius: 24,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
              padding: 24,
              alignItems: "center",
            }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: Colors.text }}>
              No words found.
            </Text>
            <Text
              style={{
                marginTop: 8,
                color: Colors.muted,
                fontWeight: "600",
                textAlign: "center",
              }}>
              Try a different English or Bangla word.
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
              opacity: loadingMore ? 0.7 : 1,
            }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
              {loadingMore ? "Loading..." : "Load More"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </TabScreen>
  );
}

const chipStyle = {
  borderRadius: 999,
  overflow: "hidden" as const,
  backgroundColor: "#F1F5F9",
  color: Colors.muted,
  fontSize: 10,
  fontWeight: "800" as const,
  paddingHorizontal: 10,
  paddingVertical: 5,
  textTransform: "uppercase" as const,
};

const actionButtonStyle = {
  flex: 1,
  minHeight: 42,
  borderRadius: 14,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  paddingHorizontal: 8,
};

const actionButtonTextDark = {
  color: Colors.text,
  fontSize: 12,
  fontWeight: "800" as const,
};

const actionButtonTextLight = {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: "800" as const,
};
