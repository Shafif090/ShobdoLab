import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Colors } from "@/constants/theme";
import { AppText as Text } from "@/components/app-typography";
import { AppIcon, IconButton, Skeleton, TabScreen } from "@/components";
import { stats } from "@/constants/data";
import { getHomeSummary, type HomeSummaryResponse } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import Svg, { Path } from "react-native-svg";

function ActionCard({
  href,
  color,
  title,
  subtitle,
  marginLeft = 0,
  marginRight = 0,
}: {
  href: "/(tabs)/learn" | "/(tabs)/revise" | "/(tabs)/exercise";
  color: string;
  title: string;
  subtitle: string;
  marginLeft?: number;
  marginRight?: number;
}) {
  const isGreen = color === Colors.green;

  return (
    <View style={{ marginLeft, marginRight, paddingBottom: 3 }}>
      <View
        style={{
          position: "absolute",
          top: 4,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 24,
          backgroundColor: "#000",
        }}
      />
      <Pressable
        onPress={() => router.push(href)}
        style={{
          borderRadius: 24,
          borderWidth: 2,
          borderColor: "#000",
          backgroundColor: color,
          padding: 24,
        }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: isGreen ? Colors.text : "#FFFFFF",
            }}>
            {title}
          </Text>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <AppIcon
              name="arrow"
              size={16}
              color={isGreen ? Colors.text : "#FFFFFF"}
            />
          </View>
        </View>
        <Text
          style={{
            marginTop: 8,
            fontWeight: "700",
            color: isGreen ? "rgba(17,24,39,0.82)" : "rgba(255,255,255,0.92)",
          }}>
          {subtitle}
        </Text>
      </Pressable>
    </View>
  );
}

function ArrowDivider({ right = false }: { right?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: right ? "flex-end" : "flex-start",
        paddingHorizontal: 48,
        marginVertical: -4,
        zIndex: 10,
      }}>
      <Svg
        width={40}
        height={40}
        viewBox="0 0 40 40"
        style={
          right
            ? { transform: [{ rotate: "15deg" }] }
            : { transform: [{ scaleX: -1 }] }
        }>
        <Path
          d="M10 10 Q 30 10 30 30 M 24 25 L 30 30 L 36 25"
          stroke="#000"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

function MetricCard({
  icon,
  iconColor,
  borderColor,
  backgroundColor,
  value,
  label,
  loading,
}: {
  icon: Parameters<typeof AppIcon>[0]["name"];
  iconColor: string;
  borderColor: string;
  backgroundColor: string;
  value: number;
  label: string;
  loading: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 160,
        borderRadius: 18,
        borderWidth: 1,
        borderColor,
        backgroundColor,
        padding: 18,
        paddingVertical: 22,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
      }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 22,
          backgroundColor: "rgba(255,255,255,0.62)",
          alignItems: "center",
          justifyContent: "center",
        }}>
        <AppIcon name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        {loading ? (
          <Skeleton style={{ width: 44, height: 28, marginBottom: 6 }} />
        ) : (
          <Text
            style={{
              fontSize: 24,
              fontWeight: "800",
              color: Colors.text,
            }}>
            {value}
          </Text>
        )}
        <Text
          style={{
            fontSize: 12,
            fontWeight: "500",
            color: Colors.muted,
          }}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function HomeTab() {
  const [summary, setSummary] = useState<HomeSummaryResponse | null>(null);
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
        const response = await getHomeSummary(token);
        if (!active) return;

        setSummary(response);
      } catch {
        if (!active) return;
        setSummary(null);
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

  const streakDays = summary?.streakDays ?? stats.streakDays;
  const wordsLearned = summary?.wordsLearnedTotal ?? stats.wordsLearned;

  return (
    <TabScreen
      title="ShobdoLab"
      active="home"
      right={
        <IconButton icon="trophy" onPress={() => router.push("/achievements")} />
      }>
      <View style={{ gap: 28 }}>
        <View style={{ gap: 14 }}>
          <Text
            style={{
              fontSize: 14,
              paddingVertical: 12,
              fontWeight: "700",
              color: Colors.muted,
              textTransform: "uppercase",
              letterSpacing: 1.5,
            }}>
            {"Today's Progress"}
          </Text>
          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            <MetricCard
              icon="fire"
              iconColor="#7C3AED"
              borderColor={Colors.purple}
              backgroundColor="rgba(233,213,255,0.3)"
              value={streakDays}
              label="Day Streak"
              loading={loading}
            />
            <MetricCard
              icon="book"
              iconColor="#047857"
              borderColor={Colors.green}
              backgroundColor="rgba(161,232,175,0.24)"
              value={wordsLearned}
              label="Words Learned"
              loading={loading}
            />
            <MetricCard
              icon="calendar"
              iconColor="#4F46E5"
              borderColor={Colors.blue}
              backgroundColor="rgba(142,155,250,0.14)"
              value={summary?.dueTomorrowCount ?? 0}
              label="Due Tomorrow"
              loading={loading}
            />
            <MetricCard
              icon="exercise"
              iconColor="#DC2626"
              borderColor={Colors.orange}
              backgroundColor="rgba(244,124,124,0.12)"
              value={summary?.today.exercise ?? stats.todayExercise}
              label="Exercises Today"
              loading={loading}
            />
          </View>
        </View>

        <View style={{ gap: 18 }}>
          <ActionCard
            href="/(tabs)/learn"
            color={Colors.orange}
            title="Learn"
            subtitle="Discover new words"
          />
          <ArrowDivider right />
          <ActionCard
            href="/(tabs)/revise"
            color={Colors.blue}
            title="Revise"
            subtitle="Track your progress"
            marginLeft={24}
          />
          <ArrowDivider />
          <ActionCard
            href="/(tabs)/exercise"
            color={Colors.green}
            title="Exercise"
            subtitle="Unlock full potential"
            marginRight={24}
          />
        </View>
      </View>
    </TabScreen>
  );
}
