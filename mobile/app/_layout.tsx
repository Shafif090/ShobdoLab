import { Asset } from "expo-asset";
import { FontAwesome6 } from "@expo/vector-icons";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import WebHead from "@/components/WebHead";

const interRegular = require("../assets/fonts/Inter-Regular.ttf");
const interMedium = require("../assets/fonts/Inter-Medium.ttf");
const interSemiBold = require("../assets/fonts/Inter-SemiBold.ttf");
const interBold = require("../assets/fonts/Inter-Bold.ttf");
const interExtraBold = require("../assets/fonts/Inter-ExtraBold.ttf");

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter: interRegular,
    "Inter-Medium": interMedium,
    "Inter-SemiBold": interSemiBold,
    "Inter-Bold": interBold,
    "Inter-ExtraBold": interExtraBold,
    ...FontAwesome6.font,
  });

  useEffect(() => {
    if (!loaded) {
      return;
    }

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const existing = document.getElementById("shobdolab-inter-fonts");

      if (!existing) {
        const fontStyle = document.createElement("style");
        fontStyle.id = "shobdolab-inter-fonts";
        fontStyle.textContent = `
@font-face {
  font-family: "Inter";
  src: url("${Asset.fromModule(interRegular).uri}") format("truetype");
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: "Inter";
  src: url("${Asset.fromModule(interMedium).uri}") format("truetype");
  font-weight: 500;
  font-style: normal;
}
@font-face {
  font-family: "Inter";
  src: url("${Asset.fromModule(interSemiBold).uri}") format("truetype");
  font-weight: 600;
  font-style: normal;
}
@font-face {
  font-family: "Inter";
  src: url("${Asset.fromModule(interBold).uri}") format("truetype");
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: "Inter";
  src: url("${Asset.fromModule(interExtraBold).uri}") format("truetype");
  font-weight: 800 900;
  font-style: normal;
}
html, body {
  font-family: "Inter", sans-serif;
}
        `;
        document.head.appendChild(fontStyle);
      }
    }

    SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <>
      <WebHead />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="quiz" />
        <Stack.Screen name="typing" />
        <Stack.Screen name="results" />
        <Stack.Screen name="achievements" />
        <Stack.Screen name="learned-words" />
        <Stack.Screen name="exercise-history" />
        <Stack.Screen name="revise-words/[type]" />
        <Stack.Screen name="word/[wordId]" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
