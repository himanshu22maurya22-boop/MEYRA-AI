import React from "react";
import {
  Menu,
  ChevronRight,
  Edit2,
  FolderKanban,
} from "lucide-react";
import { Logo } from "../brand/Logo";
import { ThemeMode, UserProfile, AIPersona } from "../../types";
import { PersonaSelector } from "../personas/PersonaSelector";

interface TopNavProps {
  onToggleMobileSidebar: () => void;
  onToggleDesktopSidebar: () => void;
  isDesktopSidebarCollapsed: boolean;
  currentTitle?: string;
  onRenameChat?: () => void;
  onNewChat?: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
  onOpenVoiceMode?: () => void;
  isApiConfigured?: boolean;
  user?: UserProfile | null;
  currentPersona: AIPersona;
  onSelectPersona: (persona: AIPersona) => void;
  activeProjectTitle?: string | null;
  onOpenProjects?: () => void;
  hasMessages?: boolean;
  onOpenAuth?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  isDesktopSidebarCollapsed,
  currentTitle = "New Conversation",
  onRenameChat,
  currentPersona,
  onSelectPersona,
  activeProjectTitle,
  onOpenProjects,
  hasMessages = false,
}) => {
  return (
    <header
      id="meyra-top-navigation"
      className="h-14 sm:h-16 border-b border-white/[0.08] bg-[#0c0c10]/90 backdrop-blur-md px-3.5 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none gap-3"
    >
      {/* Left section: Sidebar toggle & MEYRA AI Brand */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {/* Mobile menu trigger */}
        <button
          id="mobile-sidebar-toggle-btn"
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Open menu"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop expand sidebar trigger */}
        {isDesktopSidebarCollapsed && (
          <button
            id="desktop-sidebar-expand-btn"
            type="button"
            onClick={onToggleDesktopSidebar}
            className="hidden lg:flex p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* MEYRA AI Logo and Title (Always visible) */}
        <div className="flex items-center gap-2 select-none shrink-0">
          <Logo size="sm" showText={false} />
          <span className="text-sm sm:text-base font-bold text-white tracking-wide">
            MEYRA AI
          </span>
        </div>

        {/* Conversation Title on medium+ screens */}
        {hasMessages && currentTitle && (
          <div className="hidden sm:flex items-center gap-1.5 min-w-0 pl-3 border-l border-white/[0.1]">
            <span className="text-xs sm:text-sm font-medium text-slate-300 truncate max-w-[160px] md:max-w-xs lg:max-w-sm">
              {currentTitle}
            </span>
            {onRenameChat && (
              <button
                type="button"
                onClick={onRenameChat}
                className="p-1 text-slate-500 hover:text-indigo-300 rounded hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
                title="Rename this conversation"
                aria-label="Rename conversation"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Active Project Tag */}
        {activeProjectTitle && (
          <button
            type="button"
            onClick={onOpenProjects}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium hover:bg-indigo-500/25 transition-colors cursor-pointer truncate max-w-[140px]"
            title={`Active Project: ${activeProjectTitle}`}
          >
            <FolderKanban className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="truncate">{activeProjectTitle}</span>
          </button>
        )}
      </div>

      {/* Right section: Fast Model / Persona Selector */}
      <div className="flex items-center shrink-0">
        <PersonaSelector
          currentPersona={currentPersona}
          onSelect={onSelectPersona}
          compact={false}
        />
      </div>
    </header>
  );
};
