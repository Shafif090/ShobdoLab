import { router } from "expo-router";
import { useEffect } from "react";
import { getAccessToken } from "@/lib/session";

export default function IndexScreen() {
  useEffect(() => {
    let active = true;

    async function redirectFromRoot() {
      const token = await getAccessToken();
      if (!active) return;

      router.replace(token ? "/(tabs)" : "/login");
    }

    void redirectFromRoot();

    return () => {
      active = false;
    };
  }, []);

  return null;
}
