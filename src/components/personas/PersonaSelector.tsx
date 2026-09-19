import React, { useState, useRef, useEffect } from "react";
import { AIPersona, PersonaConfig } from "../../types";
import { PERSONA_LIST, getPersonaConfig } from "../../services/personas";
import {
  Zap,
  Smile,
  GraduationCap,
  Code2,
  PenTool,
  Brain,
  ChevronDown,
} from "lucide-react";

interface PersonaSelectorProps {
  currentPersona: AIPersona;
  onSelect: (persona: AIPersona) => void;
  compact?: boolean;
}

const PERSONA_ICONS: Record<string, React.ElementType> = {
  Zap,
  Smile,
  GraduationCap,
  Code2,
  PenTool,
  Brain,
};

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  currentPersona,
  onSelect,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeConfig = getPersonaConfig(currentPersona);
  const ActiveIcon = PERSONA_ICONS[activeConfig.icon] || Zap;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Trigger Button */}
      <button
        id="persona-selector-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 rounded-full border transition-all cursor-pointer select-none ${
          compact
            ? "px-2.5 py-1 text-xs bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
            : "px-3 py-1.5 text-xs font-medium bg-[#16161b] border-white/10 hover:border-indigo-500/40 text-slate-200 shadow-sm"
        }`}
        title={`Active AI Persona: ${activeConfig.label} (${activeConfig.tagline})`}
      >
        <ActiveIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span className="font-semibold text-white tracking-wide">{activeConfig.label}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="persona-dropdown-menu"
          className="absolute right-0 mt-1.5 w-64 rounded-2xl bg-[#141419] border border-white/10 shadow-2xl py-1.5 z-50 backdrop-blur-xl animate-fade-in divide-y divide-white/5"
        >
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-slate-400 flex items-center justify-between">
            <span>Select AI Mode</span>
            <span className="text-[9px] text-indigo-400 font-mono">6 Modes</span>
          </div>

          <div className="p-1 space-y-0.5 max-h-72 overflow-y-auto">
            {PERSONA_LIST.map((persona) => {
              const Icon = PERSONA_ICONS[persona.icon] || Zap;
              const isSelected = persona.id === currentPersona;

              return (
                <button
                  key={persona.id}
                  id={`persona-option-${persona.id}`}
                  onClick={() => {
                    onSelect(persona.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600/20 text-indigo-200 border border-indigo-500/30"
                      : "hover:bg-white/5 text-slate-300 hover:text-white"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white/5 text-slate-400"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{persona.label}</span>
                      {isSelected && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {persona.tagline}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
