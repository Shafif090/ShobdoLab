export type LearnWord = {
  english: string;
  bangla: string[];
  pos: string[];
};

export function formatWordList(values: string[] | null | undefined) {
  return (values ?? []).map((value) => value.trim()).filter(Boolean).join(", ");
}

export const stats = {
  streakDays: 12,
  wordsLearned: 45,
  dueToday: 24,
  weakWords: 12,
  recentWords: 50,
  lastAccuracy: 92,
};

export const learnWords: LearnWord[] = [
  { english: "Apple", bangla: ["আপেল"], pos: ["noun"] },
  { english: "Perfidious", bangla: ["বিশ্বাসঘাতক"], pos: ["adjective"] },
  { english: "Water", bangla: ["জল", "পানি"], pos: ["noun"] },
  { english: "Bread", bangla: ["রুটি"], pos: ["noun"] },
  { english: "Cheese", bangla: ["পনির"], pos: ["noun"] },
  { english: "Chicken", bangla: ["মুরগি"], pos: ["noun"] },
  { english: "Meat", bangla: ["মাংস"], pos: ["noun"] },
  { english: "Milk", bangla: ["দুধ"], pos: ["noun"] },
  { english: "Fish", bangla: ["মাছ"], pos: ["noun"] },
  { english: "Egg", bangla: ["ডিম"], pos: ["noun"] },
];

export const mcqQuestion = {
  prompt: "Perfidious",
  promptLabel: "What is the meaning of the following word?",
  progress: 0.3,
  index: 3,
  total: 10,
  answer: ["বিশ্বাসঘাতক"],
  options: ["অনধিগম্য", "প্রশংসনীয়", "বিশ্বাসঘাতক", "জনসমাবেশ"],
};

export const typingQuestion = {
  prompt: "Apple",
  promptLabel: "Type the translation",
  progress: 0.4,
  index: 4,
  total: 10,
  answer: ["আপেল"],
};

export const result = {
  score: 90,
  correct: 9,
  incorrect: 1,
  duration: "1:05",
  missedWord: "Perfidious",
  yourAnswer: "জনসমাবেশ",
  correctAnswer: "বিশ্বাসঘাতক",
};
