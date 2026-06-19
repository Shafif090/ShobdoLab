import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText as Text, AppTextInput } from "@/components/app-typography";
import { AppIcon, type IconName } from "./AppIcon";
import { styles } from "./styles";

export function BrandInput({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  right,
}: {
  label: string;
  icon: IconName;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  right?: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <View style={styles.inputIcon}>
          <AppIcon name={icon} size={16} color="#9CA3AF" />
        </View>
        <AppTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#C7CDD5"
          secureTextEntry={secureTextEntry}
          style={styles.input}
        />
        {right ? <View style={styles.inputRight}>{right}</View> : null}
      </View>
    </View>
  );
}
