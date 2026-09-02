import React from "react";
import { HelpCircle, PenTool, Code2, Lightbulb, ArrowUpRight } from "lucide-react";
import { SuggestionItem } from "../../types";

interface SuggestionCardsProps {
  onSelectPrompt: (promptText: string) => void;
}

export const SUGGESTIONS: SuggestionItem[] = [
  {
    id: "explain",
    category: "explain",
    title: "Explain something",
    description: "Quantum computing in simple terms with an everyday analogy",
    prompt: "Explain how quantum computing works compared to classical computing, using an intuitive everyday analogy that anyone can understand.",
    iconName: "HelpCircle",
  },
  {
    id: "write",
    category: "write",
    title: "Help me write",
    description: "Executive strategy memo for integrating AI into business workflows",
    prompt: "Draft a concise, high-impact executive memo proposing a roadmap for integrating AI automation into customer support operations safely.",
    iconName: "PenTool",
  },
  {
    id: "code",
    category: "code",
    title: "Help me code",
    description: "TypeScript async concurrency worker queue with retry & timeout",
    prompt: "Write a complete, type-safe TypeScript implementation of a concurrent task queue with max concurrency limits, exponential backoff retries, and timeout handling.",
    iconName: "Code2",
  },
  {
    id: "ideas",
    category: "ideas",
    title: "Give me ideas",
    description: "5 innovative startup concepts uniting AI and clean renewable energy",
    prompt: "Brainstorm 5 innovative, commercially viable startup ideas that combine generative AI intelligence with clean renewable energy systems. Include value proposition for each.",
    iconName: "Lightbulb",
  },
];

export const SuggestionCards: React.FC<SuggestionCardsProps> = ({ onSelectPrompt }) => {
  const getIconContainer = (category: string) => {
    switch (category) {
      case "write":
        return (
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
            <PenTool className="w-5 h-5" />
          </div>
        );
      case "code":
        return (
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
            <Code2 className="w-5 h-5" />
          </div>
        );
      case "ideas":
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
            <Lightbulb className="w-5 h-5" />
          </div>
        );
      case "explain":
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
            <HelpCircle className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div id="meyra-suggestion-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
      {SUGGESTIONS.map((item) => (
        <button
          id={`suggestion-card-${item.category}`}
          key={item.id}
          type="button"
          onClick={() => onSelectPrompt(item.prompt)}
          className="text-left p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.08] transition-all group cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between w-full">
            {getIconContainer(item.category)}
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>

          <div>
            <h4 className="font-semibold text-white mb-1 group-hover:text-indigo-200 transition-colors">
              {item.title}
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
              {item.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};
