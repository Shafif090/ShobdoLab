import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Colors } from "@/constants/theme";
import { AppText as Text } from "@/components/app-typography";
import { AppIcon, Skeleton, TabScreen } from "@/components";
import { stats } from "@/constants/data";
import {
  ApiError,
  getCurrentSet,
  getExerciseMeta,
  startExerciseSession,
  type ExerciseMetaResponse,
  type LearningSetResponse,
} from "@/lib/api";
import {
  clearQuizSessionId,
  getAccessToken,
  saveQuizSessionId,
} from "@/lib/session";

const modes = {
  mcq: {
    title: "MCQ Practice",
    icon: "list",
    time: "3-5 mins",
    items: "10 Questions",
    href: "/quiz",
    start: "Start MCQ",
  },
  mixed: {
    title: "Mixed Practice",
    icon: "bolt",
    time: "4-6 mins",
    items: "10 Questions",
    href: "/typing",
    start: "Start Test",
  },
  typing: {
    title: "Typing Practice",
    icon: "keyboard",
    time: "5-8 mins",
    items: "10 Questions",
    href: "/typing",
    start: "Start Typing",
  },
} as const;

export default function ExerciseTab() {
  const [mode, setMode] = useState<keyof typeof modes>("mixed");
  const [liveSet, setLiveSet] = useState<LearningSetResponse["set"] | null>(
    null,
  );
  const [meta, setMeta] = useState<ExerciseMetaResponse | null>(null);
  const [syncMessage, setSyncMessage] = useState(
    "Sign in to sync your current learning set.",
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function syncCurrentSet() {
      const token = await getAccessToken();

      if (!token) {
        if (active) {
          setSyncMessage("Sign in to sync your current learning set.");
          setLoading(false);
        }
        return;
      }

      try {
        const [setResponse, metaResponse] = await Promise.all([
          getCurrentSet(token),
          getExerciseMeta(token),
        ]);
        if (!active) return;

        setLiveSet(setResponse.set);
        setMeta(metaResponse);
        setSyncMessage(
          `Live set #${setResponse.set.set_index} with ${setResponse.set.total_words} words ready`,
        );
      } catch (exception) {
        if (!active) return;

        setLiveSet(null);

        if (exception instanceof ApiError && exception.status === 401) {
          setSyncMessage("Your session expired. Sign in again to sync.");
          return;
        }

        setSyncMessage("Unable to load your live set right now.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void syncCurrentSet();

    return () => {
      active = false;
    };
  }, []);

  const current = modes[mode];
  const modeMeta = meta?.modes[mode];
  const estimatedTime = modeMeta?.estimated ?? current.time;
  const itemCount = modeMeta ? `${modeMeta.items} Questions` : current.items;
  const lastAccuracy = meta?.lastSessionAccuracy ?? stats.lastAccuracy;

  async function startMode(target: "/quiz" | "/typing") {
    const token = await getAccessToken();
    if (!token) {
      router.push(target);
      return;
    }

    try {
      const response = await startExerciseSession(token, mode);
      await saveQuizSessionId(response.session.id);
    } catch {
      await clearQuizSessionId();
    }

    router.push(target);
  }

  return (
    <TabScreen title="Exercise" active="exercise">
      <View style={{ gap: 24, alignItems: "center" }}>
        <View style={{ alignItems: "center", gap: 6, paddingVertical: 18 }}>
          <Text style={{ fontSize: 32, fontWeight: "800", color: Colors.text }}>
            Ready to Practice?
          </Text>
          <Text style={{ color: Colors.muted, fontWeight: "500" }}>
            Choose your preferred mode to begin.
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            backgroundColor: "rgba(241,245,249,0.95)",
            borderRadius: 999,
            padding: 6,
            width: "100%",
          }}>
          {(Object.keys(modes) as (keyof typeof modes)[]).map((item) => (
            <Pressable
              key={item}
              onPress={() => setMode(item)}
              style={{
                flex: 1,
                minHeight: 46,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
                backgroundColor: item === mode ? Colors.surface : "transparent",
              }}>
              <AppIcon
                name={modes[item].icon as Parameters<typeof AppIcon>[0]["name"]}
                size={15}
                color={Colors.blue}
              />
              <Text
                style={{
                  fontWeight: item === mode ? "800" : "700",
                  color: item === mode ? Colors.text : Colors.muted,
                }}>
                {item.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <View
          style={{
            width: "100%",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: liveSet ? "rgba(161,232,175,0.45)" : Colors.border,
            backgroundColor: liveSet
              ? "rgba(161,232,175,0.18)"
              : Colors.surface,
            padding: 16,
            gap: 6,
          }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: Colors.text }}>
            Backend sync
          </Text>
          {loading ? (
            <>
              <Skeleton style={{ width: "75%", height: 16 }} />
              <Skeleton style={{ width: "55%", height: 16 }} />
            </>
          ) : (
            <>
              <Text style={{ color: Colors.muted, fontWeight: "600" }}>
                {syncMessage}
              </Text>
            </>
          )}
        </View>

        <View
          style={{
            width: "100%",
            borderRadius: 28,
            backgroundColor: Colors.surface,
            borderWidth: 1,
            borderColor: "#F1F5F9",
            padding: 28,
            alignItems: "center",
            gap: 22,
            shadowColor: Colors.shadow,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.14,
            shadowRadius: 22,
            elevation: 4,
          }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: Colors.background,
              alignItems: "center",
              justifyContent: "center",
            }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: Colors.surface,
                alignItems: "center",
                justifyContent: "center",
              }}>
              <AppIcon
                name={current.icon as Parameters<typeof AppIcon>[0]["name"]}
                size={28}
                color={Colors.blue}
              />
            </View>
          </View>

          <View style={{ alignItems: "center", gap: 10 }}>
            <Text
              style={{ fontSize: 24, fontWeight: "800", color: Colors.text }}>
              {current.title}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: "rgba(233,213,255,0.25)",
                  borderWidth: 1,
                  borderColor: "rgba(233,213,255,0.8)",
                  flexDirection: "row",
                  gap: 6,
                  alignItems: "center",
                }}>
                <AppIcon name="clock" size={12} color={Colors.text} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color: Colors.text,
                  }}>
                  {estimatedTime}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: "rgba(161,232,175,0.25)",
                  borderWidth: 1,
                  borderColor: "rgba(161,232,175,0.8)",
                  flexDirection: "row",
                  gap: 6,
                  alignItems: "center",
                }}>
                <AppIcon name="book" size={12} color={Colors.text} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "800",
                    color: Colors.text,
                  }}>
                  {itemCount}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => void startMode(current.href as "/quiz" | "/typing")}
            style={{
              width: "100%",
              minHeight: 58,
              borderRadius: 18,
              backgroundColor: Colors.orange,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
            }}>
            <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "800" }}>
              {current.start}
            </Text>
            <AppIcon name="arrow" size={14} color="#FFFFFF" />
          </Pressable>
        </View>

        <View
          style={{
            width: "100%",
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 4,
          }}>
          {loading ? (
            <Skeleton style={{ width: 150, height: 16 }} />
          ) : (
            <Text style={{ color: Colors.muted, fontWeight: "600" }}>
              Last session:{" "}
              <Text style={{ color: Colors.text, fontWeight: "800" }}>
                {lastAccuracy}% accuracy
              </Text>
            </Text>
          )}
          <Text
            onPress={() => router.push("/exercise-history")}
            style={{ color: Colors.blue, fontWeight: "700" }}>
            View History
          </Text>
        </View>
      </View>
    </TabScreen>
  );
}
