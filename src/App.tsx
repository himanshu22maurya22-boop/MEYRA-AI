import React, { useState, useEffect } from "react";
import { useChat } from "./hooks/useChat";
import { useTheme } from "./hooks/useTheme";
import { chatStorage, DEFAULT_SETTINGS } from "./services/storage";
import { UserSettings } from "./types";
import { Sidebar } from "./components/sidebar/Sidebar";
import { TopNav } from "./components/navigation/TopNav";
import { ChatArea } from "./components/chat/ChatArea";
import { SettingsModal } from "./components/modals/SettingsModal";
import { PrivacyModal } from "./components/modals/PrivacyModal";
import { TermsModal } from "./components/modals/TermsModal";
import { ContactModal } from "./components/modals/ContactModal";
import { RenameModal, DeleteModal } from "./components/modals/RenameModal";
import { ApiKeyNoticeModal } from "./components/modals/ApiKeyNoticeModal";

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(() => chatStorage.getSettings());
  const { theme, setTheme, toggleTheme } = useTheme(settings.theme);

  // Sync theme changes with settings
  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    chatStorage.saveSettings(newSettings);
    if (newSettings.theme !== theme) {
      setTheme(newSettings.theme);
    }
  };

  const {
    conversations,
    activeConversation,
    activeId,
    isStreaming,
    apiStatus,
    createNewChat,
    selectConversation,
    renameConversation,
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

  // Rename & Delete modal state
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; isAll?: boolean } | null>(null);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  const currentMessages = activeConversation?.messages || [];
  const currentTitle = activeConversation?.title || "New Conversation";

  return (
    <div id="meyra-app-root" className="flex h-screen w-screen overflow-hidden bg-[#0A0A0B] text-slate-200 font-sans">
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
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsedDesktop={isDesktopSidebarCollapsed}
        onToggleCollapseDesktop={() => setIsDesktopSidebarCollapsed((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        isApiConfigured={apiStatus.isConfigured}
        userDisplayName={settings.userDisplayName}
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
          onClearChat={currentMessages.length > 0 ? clearCurrentChat : undefined}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isApiConfigured={apiStatus.isConfigured}
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
          userDisplayName={settings.userDisplayName}
          userAvatarColor={settings.userAvatarColor}
          enterToSend={settings.enterToSend}
        />
      </div>

      {/* Modals */}
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
    </div>
  );
}
