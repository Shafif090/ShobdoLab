import type { ComponentProps } from "react";
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
} from "react-native";

function resolveInterFontFamily(
  fontWeight?: string | number,
  fontFamily?: string,
) {
  if (fontFamily) {
    return fontFamily;
  }

  const numericWeight =
    typeof fontWeight === "number" ? fontWeight : Number(fontWeight ?? 500);

  if (Number.isFinite(numericWeight) && numericWeight >= 800) {
    return "Inter-Bold";
  }

  if (Number.isFinite(numericWeight) && numericWeight >= 700) {
    return "Inter-SemiBold";
  }

  if (Number.isFinite(numericWeight) && numericWeight >= 600) {
    return "Inter-Medium";
  }

  return "Inter";
}

export function AppText({ style, ...props }: ComponentProps<typeof RNText>) {
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const fontFamily = resolveInterFontFamily(
    flattenedStyle.fontWeight,
    flattenedStyle.fontFamily,
  );

  return <RNText {...props} style={[{ fontFamily }, style]} />;
}

export function AppTextInput({
  style,
  ...props
}: ComponentProps<typeof RNTextInput>) {
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const fontFamily = resolveInterFontFamily(
    flattenedStyle.fontWeight,
    flattenedStyle.fontFamily,
  );

  return <RNTextInput {...props} style={[{ fontFamily }, style]} />;
}
