import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/theme";
import { AppText as Text } from "@/components/app-typography";
import { AppHeader, AppIcon, Screen, Skeleton } from "@/components";
import { ApiError, getHomeSummary, type HomeSummaryResponse } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export default function AchievementsScreen() {
  const [summary, setSummary] = useState<HomeSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAchievements() {
      const token = await getAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await getHomeSummary(token);
        if (!active) return;

        setSummary(response);
      } catch (exception) {
        if (!active) return;

        setError(
          exception instanceof ApiError
            ? exception.message
            : "Unable to load achievements right now.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAchievements();

    return () => {
      active = false;
    };
  }, []);

  const achievements = useMemo(
    () => summary?.achievements ?? [],
    [summary?.achievements],
  );
  const earnedCount = useMemo(
    () => achievements.filter((achievement) => achievement.earned).length,
    [achievements],
  );

  return (
    <Screen contentStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}>
      <AppHeader
        title="Achievements"
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
        <View
          style={{
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "rgba(255,200,0,0.40)",
            backgroundColor: "rgba(255,200,0,0.12)",
            padding: 22,
            gap: 18,
          }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 18,
              backgroundColor: Colors.yellow,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "#000",
            }}>
            <AppIcon name="trophy" size={22} color={Colors.text} />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "flex-end",
            }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "800",
                  color: Colors.text,
                }}>
                Achievements
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  color: Colors.muted,
                  fontWeight: "600",
                  lineHeight: 20,
                }}>
                Badges unlock from streaks, word count, active days, high scores,
                and perfect quiz runs.
              </Text>
            </View>
            <View
              style={{
                borderRadius: 16,
                backgroundColor: Colors.surface,
                paddingHorizontal: 14,
                paddingVertical: 10,
                alignItems: "flex-end",
              }}>
              {loading ? (
                <Skeleton style={{ width: 64, height: 28 }} />
              ) : (
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "800",
                    color: Colors.text,
                  }}>
                  {earnedCount}/{achievements.length}
                </Text>
              )}
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "800",
                  color: Colors.muted,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                }}>
                Earned
              </Text>
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
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} style={{ height: 142, borderRadius: 24 }} />
            ))}
          </View>
        ) : achievements.length > 0 ? (
          <View style={{ gap: 14 }}>
            {achievements.map((achievement) => {
              const percent = Math.round(
                (achievement.progress / achievement.target) * 100,
              );

              return (
                <View
                  key={achievement.code}
                  style={{
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: achievement.earned ? "#A7F3D0" : Colors.border,
                    backgroundColor: achievement.earned ? "#ECFDF5" : Colors.surface,
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
                      gap: 14,
                      alignItems: "flex-start",
                    }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 16,
                        backgroundColor: achievement.earned ? "#D1FAE5" : "#F1F5F9",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                      <AppIcon
                        name={achievement.earned ? "trophy" : "list"}
                        size={18}
                        color={achievement.earned ? "#047857" : Colors.muted}
                      />
                    </View>
                    <Text
                      style={{
                        borderRadius: 999,
                        overflow: "hidden",
                        backgroundColor: achievement.earned ? "#D1FAE5" : "#F1F5F9",
                        color: achievement.earned ? "#047857" : Colors.muted,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        fontSize: 10,
                        fontWeight: "800",
                        textTransform: "uppercase",
                      }}>
                      {achievement.earned ? "Earned" : `${percent}%`}
                    </Text>
                  </View>

                  <Text
                    style={{
                      marginTop: 14,
                      fontSize: 18,
                      fontWeight: "800",
                      color: Colors.text,
                    }}>
                    {achievement.title}
                  </Text>
                  <Text
                    style={{
                      marginTop: 5,
                      color: Colors.muted,
                      fontSize: 13,
                      fontWeight: "600",
                      lineHeight: 19,
                    }}>
                    {achievement.description}
                  </Text>

                  <View style={{ marginTop: 16 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "800",
                          color: Colors.muted,
                        }}>
                        Progress
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "800",
                          color: Colors.muted,
                        }}>
                        {achievement.progress}/{achievement.target}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: "#F1F5F9",
                        overflow: "hidden",
                      }}>
                      <View
                        style={{
                          height: "100%",
                          width: `${Math.min(100, percent)}%`,
                          borderRadius: 999,
                          backgroundColor: achievement.earned
                            ? "#10B981"
                            : Colors.yellow,
                        }}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
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
              No achievements yet.
            </Text>
            <Text
              style={{
                marginTop: 8,
                color: Colors.muted,
                fontWeight: "600",
                textAlign: "center",
              }}>
              Start learning or finish a quiz to unlock your first badge.
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}
