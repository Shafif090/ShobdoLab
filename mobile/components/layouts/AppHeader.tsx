import { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/theme";

export function AppHeader({
  title,
  left,
  right,
}: {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>{left}</View>
      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>
      <View style={[styles.headerSide, styles.headerSideRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 20,
    minHeight: 72,
  },
  headerSide: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerSideRight: {
    justifyContent: "flex-end",
  },
  headerTitle: {
    flex: 1,
    textAlign: "left",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: Colors.text,
  },
});
