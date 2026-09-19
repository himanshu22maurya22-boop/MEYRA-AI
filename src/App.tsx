import React, { useState, useMemo, useEffect } from "react";
import { useChat } from "./hooks/useChat";
import { useTheme } from "./hooks/useTheme";
import { chatStorage } from "./services/storage";
import { UserProfile, UserSettings, FileItem, AIPersona } from "./types";
import { AuthModal, AuthModalInitialView } from "./components/auth/AuthModal";
import { Sidebar } from "./components/sidebar/Sidebar";
import { TopNav } from "./components/navigation/TopNav";
import { ChatArea } from "./components/chat/ChatArea";
import { SettingsModal } from "./components/modals/SettingsModal";
import { PrivacyModal } from "./components/modals/PrivacyModal";
import { TermsModal } from "./components/modals/TermsModal";
import { ContactModal } from "./components/modals/ContactModal";
import { RenameModal, DeleteModal } from "./components/modals/RenameModal";
import { ApiKeyNoticeModal } from "./components/modals/ApiKeyNoticeModal";
import { LogoutConfirmModal } from "./components/modals/LogoutConfirmModal";
import { VoiceConversationModal } from "./components/voice/VoiceConversationModal";
import { ProjectsModal } from "./components/projects/ProjectsModal";
import { FilesModal } from "./components/files/FilesModal";
import { MemoryModal } from "./components/memory/MemoryModal";
import { AgentsModal } from "./components/agents/AgentsModal";
import { ImageGenModal } from "./components/image/ImageGenModal";
import { AdminModal } from "./components/admin/AdminModal";

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(() => chatStorage.getSettings());
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  // Keep settings state synchronized with centralized theme
  useEffect(() => {
    if (settings.theme !== theme) {
      setSettings((prev) => ({ ...prev, theme }));
    }
  }, [theme, settings.theme]);

  // Authentication State
  const [user, setUser] = useState<UserProfile | null>(() => chatStorage.getUser());
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialView, setAuthModalInitialView] = useState<AuthModalInitialView>("prompt");

  // 10-minute continuous active chat session prompt for guest users
  useEffect(() => {
    if (user) return; // User already authenticated

    const SESSION_DISMISSED_KEY = "meyra_login_prompt_dismissed";
    if (sessionStorage.getItem(SESSION_DISMISSED_KEY) === "true") return;

    // Track active chat time in this browser session
    const SESSION_ACTIVE_KEY = "meyra_guest_active_seconds";
    let activeSeconds = parseInt(sessionStorage.getItem(SESSION_ACTIVE_KEY) || "0", 10);

    const interval = setInterval(() => {
      activeSeconds += 5;
      sessionStorage.setItem(SESSION_ACTIVE_KEY, activeSeconds.toString());

      // 10 minutes = 600 seconds
      if (activeSeconds >= 600) {
        setAuthModalInitialView("prompt");
        setIsAuthModalOpen(true);
        sessionStorage.setItem(SESSION_DISMISSED_KEY, "true");
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const handleOpenManualAuth = () => {
    setAuthModalInitialView("email");
    setIsAuthModalOpen(true);
  };

  // Sync theme changes with settings
  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    chatStorage.saveSettings(newSettings);
    if (newSettings.theme !== theme) {
      setTheme(newSettings.theme);
    }
    // Synchronize authenticated user profile display name if user is logged in
    if (user && newSettings.userDisplayName && newSettings.userDisplayName.trim() !== user.name) {
      const updatedUser: UserProfile = { ...user, name: newSettings.userDisplayName.trim() };
      setUser(updatedUser);
      chatStorage.saveUser(updatedUser);
    }
  };

  const handleLoginSuccess = (authenticatedUser: UserProfile) => {
    setUser(authenticatedUser);
    if (authenticatedUser.name && authenticatedUser.name !== settings.userDisplayName) {
      handleUpdateSettings({
        ...settings,
        userDisplayName: authenticatedUser.name,
      });
    }
    setActiveProject(chatStorage.getActiveProjectId(authenticatedUser.id));
    showToast(`Welcome to MEYRA AI, ${authenticatedUser.name || "friend"}!`);
  };

  // Open logout confirmation dialog
  const handleRequestLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  // Confirmed logout with server-side session revocation
  const handleConfirmLogout = () => {
    if (user?.authToken) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.authToken}`,
        },
      }).catch(() => {});
    }
    chatStorage.clearUser();
    setUser(null);
    setActiveProject(chatStorage.getActiveProjectId("local_user"));
    setIsSettingsOpen(false);
    setIsLogoutConfirmOpen(false);
    showToast("Signed out successfully");
  };

  const {
    conversations,
    activeConversation,
    activeId,
    isStreaming,
    apiStatus,
    activePersona,
    setPersona,
    activeProjectId,
    setActiveProject,
    isWebSearchActive,
    setIsWebSearchActive,
    createNewChat,
    selectConversation,
    renameConversation,
    togglePinConversation,
    deleteConversation,
    clearCurrentChat,
    clearAllHistory,
    sendMessage,
    stopGeneration,
    regenerateResponse,
    setConversations,
  } = useChat(settings);

  // UI Navigation states
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isApiKeyNoticeOpen, setIsApiKeyNoticeOpen] = useState(false);

  // New Platform Workspace Modals state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isAgentsModalOpen, setIsAgentsModalOpen] = useState(false);
  const [isImageGenModalOpen, setIsImageGenModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Rename & Delete modal state
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; isAll?: boolean } | null>(null);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Active project title lookup
  const activeProjectTitle = useMemo(() => {
    if (!activeProjectId) return null;
    const p = chatStorage.getProject(activeProjectId, user?.id);
    return p ? p.title : null;
  }, [activeProjectId, user]);

  // Last assistant message for voice mode context
  const lastAssistantMessage = useMemo(() => {
    if (!activeConversation) return undefined;
    const msgs = activeConversation.messages;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "assistant" && msgs[i].content) {
        return msgs[i].content;
      }
    }
    return undefined;
  }, [activeConversation]);

  // Export Data Handler
  const handleExportData = () => {
    try {
      const dataStr = chatStorage.exportAllData();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `meyra_ai_backup_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Backup exported successfully!");
    } catch (err) {
      showToast("Failed to export backup.");
    }
  };

  // Import Data Handler
  const handleImportData = (jsonStr: string) => {
    const res = chatStorage.importAllData(jsonStr);
    if (res.success) {
      const updated = chatStorage.getConversations();
      setConversations(updated);
      showToast(`Imported ${res.count} conversations!`);
    } else {
      showToast(res.error || "Failed to import file.");
    }
  };

  // Handle asking question about a stored file
  const handleAskAboutFile = (
    file: FileItem,
    questionType: "summarize" | "study-notes" | "explain"
  ) => {
    setIsFilesModalOpen(false);
    let prompt = "";
    if (questionType === "summarize") {
      prompt = `Please provide a clear, concise executive summary of the attached file: "${file.name}". Highlight the key points and actionable takeaways.`;
    } else if (questionType === "study-notes") {
      prompt = `Generate structured study notes, flashcard questions, and key definitions based on the file "${file.name}".`;
    } else {
      prompt = `Please explain the contents of "${file.name}" in simple, intuitive terms.`;
    }

    if (file.content) {
      prompt += `\n\n--- Document Content ---\n${file.content.slice(0, 15000)}`;
    }

    sendMessage(prompt);
  };

  const currentMessages = activeConversation?.messages || [];
  const currentTitle = activeConversation?.title || "New Conversation";

  return (
    <div
      id="meyra-app-root"
      className={`flex h-[100dvh] w-screen overflow-hidden font-sans transition-colors duration-200 ${
        resolvedTheme === "light"
          ? "bg-[#F8FAFC] text-slate-800 light"
          : "bg-[#0A0A0B] text-slate-200 dark"
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-[#1a1a1f] border border-indigo-500/40 text-indigo-200 text-xs font-medium shadow-2xl animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Left Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeId}
        onSelectConversation={selectConversation}
        onNewChat={createNewChat}
        onRenameConversation={(id, title) => setRenameTarget({ id, title })}
        onDeleteConversation={(id) => {
          const conv = conversations.find((c) => c.id === id);
          setDeleteTarget({ id, title: conv?.title || "this conversation" });
        }}
        onTogglePinConversation={togglePinConversation}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsedDesktop={isDesktopSidebarCollapsed}
        onToggleCollapseDesktop={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenMemory={() => setIsMemoryModalOpen(true)}
        onOpenProjects={() => setIsProjectsModalOpen(true)}
        activeProjectId={activeProjectId}
        activeProjectTitle={activeProjectTitle}
        onOpenFiles={() => setIsFilesModalOpen(true)}
        onOpenAgents={() => setIsAgentsModalOpen(true)}
        onOpenImageGen={() => setIsImageGenModalOpen(true)}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        isApiConfigured={apiStatus.isConfigured}
        userDisplayName={user?.name || settings.userDisplayName}
        user={user}
        onLogout={handleRequestLogout}
        onOpenAuth={handleOpenManualAuth}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopNav
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          onToggleDesktopSidebar={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
          isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
          currentTitle={currentTitle}
          onRenameChat={
            activeId
              ? () => setRenameTarget({ id: activeId, title: currentTitle })
              : undefined
          }
          onNewChat={createNewChat}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenVoiceMode={() => setIsVoiceModalOpen(true)}
          isApiConfigured={apiStatus.isConfigured}
          user={user}
          currentPersona={activePersona}
          onSelectPersona={setPersona}
          activeProjectTitle={activeProjectTitle}
          onOpenProjects={() => setIsProjectsModalOpen(true)}
          hasMessages={currentMessages.length > 0}
          onOpenAuth={handleOpenManualAuth}
        />

        <ChatArea
          messages={currentMessages}
          isStreaming={isStreaming}
          isApiConfigured={apiStatus.isConfigured}
          onSendMessage={sendMessage}
          onStopGeneration={stopGeneration}
          onRegenerate={regenerateResponse}
          onClearChat={clearCurrentChat}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenVoiceMode={() => setIsVoiceModalOpen(true)}
          onOpenImageGen={() => setIsImageGenModalOpen(true)}
          onOpenProjects={() => setIsProjectsModalOpen(true)}
          isWebSearchActive={isWebSearchActive}
          onToggleWebSearch={() => setIsWebSearchActive(!isWebSearchActive)}
          userDisplayName={user?.name || settings.userDisplayName}
          userPhotoUrl={user?.photoUrl}
          userAvatarColor={settings.userAvatarColor}
          enterToSend={settings.enterToSend}
        />
      </div>

      {/* Core Platform Modals */}
      <VoiceConversationModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSendMessage={async (text) => {
          await sendMessage(text);
        }}
        onStopGeneration={stopGeneration}
        isStreaming={isStreaming}
        lastAssistantMessage={lastAssistantMessage}
        user={user}
        settings={settings}
      />

      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        currentUser={user}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProject}
      />

      <FilesModal
        isOpen={isFilesModalOpen}
        onClose={() => setIsFilesModalOpen(false)}
        currentUser={user}
        onAskAboutFile={handleAskAboutFile}
      />

      <MemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        currentUser={user}
      />

      <AgentsModal
        isOpen={isAgentsModalOpen}
        onClose={() => setIsAgentsModalOpen(false)}
        onActivateAgent={(persona: AIPersona, starterPrompt?: string) => {
          setPersona(persona);
          setIsAgentsModalOpen(false);
          if (starterPrompt) {
            sendMessage(starterPrompt);
          }
          showToast(`Switched to ${persona.replace("_", " ")} mode`);
        }}
      />

      <ImageGenModal
        isOpen={isImageGenModalOpen}
        onClose={() => setIsImageGenModalOpen(false)}
        currentUser={user}
      />

      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUser={user}
      />

      {/* Standard Settings & Info Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onClearHistory={() => setDeleteTarget({ id: "all", title: "all data", isAll: true })}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenTerms={() => setIsTermsOpen(true)}
        onOpenContact={() => setIsContactOpen(true)}
        user={user}
        onLogout={handleRequestLogout}
        onOpenAuth={handleOpenManualAuth}
      />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      <ApiKeyNoticeModal
        isOpen={isApiKeyNoticeOpen}
        onClose={() => setIsApiKeyNoticeOpen(false)}
      />

      {/* Rename Modal */}
      <RenameModal
        isOpen={Boolean(renameTarget)}
        initialTitle={renameTarget?.title || ""}
        onClose={() => setRenameTarget(null)}
        onSave={(newTitle) => {
          if (renameTarget) {
            renameConversation(renameTarget.id, newTitle);
            setRenameTarget(null);
            showToast("Conversation renamed");
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={Boolean(deleteTarget)}
        conversationTitle={deleteTarget?.title}
        isAll={deleteTarget?.isAll}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?.isAll) {
            clearAllHistory();
            showToast("All conversations deleted");
          } else if (deleteTarget?.id) {
            deleteConversation(deleteTarget.id);
            showToast("Conversation deleted");
          }
          setDeleteTarget(null);
        }}
      />

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
      />

      {/* Authentication & Guest Login Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialView={authModalInitialView}
        onClose={() => {
          sessionStorage.setItem("meyra_login_prompt_dismissed", "true");
          setIsAuthModalOpen(false);
        }}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
