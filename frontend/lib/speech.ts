const ENGLISH_VOICE_PREFIXES = ["en-US", "en-GB", "en-AU", "en-CA", "en"];

let cachedVoice: SpeechSynthesisVoice | null = null;

function getSpeechSynthesis() {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

export function canSpeak() {
  return Boolean(
    getSpeechSynthesis() && typeof SpeechSynthesisUtterance !== "undefined",
  );
}

function pickEnglishVoice(voices: SpeechSynthesisVoice[]) {
  if (
    cachedVoice &&
    voices.some((voice) => voice.voiceURI === cachedVoice?.voiceURI)
  ) {
    return cachedVoice;
  }

  const voice =
    voices.find((item) => item.lang === "en-US" && item.localService) ??
    voices.find((item) => item.lang === "en-US") ??
    voices.find((item) =>
      ENGLISH_VOICE_PREFIXES.some((prefix) => item.lang.startsWith(prefix)),
    ) ??
    null;

  cachedVoice = voice;
  return voice;
}

export function warmSpeechVoices() {
  const synth = getSpeechSynthesis();
  if (!synth) return;

  pickEnglishVoice(synth.getVoices());
}

export function stopSpeaking() {
  const synth = getSpeechSynthesis();
  synth?.cancel();
}

export function speakWord(
  text: string,
  {
    onStart,
    onEnd,
    onError,
  }: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  } = {},
) {
  const synth = getSpeechSynthesis();
  const word = text.trim();

  if (!synth || !word || typeof SpeechSynthesisUtterance === "undefined") {
    onError?.();
    return false;
  }

  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(word);
  const voice = pickEnglishVoice(synth.getVoices());
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "en-US";
  }

  utterance.rate = 0.85;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onError?.();

  synth.speak(utterance);
  return true;
}
