import React, { useState, useMemo } from "react";
import { Conversation } from "../../types";
import { Logo } from "../brand/Logo";
import { ConversationItem } from "./ConversationItem";
import {
  Plus,
  Search,
  Settings,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
  Shield,
  Trash2,
} from "lucide-react";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop: boolean;
  onToggleCollapseDesktop: () => void;
  onOpenSettings: () => void;
  onOpenPrivacy: () => void;
  isApiConfigured: boolean;
  userDisplayName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  isOpenMobile,
  onCloseMobile,
  isCollapsedDesktop,
  onToggleCollapseDesktop,
  onOpenSettings,
  onOpenPrivacy,
  isApiConfigured,
  userDisplayName = "User",
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.messages.some((m) => m.content.toLowerCase().includes(query))
    );
  }, [conversations, searchQuery]);

  // Group conversations chronologically
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const last7DaysStart = todayStart - 7 * 86400000;

    const groups: {
      today: Conversation[];
      yesterday: Conversation[];
      last7Days: Conversation[];
      older: Conversation[];
    } = {
      today: [],
      yesterday: [],
      last7Days: [],
      older: [],
    };

    filteredConversations.forEach((conv) => {
      const time = conv.updatedAt || conv.createdAt;
      if (time >= todayStart) {
        groups.today.push(conv);
      } else if (time >= yesterdayStart) {
        groups.yesterday.push(conv);
      } else if (time >= last7DaysStart) {
        groups.last7Days.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [filteredConversations]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        id="meyra-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 flex flex-col bg-[#131316] border-r border-white/5 transition-all duration-300 ease-in-out ${
          isOpenMobile ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsedDesktop ? "lg:w-0 lg:overflow-hidden lg:border-r-0" : "lg:w-72"}`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <Logo size="md" showText={true} />

          <div className="flex items-center gap-1">
            {/* Desktop collapse toggle */}
            <button
              onClick={onToggleCollapseDesktop}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Mobile close toggle */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Button: New Chat */}
        <div className="p-3">
          <button
            id="meyra-new-chat-btn"
            type="button"
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-3 transition-colors text-sm font-medium text-white shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Search Chats Input */}
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-500 pointer-events-none" />
            <input
              id="sidebar-search-chats"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white/5 border border-white/10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {conversations.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <Sparkles className="w-5 h-5 mx-auto mb-2 opacity-40 text-indigo-400" />
              <p>No conversations yet</p>
              <p className="text-[11px] text-slate-600 mt-1">Start a new chat above</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              <p>No chats match "{searchQuery}"</p>
            </div>
          ) : (
            <>
              {/* Today */}
              {groupedConversations.today.length > 0 && (
                <div className="space-y-1">
                  <h4 className="px-2 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                    Today
                  </h4>
                  {groupedConversations.today.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeConversationId}
                      onSelect={() => {
                        onSelectConversation(conv.id);
                        onCloseMobile();
                      }}
                      onRename={onRenameConversation}
                      onDelete={onDeleteConversation}
                    />
                  ))}
                </div>
              )}

              {/* Yesterday */}
              {groupedConversations.yesterday.length > 0 && (
                <div className="space-y-1">
                  <h4 className="px-2 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                    Yesterday
                  </h4>
                  {groupedConversations.yesterday.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeConversationId}
                      onSelect={() => {
                        onSelectConversation(conv.id);
                        onCloseMobile();
                      }}
                      onRename={onRenameConversation}
                      onDelete={onDeleteConversation}
                    />
                  ))}
                </div>
              )}

              {/* Previous 7 Days */}
              {groupedConversations.last7Days.length > 0 && (
                <div className="space-y-1">
                  <h4 className="px-2 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                    Previous 7 Days
                  </h4>
                  {groupedConversations.last7Days.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeConversationId}
                      onSelect={() => {
                        onSelectConversation(conv.id);
                        onCloseMobile();
                      }}
                      onRename={onRenameConversation}
                      onDelete={onDeleteConversation}
                    />
                  ))}
                </div>
              )}

              {/* Older */}
              {groupedConversations.older.length > 0 && (
                <div className="space-y-1">
                  <h4 className="px-2 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                    Older
                  </h4>
                  {groupedConversations.older.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeConversationId}
                      onSelect={() => {
                        onSelectConversation(conv.id);
                        onCloseMobile();
                      }}
                      onRename={onRenameConversation}
                      onDelete={onDeleteConversation}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Sidebar Footer */}
        <div className="p-3 border-t border-white/5 bg-[#131316] space-y-2">
          {/* User & Settings Trigger */}
          <button
            id="sidebar-settings-btn"
            type="button"
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                {userDisplayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs font-medium text-white truncate">{userDisplayName}</span>
                <span className="text-[10px] text-slate-500 truncate">Pro Plan</span>
              </div>
            </div>
            <Settings className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Model & Security status */}
          <div className="px-2 py-0.5 flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isApiConfigured ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span>{isApiConfigured ? "AI Online" : "Needs API Key"}</span>
            </span>
            <span className="text-slate-600">v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};
