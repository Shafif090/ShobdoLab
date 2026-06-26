import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { AppText as Text } from "@/components/app-typography";
import { AppIcon, Skeleton, TabScreen } from "@/components";
import { formatWordList } from "@/lib/format";
import {
  ApiError,
  createNextSet,
  getCurrentSet,
  type LearningSetResponse,
} from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export default function LearnTab() {
  const [currentSet, setCurrentSet] = useState<
    LearningSetResponse["set"] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextLoading, setNextLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCurrentSet() {
      const token = await getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await getCurrentSet(token);
        if (!active) return;

        setCurrentSet(response.set);
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError) {
          setError(exception.message);
          return;
        }

        setError("Unable to load your live learning set.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCurrentSet();

    return () => {
      active = false;
    };
  }, []);

  const liveWords =
    currentSet?.items.flatMap((item) =>
      item.word
        ? [
            {
              english: item.word.english,
              bangla: item.word.bangla,
              pos: item.word.pos,
              wordId: item.word.id,
            },
          ]
        : [],
    ) ?? [];

  async function handleNextSet() {
    if (nextLoading) return;

    const token = await getAccessToken();
    if (!token) {
      setError("Please sign in to load your next learning set.");
      return;
    }

    setNextLoading(true);
    setError(null);

    try {
      const response = await createNextSet(token);
      setCurrentSet(response.set);
    } catch (exception) {
      if (exception instanceof ApiError) {
        setError(exception.message);
      } else {
        setError("Unable to load your next set right now.");
      }
    } finally {
      setNextLoading(false);
    }
  }

  return (
    <TabScreen title="Learn" active="learn">
      <View style={{ gap: 18 }}>
        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}>
          <Text
            style={{
              backgroundColor: "rgba(142,155,250,0.12)",
              color: Colors.blue,
              fontSize: 10,
              fontWeight: "800",
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
              textTransform: "uppercase",
            }}>
            Vocabulary
          </Text>
          <Text style={{ color: Colors.muted, fontWeight: "700" }}>
            {loading
              ? "Loading..."
              : currentSet
                ? `${currentSet.total_words} Words`
                : "No active set"}
          </Text>
        </View>

        <Pressable
          onPress={() => void handleNextSet()}
          disabled={nextLoading}
          style={{
            borderRadius: 24,
            padding: 24,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: Colors.blue,
            shadowColor: Colors.blue,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 4,
            opacity: nextLoading ? 0.8 : 1,
          }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: 11,
                fontWeight: "800",
                textTransform: "uppercase",
                letterSpacing: 1.6,
              }}>
              Ready for more?
            </Text>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 20,
                fontWeight: "800",
                marginTop: 6,
              }}>
              {nextLoading ? "Loading..." : "Next Set"}
            </Text>
          </View>
          <View
            style={{
              flexShrink: 0,
              width: 80,
              height: 42,
              borderRadius: 20,
              backgroundColor: Colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}>
            <AppIcon name="arrow" size={18} color={Colors.blue} />
          </View>
        </Pressable>

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
            CURRENT WORDS
          </Text>
          <View
            style={{ height: 1, backgroundColor: Colors.border, flex: 1 }}
          />
        </View>

        <View style={{ gap: 14 }}>
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
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
                </View>
              ))
            : liveWords.length > 0 ? (
              liveWords.map((word) => (
                <Pressable
                  key={word.english}
                  onPress={() => {
                    if (word.wordId) {
                      router.push(`/word/${word.wordId}`);
                    }
                  }}
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
                  </View>
                </Pressable>
              ))
            ) : (
              <View
                style={{
                  borderRadius: 20,
                  backgroundColor: Colors.surface,
                  borderWidth: 1,
                  borderColor: "rgba(148,163,184,0.22)",
                  padding: 22,
                  alignItems: "center",
                }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: Colors.text }}>
                  No learning set loaded.
                </Text>
                <Text
                  style={{
                    marginTop: 8,
                    color: Colors.muted,
                    fontWeight: "600",
                    textAlign: "center",
                  }}>
                  Use Next Set to load words from your database.
                </Text>
              </View>
            )}
        </View>
      </View>
    </TabScreen>
  );
}
