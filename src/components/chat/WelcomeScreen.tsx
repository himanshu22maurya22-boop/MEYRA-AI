import React from "react";
import { Logo } from "../brand/Logo";
import { SuggestionCards } from "./SuggestionCards";
import { Sparkles, Cpu, ShieldCheck } from "lucide-react";

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  isApiConfigured: boolean;
  onOpenSettings?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  isApiConfigured,
  onOpenSettings,
}) => {
  return (
    <div
      id="meyra-welcome-screen"
      className="flex flex-col items-center justify-center min-h-full px-4 py-8 text-center max-w-4xl mx-auto my-auto"
    >
      {/* Brand Hero Visual */}
      <div className="mb-6 flex flex-col items-center">
        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8 text-indigo-400"
          >
            <path d="M3 20V4l9 7 9-7v16" />
          </svg>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>MEYRA AI • Powered by Gemini 3.7</span>
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
        How can I help you today?
      </h1>
      <p className="text-slate-400 text-base sm:text-lg mb-8 sm:mb-10 text-center max-w-md">
        Ask anything, create something, or learn something new.
      </p>

      {/* API Notice if not configured */}
      {!isApiConfigured && (
        <div className="mb-8 w-full max-w-md p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Ready for your Gemini API key in <code className="font-mono bg-amber-900/50 px-1 rounded">.env</code></span>
          </div>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-2.5 py-1 text-[11px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded text-amber-200 cursor-pointer shrink-0"
            >
              Configure
            </button>
          )}
        </div>
      )}

      {/* 4 Suggestion Cards */}
      <SuggestionCards onSelectPrompt={onSelectPrompt} />

      {/* Trust & Capability micro-badge */}
      <div className="mt-10 flex items-center justify-center gap-6 text-[11px] font-medium text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400/80" />
          <span>Server-Side API Security</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-400/80" />
          <span>Full Markdown & Code Support</span>
        </div>
      </div>
    </div>
  );
};

