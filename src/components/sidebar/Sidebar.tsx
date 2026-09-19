import React, { useState, useMemo, useEffect } from "react";
import { Conversation, UserProfile } from "../../types";
import { Logo } from "../brand/Logo";
import { ConversationItem } from "./ConversationItem";
import { verifyAdminStatus } from "../../services/api";
import {
  Plus,
  Search,
  Settings,
  X,
  Sparkles,
  ChevronLeft,
  Pin,
  FolderKanban,
  Folder,
  Brain,
  Bot,
  Image as ImageIcon,
  ShieldAlert,
} from "lucide-react";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onTogglePinConversation?: (id: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop: boolean;
  onToggleCollapseDesktop: () => void;
  onOpenSettings: () => void;
  onOpenPrivacy: () => void;
  onOpenMemory: () => void;
  onOpenProjects: () => void;
  activeProjectId?: string | null;
  activeProjectTitle?: string | null;
  onOpenFiles: () => void;
  onOpenAgents: () => void;
  onOpenImageGen: () => void;
  onOpenAdmin: () => void;
  isApiConfigured: boolean;
  userDisplayName?: string;
  user?: UserProfile | null;
  onLogout?: () => void;
  onOpenAuth?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onTogglePinConversation,
  isOpenMobile,
  onCloseMobile,
  isCollapsedDesktop,
  onToggleCollapseDesktop,
  onOpenSettings,
  onOpenMemory,
  onOpenProjects,
  activeProjectId,
  activeProjectTitle,
  onOpenFiles,
  onOpenAgents,
  onOpenImageGen,
  onOpenAdmin,
  isApiConfigured,
  userDisplayName = "User",
  user,
  onOpenAuth,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isVerifiedFounder, setIsVerifiedFounder] = useState(false);

  // Real server-side Founder Admin verification
  useEffect(() => {
    let isMounted = true;
    async function checkFounderAdmin() {
      if (!user?.authToken && user?.email?.toLowerCase().trim() !== "himanshu22maurya22@gmail.com") {
        setIsVerifiedFounder(false);
        return;
      }
      try {
        const result = await verifyAdminStatus(user?.authToken);
        if (isMounted && result?.authorized) {
          setIsVerifiedFounder(true);
        } else if (isMounted) {
          setIsVerifiedFounder(false);
        }
      } catch {
        if (isMounted) setIsVerifiedFounder(false);
      }
    }
    checkFounderAdmin();
    return () => {
      isMounted = false;
    };
  }, [user?.authToken, user?.email]);

  // Filter conversations by user search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase().trim();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.messages.some((m) => m.content.toLowerCase().includes(query))
    );
  }, [conversations, searchQuery]);

  // Separate pinned conversations
  const pinnedConversations = useMemo(() => {
    return filteredConversations.filter((c) => c.isPinned);
  }, [filteredConversations]);

  const unpinnedConversations = useMemo(() => {
    return filteredConversations.filter((c) => !c.isPinned);
  }, [filteredConversations]);

  // Group unpinned conversations chronologically: TODAY, YESTERDAY, PREVIOUS 7 DAYS, OLDER
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

    unpinnedConversations.forEach((conv) => {
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
  }, [unpinnedConversations]);

  // Resolve clean display name & handle username safely without exposing email or ID
  const effectiveDisplayName = (user?.name || userDisplayName || "User").trim();
  const rawUsername = user?.username ? user.username.replace(/^@/, "").trim() : "";
  const formattedUsername = rawUsername ? `@${rawUsername}` : null;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          id="meyra-sidebar-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Drawer / Container */}
      <aside
        id="meyra-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 flex flex-col bg-[#111116] border-r border-white/[0.08] transition-all duration-300 ease-out overflow-x-hidden ${
          isOpenMobile
            ? "translate-x-0 w-[284px] max-w-[85vw] shadow-2xl shadow-black/80"
            : "-translate-x-full lg:translate-x-0"
        } ${isCollapsedDesktop ? "lg:w-0 lg:overflow-hidden lg:border-r-0" : "lg:w-72"}`}
      >
        {/* 1. SIDEBAR HEADER */}
        <div
          id="sidebar-header"
          className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] shrink-0"
        >
          <Logo size="md" showText={true} />

          <div className="flex items-center gap-1">
            <button
              id="sidebar-collapse-desktop-btn"
              onClick={onToggleCollapseDesktop}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              id="sidebar-close-mobile-btn"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body: New Chat + Main Nav + Search + Conversations */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-4">
          {/* 2. NEW CONVERSATION BUTTON */}
          <div>
            <button
              id="meyra-new-chat-btn"
              type="button"
              onClick={() => {
                onNewChat();
                onCloseMobile();
              }}
              className="w-full py-2.5 px-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
              <span>New Conversation</span>
            </button>
          </div>

          {/* 3. MAIN NAVIGATION: Functional MEYRA Capabilities */}
          <nav id="sidebar-main-nav" aria-label="Main MEYRA features" className="space-y-0.5">
            {/* Images */}
            <button
              id="sidebar-nav-images"
              type="button"
              onClick={() => {
                onOpenImageGen();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0 group-hover:bg-violet-500/25 transition-colors">
                <ImageIcon className="w-3.5 h-3.5 text-violet-300" />
              </div>
              <span className="truncate">Images</span>
            </button>

            {/* Files / Library */}
            <button
              id="sidebar-nav-files"
              type="button"
              onClick={() => {
                onOpenFiles();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center shrink-0 group-hover:bg-cyan-500/25 transition-colors">
                <Folder className="w-3.5 h-3.5 text-cyan-300" />
              </div>
              <span className="truncate">Files / Library</span>
            </button>

            {/* Projects */}
            <button
              id="sidebar-nav-projects"
              type="button"
              onClick={() => {
                onOpenProjects();
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                activeProjectId
                  ? "bg-indigo-600/15 border border-indigo-500/30 text-indigo-200"
                  : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    activeProjectId
                      ? "bg-indigo-500/25 border border-indigo-500/40"
                      : "bg-indigo-500/15 border border-indigo-500/25 group-hover:bg-indigo-500/25"
                  }`}
                >
                  <FolderKanban
                    className={`w-3.5 h-3.5 ${
                      activeProjectId ? "text-indigo-300" : "text-indigo-400"
                    }`}
                  />
                </div>
                <span className="truncate">Projects</span>
              </div>
              {activeProjectId && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate max-w-[65px]">{activeProjectTitle || "Active"}</span>
                </span>
              )}
            </button>

            {/* Memory */}
            <button
              id="sidebar-nav-memory"
              type="button"
              onClick={() => {
                onOpenMemory();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-pink-500/15 border border-pink-500/25 flex items-center justify-center shrink-0 group-hover:bg-pink-500/25 transition-colors">
                <Brain className="w-3.5 h-3.5 text-pink-300" />
              </div>
              <span className="truncate">Memory</span>
            </button>

            {/* Agents */}
            <button
              id="sidebar-nav-agents"
              type="button"
              onClick={() => {
                onOpenAgents();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0 group-hover:bg-amber-500/25 transition-colors">
                <Bot className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <span className="truncate">Agents</span>
            </button>
          </nav>

          <div className="border-t border-white/[0.06]" />

          {/* 4. CHAT SEARCH FIELD */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              id="sidebar-search-chats"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-8 py-2 text-xs rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 5. CHAT HISTORY (Date-Grouped) & 6. CLEAN EMPTY STATE */}
          <div id="sidebar-chat-history" className="space-y-4">
            {/* Pinned section if present */}
            {pinnedConversations.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 px-2.5 text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                  <Pin className="w-2.5 h-2.5 fill-amber-400/30" />
                  <span>PINNED</span>
                </div>
                {pinnedConversations.map((conv) => (
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
                    onTogglePin={onTogglePinConversation}
                  />
                ))}
              </div>
            )}

            {conversations.length === 0 ? (
              /* 6. Clean Empty State */
              <div
                id="sidebar-empty-conversations"
                className="py-8 px-4 text-center flex flex-col items-center justify-center text-slate-500"
              >
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-indigo-400 mb-2.5">
                  <Sparkles className="w-4 h-4 opacity-75" />
                </div>
                <p className="text-xs font-medium text-slate-300">No conversations yet</p>
                <button
                  type="button"
                  onClick={() => {
                    onNewChat();
                    onCloseMobile();
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 hover:text-indigo-200 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/25 transition-colors cursor-pointer"
                >
                  Start a new conversation
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              /* No search results */
              <div className="py-6 px-3 text-center text-slate-400 text-xs">
                <p>No conversations found</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-[11px] text-indigo-400 hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <>
                {/* TODAY */}
                {groupedConversations.today.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="px-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      TODAY
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
                        onTogglePin={onTogglePinConversation}
                      />
                    ))}
                  </div>
                )}

                {/* YESTERDAY */}
                {groupedConversations.yesterday.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="px-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      YESTERDAY
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
                        onTogglePin={onTogglePinConversation}
                      />
                    ))}
                  </div>
                )}

                {/* PREVIOUS 7 DAYS */}
                {groupedConversations.last7Days.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="px-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      PREVIOUS 7 DAYS
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
                        onTogglePin={onTogglePinConversation}
                      />
                    ))}
                  </div>
                )}

                {/* OLDER */}
                {groupedConversations.older.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="px-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      OLDER
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
                        onTogglePin={onTogglePinConversation}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 7. USER PROFILE AT BOTTOM & 8. STATUS */}
        <div
          id="sidebar-footer"
          className="p-3 border-t border-white/[0.08] bg-[#111116] shrink-0 space-y-2"
        >
          {/* Admin link only for verified founder */}
          {isVerifiedFounder && (
            <button
              id="sidebar-founder-admin-btn"
              type="button"
              onClick={onOpenAdmin}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-950/40 border border-amber-500/30 hover:bg-amber-950/60 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Founder Admin</span>
              </span>
              <span className="text-[9px] font-mono uppercase bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300 font-bold tracking-wider">
                VERIFIED
              </span>
            </button>
          )}

          {/* 7. User Profile Card */}
          {user ? (
            <button
              id="sidebar-user-profile-card"
              type="button"
              onClick={onOpenSettings}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] border border-white/[0.06] transition-all cursor-pointer group text-left"
              title="Open Settings & Preferences"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={effectiveDisplayName}
                    className="w-8 h-8 rounded-xl object-cover ring-1 ring-indigo-500/30 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/10 shrink-0 select-none">
                    {effectiveDisplayName.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-white truncate">
                    {effectiveDisplayName}
                  </span>
                  {formattedUsername && (
                    <span className="text-[11px] text-slate-400 truncate">
                      {formattedUsername}
                    </span>
                  )}
                </div>
              </div>
              <Settings className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors shrink-0 ml-2" />
            </button>
          ) : (
            <div className="space-y-1.5">
              <button
                id="sidebar-guest-profile-card"
                type="button"
                onClick={onOpenSettings}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] border border-white/[0.06] transition-all cursor-pointer group text-left"
                title="Open Settings & Preferences"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.08] flex items-center justify-center text-slate-300 text-xs font-bold ring-1 ring-white/10 shrink-0 select-none">
                    {effectiveDisplayName.charAt(0).toUpperCase() || "G"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white truncate">
                      {effectiveDisplayName}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">
                      Personal Preferences
                    </span>
                  </div>
                </div>
                <Settings className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors shrink-0 ml-2" />
              </button>

              {onOpenAuth && (
                <button
                  id="sidebar-signin-cta"
                  type="button"
                  onClick={onOpenAuth}
                  className="w-full flex items-center justify-center py-1.5 px-3 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/25 transition-colors cursor-pointer"
                >
                  Sign in to sync history
                </button>
              )}
            </div>
          )}

          {/* 8. STATUS: Small, clean, no technical backend leaks */}
          <div
            id="sidebar-status-bar"
            className="pt-1 px-1 flex items-center justify-between text-[11px] text-slate-500"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    isApiConfigured ? "bg-emerald-400" : "bg-indigo-400"
                  } opacity-75`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isApiConfigured ? "bg-emerald-500" : "bg-indigo-500"
                  }`}
                />
              </span>
              <span className="font-medium text-slate-400">MEYRA AI Online</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

