import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/theme";
import { formatWordList } from "@/constants/data";
import { AppText as Text } from "@/components/app-typography";
import { AppHeader, AppIcon, Screen, Skeleton } from "@/components";
import {
  ApiError,
  getLearnedWords,
  startReviseSession,
  type LearnedWordsSort,
  type LearnedWord,
} from "@/lib/api";
import {
  clearQuizSessionId,
  getAccessToken,
  saveQuizSessionId,
} from "@/lib/session";

type ReviseWordsType = "due" | "weak" | "recent";

const copy = {
  due: {
    title: "Due Today",
    badge: "Spaced repetition",
    divider: "READY TO REVISE",
    empty: "No due words right now.",
    emptyBody: "Your schedule is clear. Recent learned words are still available.",
    cta: "Start Due Revision",
  },
  weak: {
    title: "Weak Words",
    badge: "Needs practice",
    divider: "HIGHEST PRIORITY",
    empty: "No weak words right now.",
    emptyBody: "Mistakes and low-strength words will appear here.",
    cta: "Strengthen These Words",
  },
  recent: {
    title: "Recent",
    badge: "History",
    divider: "NEWEST LEARNED",
    empty: "No learned words yet.",
    emptyBody: "Words appear here after you learn them.",
    cta: null,
  },
} as const;

const sortOptions: { value: LearnedWordsSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "az", label: "A-Z" },
  { value: "za", label: "Z-A" },
  { value: "strength_high", label: "Strongest" },
  { value: "strength_low", label: "Weakest" },
  { value: "mistakes_high", label: "Mistakes" },
  { value: "last_seen", label: "Last Seen" },
];

const RECENT_BATCH_SIZE = 30;

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function dateTime(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

function matchesSearch(word: LearnedWord, search: string) {
  const normalizedSearch = normalizeText(search);
  if (!normalizedSearch) return true;

  const values = [
    word.english,
    word.status,
    ...word.bangla,
    ...word.pos,
  ];

  return values.some((value) => normalizeText(value).includes(normalizedSearch));
}

function sortWords(words: LearnedWord[], sort: LearnedWordsSort) {
  return [...words].sort((left, right) => {
    if (sort === "oldest") {
      return dateTime(left.learnedAt) - dateTime(right.learnedAt);
    }
    if (sort === "az" || sort === "za") {
      const direction = sort === "az" ? 1 : -1;
      return (
        direction *
        normalizeText(left.english).localeCompare(normalizeText(right.english))
      );
    }
    if (sort === "strength_high") {
      return right.strength - left.strength;
    }
    if (sort === "strength_low") {
      return left.strength - right.strength;
    }
    if (sort === "mistakes_high") {
      return right.mistakes - left.mistakes;
    }
    if (sort === "last_seen") {
      return dateTime(right.lastSeenAt) - dateTime(left.lastSeenAt);
    }

    return dateTime(right.learnedAt) - dateTime(left.learnedAt);
  });
}

function getVisibleRecentWords(
  words: LearnedWord[],
  search: string,
  sort: LearnedWordsSort,
) {
  return sortWords(
    words.filter((word) => matchesSearch(word, search)),
    sort,
  );
}

function getType(value: string | string[] | undefined): ReviseWordsType {
  const type = Array.isArray(value) ? value[0] : value;
  return type === "due" || type === "weak" || type === "recent"
    ? type
    : "recent";
}

export default function ReviseWordsScreen() {
  const params = useLocalSearchParams<{ type?: string | string[] }>();
  const type = getType(params.type);
  const details = copy[type];
  const [words, setWords] = useState<LearnedWord[]>([]);
  const [allRecentWords, setAllRecentWords] = useState<LearnedWord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [starting, setStarting] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<LearnedWordsSort>("newest");
  const loadingMoreRef = useRef(false);
  const canSearchAndSort = type === "recent";
  const hasSearch = search.trim().length > 0;

  const loadWords = useCallback(async (nextPage: number) => {
    if (canSearchAndSort) return;
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
      const response = await getLearnedWords(token, nextPage, 20, type);
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
        setError("Unable to load revise words right now.");
      }
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [canSearchAndSort, type]);

  const loadRecentWords = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setWords([]);
    setAllRecentWords([]);
    setPage(1);
    setTotal(0);
    setHasMore(false);

    try {
      let nextPage = 1;
      let hasNextPage = true;
      let totalCount = 0;
      const collected: LearnedWord[] = [];

      while (hasNextPage) {
        const response = await getLearnedWords(
          token,
          nextPage,
          RECENT_BATCH_SIZE,
          "recent",
        );

        collected.push(...response.items);
        totalCount = response.total;
        hasNextPage = response.hasMore;
        nextPage += 1;

        setAllRecentWords([...collected]);
        setTotal(totalCount);
      }

      setPage(Math.max(1, nextPage - 1));
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to load learned words right now.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setWords([]);
    setPage(1);
    setHasMore(false);

    if (!canSearchAndSort) {
      void loadWords(1);
      return;
    }

    void loadRecentWords();
  }, [canSearchAndSort, loadRecentWords, loadWords]);

  useEffect(() => {
    if (!canSearchAndSort) {
      return;
    }

    setWords(getVisibleRecentWords(allRecentWords, search, sort));
  }, [allRecentWords, canSearchAndSort, search, sort]);

  async function startRevision() {
    if (type === "recent" || starting) return;

    const token = await getAccessToken();
    if (!token) {
      router.push("/typing");
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const response = await startReviseSession(token, {
        type,
        mode: "mixed",
      });
      await saveQuizSessionId(response.session.id);
      router.push("/typing");
    } catch (exception) {
      await clearQuizSessionId();
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to start revision right now.");
      }
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen contentStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
      <AppHeader
        title={details.title}
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
          <Text style={{ fontSize: 32, fontWeight: "800", color: Colors.text }}>
            {details.title}
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
                backgroundColor: "#F1F5F9",
                color: Colors.muted,
                fontSize: 10,
                fontWeight: "800",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 8,
                textTransform: "uppercase",
              }}>
              {details.badge}
            </Text>
            <Text style={{ color: Colors.muted, fontWeight: "700" }}>
              {loading
                ? "Loading..."
                : canSearchAndSort && hasSearch
                  ? `${words.length} of ${total} Words`
                  : `${total} Words`}
            </Text>
          </View>
        </View>

        {details.cta ? (
          <Pressable
            onPress={() => void startRevision()}
            disabled={starting || loading || total === 0}
            style={{
              minHeight: 52,
              borderRadius: 16,
              backgroundColor: Colors.text,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              opacity: starting || loading || total === 0 ? 0.6 : 1,
            }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
              {starting ? "Starting..." : details.cta}
            </Text>
            <AppIcon name="arrow" size={14} color="#FFFFFF" />
          </Pressable>
        ) : null}

        {error ? (
          <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "700" }}>
            {error}
          </Text>
        ) : null}

        {canSearchAndSort ? (
          <View
            style={{
              borderRadius: 20,
              backgroundColor: Colors.surface,
              borderWidth: 1,
              borderColor: Colors.border,
              padding: 16,
              gap: 14,
            }}>
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: Colors.muted,
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                  }}>
                  Find a learned word
                </Text>
                {hasSearch ? (
                  <Pressable
                    onPress={() => setSearch("")}
                    style={{
                      minHeight: 28,
                      borderRadius: 999,
                      backgroundColor: "#F1F5F9",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 10,
                    }}>
                    <AppIcon name="close" size={11} color={Colors.muted} />
                    <Text
                      style={{
                        color: Colors.muted,
                        fontSize: 11,
                        fontWeight: "800",
                      }}>
                      Clear
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View
                style={{
                  marginTop: 8,
                  minHeight: 52,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: Colors.border,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 14,
                  gap: 10,
                }}>
                <AppIcon name="search" size={15} color="#9CA3AF" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="English, Bangla, POS, or status"
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

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {sortOptions.map((option) => {
                const active = sort === option.value;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setSort(option.value)}
                    style={{
                      borderRadius: 999,
                      backgroundColor: active ? Colors.text : "#F1F5F9",
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}>
                    <Text
                      style={{
                        color: active ? "#FFFFFF" : Colors.muted,
                        fontSize: 11,
                        fontWeight: "800",
                      }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ height: 1, backgroundColor: Colors.border, flex: 1 }} />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: "#94A3B8",
              letterSpacing: 2,
            }}>
            {details.divider}
          </Text>
          <View style={{ height: 1, backgroundColor: Colors.border, flex: 1 }} />
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
              <Pressable
                key={word.wordId}
                onPress={() => router.push(`/word/${word.wordId}`)}
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
                    <Text style={chipStyle}>{word.status}</Text>
                    <Text style={[chipStyle, { backgroundColor: "#ECFDF5", color: "#047857" }]}>
                      Strength {word.strength}/5
                    </Text>
                    <Text style={[chipStyle, { backgroundColor: "#FEF2F2", color: "#DC2626" }]}>
                      Mistakes {word.mistakes}
                    </Text>
                  </View>
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
              {hasSearch ? "No words match your search." : details.empty}
            </Text>
            <Text
              style={{
                marginTop: 8,
                textAlign: "center",
                color: Colors.muted,
                fontWeight: "600",
              }}>
              {hasSearch
                ? "Try another spelling, Bangla meaning, POS, or status."
                : details.emptyBody}
            </Text>
            {hasSearch ? (
              <Pressable
                onPress={() => setSearch("")}
                style={{
                  marginTop: 16,
                  minHeight: 44,
                  borderRadius: 16,
                  backgroundColor: Colors.text,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 18,
                }}>
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                  Clear Search
                </Text>
              </Pressable>
            ) : null}
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
