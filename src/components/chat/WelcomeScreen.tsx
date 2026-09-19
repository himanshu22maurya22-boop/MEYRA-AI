import React from "react";
import { Logo } from "../brand/Logo";
import { HelpCircle, PenTool, Code2, Lightbulb } from "lucide-react";

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  userDisplayName?: string;
  isApiConfigured?: boolean;
  onOpenSettings?: () => void;
  onOpenVoiceMode?: () => void;
  onOpenImageGen?: () => void;
  onOpenProjects?: () => void;
}

interface SuggestionChipItem {
  id: string;
  category: "explain" | "write" | "code" | "ideas";
  title: string;
  prompt: string;
}

const SUGGESTION_CHIPS: SuggestionChipItem[] = [
  {
    id: "explain",
    category: "explain",
    title: "Explain something",
    prompt:
      "Explain how quantum computing works compared to classical computing, using an intuitive everyday analogy that anyone can understand.",
  },
  {
    id: "write",
    category: "write",
    title: "Help me write",
    prompt:
      "Draft a concise, high-impact executive memo proposing a roadmap for integrating AI automation into business operations safely.",
  },
  {
    id: "code",
    category: "code",
    title: "Help me code",
    prompt:
      "Write a complete, type-safe TypeScript implementation of a concurrent task queue with max concurrency limits, exponential backoff retries, and timeout handling.",
  },
  {
    id: "ideas",
    category: "ideas",
    title: "Give me ideas",
    prompt:
      "Brainstorm 5 innovative, commercially viable startup ideas that combine generative AI intelligence with clean renewable energy systems. Include value proposition for each.",
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  userDisplayName,
}) => {
  // Dynamically derive greeting name from display name
  const getGreetingName = (rawName?: string): string | null => {
    if (!rawName) return null;
    const trimmed = rawName.trim();
    if (!trimmed) return null;
    // Don't show default generic "User" placeholder
    if (trimmed.toLowerCase() === "user") return null;
    // Never show email or internal IDs
    if (trimmed.includes("@")) return null;
    // Extract first name (e.g. "Himanshu Maurya" -> "Himanshu", "Aditya" -> "Aditya", "Ankit" -> "Ankit")
    const firstWord = trimmed.split(/\s+/)[0];
    return firstWord || null;
  };

  const name = getGreetingName(userDisplayName);

  const getChipIcon = (category: SuggestionChipItem["category"]) => {
    switch (category) {
      case "explain":
        return <HelpCircle className="w-3.5 h-3.5 text-amber-400/90 shrink-0" />;
      case "write":
        return <PenTool className="w-3.5 h-3.5 text-indigo-400/90 shrink-0" />;
      case "code":
        return <Code2 className="w-3.5 h-3.5 text-purple-400/90 shrink-0" />;
      case "ideas":
        return <Lightbulb className="w-3.5 h-3.5 text-emerald-400/90 shrink-0" />;
    }
  };

  return (
    <div
      id="meyra-welcome-screen"
      className="flex flex-col items-center justify-center w-full px-3 sm:px-6 py-4 sm:py-8 text-center max-w-2xl mx-auto select-none"
    >
      {/* Subtle MEYRA AI Brand Header */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4 select-none opacity-90">
        <Logo size="sm" showText={false} />
        <span className="text-xs sm:text-sm font-semibold tracking-widest text-indigo-300/90 uppercase">
          MEYRA AI
        </span>
      </div>

      {/* Personalized Greeting */}
      {name ? (
        <h1
          id="meyra-home-greeting"
          className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-white text-center leading-tight mb-2 sm:mb-3"
        >
          <span>How can I help, </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-indigo-200 font-bold">
            {name}?
          </span>
        </h1>
      ) : (
        <h1
          id="meyra-home-greeting"
          className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-white text-center leading-tight mb-2 sm:mb-3"
        >
          How can I help?
        </h1>
      )}

      {/* Compact Suggestion Chips */}
      <div
        id="meyra-suggestion-chips"
        className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-xl mt-3 sm:mt-5 px-1"
      >
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            id={`suggestion-chip-${chip.category}`}
            key={chip.id}
            type="button"
            onClick={() => onSelectPrompt(chip.prompt)}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-indigo-500/40 text-slate-300 hover:text-white text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer shadow-sm active:scale-95"
            title={chip.title}
          >
            {getChipIcon(chip.category)}
            <span>{chip.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
