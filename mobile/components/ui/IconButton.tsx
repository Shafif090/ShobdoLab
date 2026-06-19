import { Pressable } from "react-native";
import { Colors } from "@/constants/theme";
import { AppIcon, type IconName } from "./AppIcon";
import { styles } from "./styles";

export function IconButton({
  icon,
  color = Colors.muted,
  onPress,
}: {
  icon: IconName;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.iconButton}>
      <AppIcon name={icon} size={18} color={color} />
    </Pressable>
  );
}
