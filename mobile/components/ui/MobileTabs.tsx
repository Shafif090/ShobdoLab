import { Pressable, View } from "react-native";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { Colors } from "@/constants/theme";
import { AppText as Text } from "@/components/app-typography";
import { AppIcon, type IconName } from "./AppIcon";
import { styles } from "./styles";

export type TabKey = "home" | "learn" | "revise" | "exercise" | "dictionary";

export function MobileTabs({ active }: { active: TabKey }) {
  const items: { key: TabKey; label: string; href: Href; icon: IconName }[] = [
    { key: "home", label: "Home", href: "/(tabs)", icon: "home" },
    { key: "learn", label: "Learn", href: "/(tabs)/learn", icon: "book" },
    { key: "revise", label: "Revise", href: "/(tabs)/revise", icon: "revise" },
    {
      key: "exercise",
      label: "Exercise",
      href: "/(tabs)/exercise",
      icon: "exercise",
    },
    {
      key: "dictionary",
      label: "Dict",
      href: "/(tabs)/dictionary",
      icon: "search",
    },
  ];

  return (
    <View style={styles.tabBar}>
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.href)}
            style={styles.tabItem}>
            <View style={[styles.tabIcon, isActive && styles.tabIconActive]}>
              <AppIcon
                name={item.icon}
                size={20}
                color={isActive ? Colors.orange : "#9CA3AF"}
              />
            </View>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
