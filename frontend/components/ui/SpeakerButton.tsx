"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import {
  canSpeak,
  speakWord,
  stopSpeaking,
  warmSpeechVoices,
} from "@/lib/speech";

export function SpeakerButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const supported = canSpeak();

  useEffect(() => {
    warmSpeechVoices();

    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    const synth = window.speechSynthesis;
    const handleVoicesChanged = () => warmSpeechVoices();

    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", handleVoicesChanged);
    } else {
      synth.onvoiceschanged = handleVoicesChanged;
    }

    return () => {
      if (typeof synth.removeEventListener === "function") {
        synth.removeEventListener("voiceschanged", handleVoicesChanged);
      } else if (synth.onvoiceschanged === handleVoicesChanged) {
        synth.onvoiceschanged = null;
      }
      stopSpeaking();
    };
  }, []);

  function pronounce() {
    if (!supported || !text.trim()) return;

    const started = speakWord(text, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });

    if (!started) {
      setSpeaking(false);
    }
  }

  return (
    <button
      className="audio-button"
      type="button"
      onClick={pronounce}
      disabled={!supported || !text.trim()}
      aria-label={`Pronounce ${text}`}
      title={supported ? "Pronounce word" : "Pronunciation is not available"}>
      <Icon
        name="volume"
        className={`text-sm ${speaking ? "text-[var(--brand-blue)]" : ""}`}
      />
    </button>
  );
}
