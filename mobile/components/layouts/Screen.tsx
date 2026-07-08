import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Colors } from "@/constants/theme";
import { MobileTabs, type TabKey } from "@/components/ui";
import { AppHeader } from "./AppHeader";

function GridBackground() {
  const { width, height } = useWindowDimensions();

  const horizontalCount = Math.ceil(height / 40) + 1;
  const verticalCount = Math.ceil(width / 40) + 1;

  return (
    <View pointerEvents="none" style={styles.gridBackdrop}>
      {Array.from({ length: verticalCount }).map((_, index) => (
        <View
          key={`grid-v-${index}`}
          style={[styles.gridLineVertical, { left: index * 40 }]}
        />
      ))}
      {Array.from({ length: horizontalCount }).map((_, index) => (
        <View
          key={`grid-h-${index}`}
          style={[styles.gridLineHorizontal, { top: index * 40 }]}
        />
      ))}
    </View>
  );
}

export function Screen({
  children,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: object;
}) {
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 380 ? 16 : width < 430 ? 20 : 24;
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingHorizontal: horizontalPadding },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.scrollContent,
        { paddingHorizontal: horizontalPadding },
        contentStyle,
      ]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.grid}>
        <GridBackground />
        {content}
      </View>
    </SafeAreaView>
  );
}

export function TabScreen({
  title,
  active,
  right,
  children,
}: {
  title: string;
  active: TabKey;
  right?: ReactNode;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 380 ? 16 : width < 430 ? 20 : 24;

  return (
    <Screen scroll={false} contentStyle={styles.tabScreenShell}>
      <View style={styles.tabScreen}>
        <LinearGradient
          pointerEvents="none"
          colors={[
            "rgba(243,244,246,0.96)",
            "rgba(243,244,246,0.72)",
            "rgba(243,244,246,0)",
          ]}
          locations={[0, 0.22, 1]}
          style={styles.tabTopGradient}
        />
        <View style={[styles.tabScreenBody, { paddingHorizontal: horizontalPadding }]}>
          <AppHeader title={title} right={right} />
          <ScrollView
            contentContainerStyle={styles.tabScrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.container}>{children}</View>
          </ScrollView>
        </View>
        <MobileTabs active={active} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  grid: {
    flex: 1,
    backgroundColor: Colors.background,
    overflow: "hidden",
  },
  gridBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLineVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  gridLineHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  tabScreenShell: {
    flex: 1,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  tabScreen: {
    flex: 1,
  },
  tabTopGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    zIndex: 0,
  },
  tabScreenBody: {
    flex: 1,
  },
  tabScrollContent: {
    flexGrow: 1,
    paddingBottom: 132,
  },
  container: {
    gap: 24,
  },
});
