import React from "react";
import { Sparkles } from "lucide-react";

export const TypingIndicator: React.FC = () => {
  return (
    <div
      id="meyra-typing-indicator"
      className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md w-fit shadow-xl"
    >
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-[bounce_1.4s_infinite_ease-in-out_0s]" />
        <span className="w-2 h-2 rounded-full bg-purple-400 animate-[bounce_1.4s_infinite_ease-in-out_0.2s]" />
        <span className="w-2 h-2 rounded-full bg-indigo-300 animate-[bounce_1.4s_infinite_ease-in-out_0.4s]" />
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <Sparkles className="w-3 h-3 animate-spin text-indigo-400" />
        <span>MEYRA AI is thinking...</span>
      </div>
    </div>
  );
};

