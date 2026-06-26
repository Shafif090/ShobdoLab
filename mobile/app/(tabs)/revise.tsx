import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { AppText as Text } from "@/components/app-typography";
import { AppIcon, Skeleton, TabScreen } from "@/components";
import { stats } from "@/constants/data";
import {
  ApiError,
  getReviseSummary,
  type ReviseSummaryResponse,
} from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export default function ReviseTab() {
  const [summary, setSummary] = useState<ReviseSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      const token = await getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await getReviseSummary(token);
        if (!active) return;

        setSummary(response);
      } catch (exception) {
        if (!active) return;

        if (exception instanceof ApiError) {
          setError(exception.message);
          return;
        }

        setError("Unable to load your revision summary right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      type: "due",
      title: "Due Today",
      subtitle: "Spaced repetition",
      count: summary?.dueTodayCount ?? stats.dueToday,
      color: Colors.orange,
      icon: "calendar",
      action: "Revise Now",
    },
    {
      type: "weak",
      title: "Weak Words",
      subtitle: "Needs more practice",
      count: summary?.weakWordsCount ?? stats.weakWords,
      color: Colors.blue,
      icon: "exercise",
      action: "Strengthen",
    },
    {
      type: "recent",
      title: "Recent",
      subtitle: "All learned words",
      count: summary?.recentWordsCount ?? stats.recentWords,
      color: Colors.green,
      icon: "clock",
      action: "View Words",
    },
  ] as const;

  function openRevision(type: (typeof cards)[number]["type"]) {
    if (type === "recent") {
      router.push("/revise-words/recent");
      return;
    }

    router.push(`/revise-words/${type}`);
  }

  return (
    <TabScreen title="Revise" active="revise">
      <View style={{ gap: 18 }}>
        <View style={{ paddingVertical: 16 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "800",
              color: Colors.text,
            }}>
            Your Daily Revision
          </Text>
          <Text
            style={{ marginTop: 6, color: Colors.muted, fontWeight: "500" }}>
            Keep your memory fresh. Focus on what matters.
          </Text>
        </View>

        {error ? (
          <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "700" }}>
            {error}
          </Text>
        ) : null}

        {cards.map((card) => (
          <View
            key={card.title}
            style={{
              borderRadius: 24,
              borderWidth: 2,
              borderColor: `${card.color}33`,
              backgroundColor: `${card.color}1A`,
              padding: 20,
              gap: 16,
            }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}>
              <View
                style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: `${card.color}33`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                  <AppIcon
                    name={card.icon as Parameters<typeof AppIcon>[0]["name"]}
                    size={20}
                    color={card.color}
                  />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "800",
                      color: Colors.text,
                    }}>
                    {card.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: Colors.muted,
                      fontWeight: "700",
                    }}>
                    {card.subtitle}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: Colors.surface,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: `${card.color}22`,
                }}>
                {loading ? (
                  <Skeleton style={{ width: 72, height: 18, borderRadius: 999 }} />
                ) : (
                  <Text style={{ color: card.color, fontWeight: "800" }}>
                    {card.count} Words
                  </Text>
                )}
              </View>
            </View>

            <Pressable
              onPress={() => openRevision(card.type)}
              style={{
                minHeight: 54,
                borderRadius: 16,
                backgroundColor: card.color,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}>
              <Text
                style={{
                  color: card.color === Colors.green ? Colors.text : "#FFFFFF",
                  fontWeight: "800",
                }}>
                {card.action}
              </Text>
              <AppIcon
                name="arrow"
                size={14}
                color={card.color === Colors.green ? Colors.text : "#FFFFFF"}
              />
            </Pressable>
          </View>
        ))}
      </View>
    </TabScreen>
  );
}
