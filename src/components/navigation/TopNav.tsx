import React from "react";
import {
  Menu,
  Plus,
  Moon,
  Sun,
  Settings,
  Sparkles,
  ChevronRight,
  Edit2,
  Trash2,
  Share2,
} from "lucide-react";
import { Logo } from "../brand/Logo";
import { ThemeMode } from "../../types";

interface TopNavProps {
  onToggleMobileSidebar: () => void;
  onToggleDesktopSidebar: () => void;
  isDesktopSidebarCollapsed: boolean;
  currentTitle?: string;
  onRenameChat?: () => void;
  onNewChat: () => void;
  onClearChat?: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  isApiConfigured: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  isDesktopSidebarCollapsed,
  currentTitle = "New Conversation",
  onRenameChat,
  onNewChat,
  onClearChat,
  theme,
  onToggleTheme,
  onOpenSettings,
  isApiConfigured,
}) => {
  return (
    <header
      id="meyra-top-navigation"
      className="h-16 border-b border-white/5 bg-[#0A0A0B]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none"
    >
      {/* Left section: Sidebar toggles & Conversation title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu trigger */}
        <button
          id="mobile-sidebar-toggle-btn"
          type="button"
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop expand sidebar trigger */}
        {isDesktopSidebarCollapsed && (
          <button
            type="button"
            onClick={onToggleDesktopSidebar}
            className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Mobile brand if sidebar is closed */}
        <div className="lg:hidden">
          <Logo size="sm" showText={false} />
        </div>

        {/* Current chat title with quick rename */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-white truncate max-w-[160px] sm:max-w-xs md:max-w-md">
            {currentTitle}
          </span>
          {onRenameChat && (
            <button
              type="button"
              onClick={onRenameChat}
              className="p-1 text-slate-500 hover:text-indigo-300 rounded hover:bg-white/5 transition-colors cursor-pointer"
              title="Rename this conversation"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Right section: Model pill, New Chat, Theme toggle, Settings */}
      <div className="flex items-center gap-2">
        {/* Model Indicator Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-300 border border-white/5">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Meyra Pro • Gemini 3.7</span>
        </div>

        {/* New chat icon */}
        <button
          type="button"
          onClick={onNewChat}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          title="New Conversation"
        >
          <Plus className="w-4 h-4 text-indigo-400" />
        </button>

        {/* Theme Toggle */}
        <button
          id="theme-toggle-btn"
          type="button"
          onClick={onToggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* Settings button */}
        <button
          id="top-settings-btn"
          type="button"
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          title="Open Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
