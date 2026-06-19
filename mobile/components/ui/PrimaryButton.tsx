import { ActivityIndicator, Pressable } from "react-native";
import { router } from "expo-router";
import type { Href } from "expo-router";
import { AppText as Text } from "@/components/app-typography";
import { AppIcon, type IconName } from "./AppIcon";
import { styles } from "./styles";

export function PrimaryButton({
  label,
  color,
  href,
  icon = "arrow",
  onPress,
  loading = false,
  disabled = false,
}: {
  label: string;
  color: string;
  href?: Href;
  icon?: IconName;
  onPress?: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={() => {
        if (isDisabled) return;
        if (onPress) {
          void onPress();
          return;
        }
        if (href) {
          router.push(href);
        }
      }}
      disabled={isDisabled}
      style={[
        styles.primaryButton,
        { backgroundColor: color, opacity: isDisabled ? 0.72 : 1 },
      ]}>
      <Text style={styles.primaryButtonText}>
        {loading ? "Please wait..." : label}
      </Text>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <AppIcon name={icon} size={16} color="#FFFFFF" />
      )}
    </Pressable>
  );
}
