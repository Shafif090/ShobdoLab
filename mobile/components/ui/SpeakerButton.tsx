import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import * as Speech from "expo-speech";
import { Colors } from "@/constants/theme";
import { AppIcon } from "./AppIcon";
import { styles } from "./styles";

export function SpeakerButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const word = text.trim();
  const disabled = word.length === 0;

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  async function pronounce() {
    if (disabled) return;

    await Speech.stop();
    setSpeaking(true);

    Speech.speak(word, {
      language: "en-US",
      rate: 0.82,
      pitch: 1,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Pronounce ${word || "word"}`}
      onPress={() => void pronounce()}
      disabled={disabled}
      style={[
        styles.iconButton,
        speaking ? styles.iconButtonActive : null,
        disabled ? styles.iconButtonDisabled : null,
      ]}>
      <AppIcon
        name="volume"
        size={18}
        color={speaking ? Colors.blue : Colors.muted}
      />
    </Pressable>
  );
}
