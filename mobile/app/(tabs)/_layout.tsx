import { Tabs, router } from "expo-router";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/session";

export default function TabsLayout() {
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifySession() {
      const token = await getAccessToken();
      if (!active) return;

      if (!token) {
        router.replace("/login");
        return;
      }

      setAuthChecked(true);
    }

    void verifySession();

    return () => {
      active = false;
    };
  }, []);

  if (!authChecked) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="revise" />
      <Tabs.Screen name="exercise" />
      <Tabs.Screen name="dictionary" />
    </Tabs>
  );
}
