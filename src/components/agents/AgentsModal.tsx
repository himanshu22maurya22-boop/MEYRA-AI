import React, { useState } from "react";
import {
  Bot,
  X,
  Sparkles,
  Search,
  Code2,
  GraduationCap,
  PenTool,
  CheckCircle2,
  Shield,
  ArrowRight,
} from "lucide-react";
import { AgentConfig, AIPersona } from "../../types";

interface AgentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivateAgent: (persona: AIPersona, starterPrompt?: string) => void;
}

const AGENTS: Array<{
  id: string;
  name: string;
  persona: AIPersona;
  description: string;
  icon: React.ElementType;
  color: string;
  capabilities: string[];
  samplePrompt: string;
}> = [
  {
    id: "agent_research",
    name: "Deep Research Agent",
    persona: "deep-think",
    description:
      "Performs structured multi-angle investigations, factual citations, and rigorous scientific reasoning.",
    icon: Search,
    color: "from-cyan-500 to-blue-600",
    capabilities: [
      "Live web search grounding",
      "Source verification",
      "Balanced comparative breakdown",
      "Executive summaries",
    ],
    samplePrompt: "Conduct a deep research report on quantum computing breakthroughs in 2025.",
  },
  {
    id: "agent_coding",
    name: "Full-Stack Software Agent",
    persona: "coding",
    description:
      "Senior engineer specializing in TypeScript, Python, algorithms, architecture review, and test synthesis.",
    icon: Code2,
    color: "from-emerald-500 to-teal-600",
    capabilities: [
      "Production-ready clean code",
      "Security audit & vulnerability scanning",
      "Multi-file project scaffolding",
      "Edge-case testing",
    ],
    samplePrompt: "Review my application architecture and recommend performance optimizations.",
  },
  {
    id: "agent_study",
    name: "Adaptive Socratic Tutor",
    persona: "study",
    description:
      "Pedagogical tutor breaking down complex concepts step-by-step using analogies, quizzes, and practice.",
    icon: GraduationCap,
    color: "from-amber-500 to-orange-600",
    capabilities: [
      "Step-by-step concept breakdown",
      "Practice quiz generation",
      "Active recall guidance",
      "Exam preparation notes",
    ],
    samplePrompt: "Teach me how Transformer neural networks work using simple visual analogies.",
  },
  {
    id: "agent_writing",
    name: "Publication Writing Agent",
    persona: "writing",
    description:
      "Editorial specialist for polished essays, documentation, persuasive memos, and creative storytelling.",
    icon: PenTool,
    color: "from-purple-500 to-pink-600",
    capabilities: [
      "Tone calibration & vocabulary elevation",
      "Grammar & rhythm polishing",
      "Headline & hook crafting",
      "Logical transitions & structure",
    ],
    samplePrompt: "Polish this project proposal to sound professional, punchy, and compelling.",
  },
];

export const AgentsModal: React.FC<AgentsModalProps> = ({
  isOpen,
  onClose,
  onActivateAgent,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#141418] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">MEYRA AI Agents</h3>
              <p className="text-xs text-slate-400">Specialized autonomous goal-driven agents</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Safety & Human Confirmation Banner */}
        <div className="px-6 py-3 bg-neutral-900/40 border-b border-white/5 flex items-center gap-3 text-xs text-slate-300">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="leading-relaxed">
            <span className="font-semibold text-white">Permission-governed: </span>
            All agent operations execute with explicit human confirmation and sandboxed boundaries.
          </p>
        </div>

        {/* Agents Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {AGENTS.map((agent) => {
            const Icon = agent.icon;

            return (
              <div
                key={agent.id}
                className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 hover:border-white/15 transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl bg-gradient-to-tr ${agent.color} text-white shadow-md`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {agent.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">Specialized Agent</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {agent.description}
                  </p>

                  <div className="space-y-1 pt-1">
                    {agent.capabilities.map((cap, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <CheckCircle2 className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      onActivateAgent(agent.persona, agent.samplePrompt);
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-indigo-600 hover:text-white text-xs font-semibold text-slate-200 cursor-pointer transition-all shadow-sm"
                  >
                    <span>Launch Agent</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-neutral-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
