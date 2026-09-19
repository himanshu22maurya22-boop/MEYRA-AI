import React, { useState, useRef, useEffect } from "react";
import { UserSettings, ThemeMode } from "../../types";
import { useTheme } from "../../context/ThemeContext";
import {
  X,
  Sliders,
  Moon,
  Sun,
  Monitor,
  MessageSquare,
  User,
  Info,
  Shield,
  FileText,
  Mail,
  Trash2,
  Download,
  Upload,
  Sparkles,
  Check,
  Zap,
  Instagram,
  LogOut,
  CheckCircle,
} from "lucide-react";
import { Logo } from "../brand/Logo";
import { UserProfile } from "../../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onClearHistory: () => void;
  onExportData: () => void;
  onImportData: (jsonStr: string) => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenContact: () => void;
  user?: UserProfile | null;
  onLogout?: () => void;
  onOpenAuth?: () => void;
}

type TabType = "general" | "chat" | "account" | "about";

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearHistory,
  onExportData,
  onImportData,
  onOpenPrivacy,
  onOpenTerms,
  onOpenContact,
  user,
  onLogout,
  onOpenAuth,
}) => {
  const { theme: currentTheme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize local settings when modal opens or settings change
  useEffect(() => {
    if (isOpen) {
      setLocalSettings({
        ...settings,
        userDisplayName: user?.name || settings.userDisplayName,
      });
    }
  }, [isOpen, settings, user]);

  // Keep theme state synchronized with ThemeContext
  useEffect(() => {
    if (currentTheme) {
      setLocalSettings((prev) => (prev.theme === currentTheme ? prev : { ...prev, theme: currentTheme }));
    }
  }, [currentTheme]);

  if (!isOpen) return null;

  const handleChange = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    if (key === "theme") {
      setTheme(value as ThemeMode);
    }
    onUpdateSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportData(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#131316] border border-white/10 shadow-2xl overflow-hidden relative">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#131316]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Settings</h2>
              <p className="text-xs text-slate-400">Configure MEYRA AI preferences & storage</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono animate-fade-in">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-white/5 bg-[#0A0A0B]/60 gap-2 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "general"
                ? "border-indigo-500 text-indigo-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Theme & General</span>
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "chat"
                ? "border-indigo-500 text-indigo-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Preferences</span>
          </button>

          <button
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "account"
                ? "border-indigo-500 text-indigo-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Account & Storage</span>
          </button>

          <button
            onClick={() => setActiveTab("about")}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "about"
                ? "border-indigo-500 text-indigo-300 font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>About MEYRA AI</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1 text-sm text-slate-200">
          {/* TAB 1: General & Theme */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  Appearance Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "dark", label: "Dark Mode", icon: Moon },
                    { id: "light", label: "Light Mode", icon: Sun },
                    { id: "system", label: "System Sync", icon: Monitor },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = (localSettings.theme || currentTheme) === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`settings-theme-btn-${item.id}`}
                        type="button"
                        onClick={() => {
                          setTheme(item.id as ThemeMode);
                          handleChange("theme", item.id as any);
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer relative ${
                          isSelected
                            ? "bg-indigo-500/15 border-indigo-500 text-indigo-400 font-semibold shadow-sm ring-1 ring-indigo-500/30"
                            : "bg-[#1a1a1f] border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200"
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1.5" />
                        <span>{item.label}</span>
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  Message Font Size
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "sm", label: "Compact (Small)" },
                    { id: "md", label: "Standard (Medium)" },
                    { id: "lg", label: "Comfortable (Large)" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleChange("fontSize", item.id as any)}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        localSettings.fontSize === item.id
                          ? "bg-indigo-500/10 border-indigo-500 text-indigo-300"
                          : "bg-[#1a1a1f] border-white/5 text-slate-400 hover:border-white/20"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Legal & Support
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={onOpenPrivacy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1f] hover:bg-[#222228] border border-white/10 text-xs text-slate-300 hover:text-white cursor-pointer transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Privacy Policy</span>
                  </button>
                  <button
                    onClick={onOpenTerms}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1f] hover:bg-[#222228] border border-white/10 text-xs text-slate-300 hover:text-white cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Terms of Service</span>
                  </button>
                  <button
                    onClick={onOpenContact}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1f] hover:bg-[#222228] border border-white/10 text-xs text-slate-300 hover:text-white cursor-pointer transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Contact Support</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Chat Preferences */}
          {activeTab === "chat" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#1a1a1f] border border-white/5">
                <div>
                  <h4 className="text-sm font-medium text-white">Stream AI Responses</h4>
                  <p className="text-xs text-slate-400">Stream response tokens in real-time as they generate</p>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.streamResponse}
                  onChange={(e) => handleChange("streamResponse", e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#1a1a1f] border border-white/5">
                <div>
                  <h4 className="text-sm font-medium text-white">Enter to Send</h4>
                  <p className="text-xs text-slate-400">Press Enter key to send message (Shift + Enter for new line)</p>
                </div>
                <input
                  type="checkbox"
                  checked={localSettings.enterToSend}
                  onChange={(e) => handleChange("enterToSend", e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  AI Creativity (Temperature: {localSettings.temperature})
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={localSettings.temperature}
                  onChange={(e) => handleChange("temperature", parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>0.1 (Precise / Code)</span>
                  <span>0.7 (Balanced)</span>
                  <span>1.0 (Creative)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Custom System Persona Prompt
                </label>
                <textarea
                  rows={3}
                  value={localSettings.systemPrompt}
                  onChange={(e) => handleChange("systemPrompt", e.target.value)}
                  placeholder="Set global personality instructions for MEYRA AI..."
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0A0B] border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none font-mono"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Account & Data Storage */}
          {activeTab === "account" && (
            <div className="space-y-5">
              {/* Authenticated User Profile Card */}
              {user ? (
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 to-[#141419] border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                      {user.provider === "google" ? "Google Account" : "MEYRA AI Account"}
                    </span>
                    {onLogout && (
                      <button
                        type="button"
                        onClick={onLogout}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log out</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {user.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/40 shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-base font-bold text-white shadow-md border border-indigo-400/30">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white truncate">{user.name}</div>
                      {user.username ? (
                        <div className="text-xs text-indigo-300 font-mono">
                          @{user.username}
                        </div>
                      ) : (
                        <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                          <span>Connected</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#1a1a1f] border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-white">Guest Session</div>
                    <div className="text-[11px] text-slate-400">
                      You are using MEYRA AI in free guest chat mode.
                    </div>
                  </div>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAuth();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer shrink-0"
                    >
                      Sign In / Create Account
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={localSettings.userDisplayName}
                  onChange={(e) => handleChange("userDisplayName", e.target.value)}
                  placeholder="e.g., Alex"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0A0A0B] border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="p-4 rounded-xl bg-[#1a1a1f] border border-white/5 space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Data Portability & Backup
                </h4>
                <p className="text-xs text-slate-400">
                  Export your conversations and settings to JSON, or restore from a previous backup file.
                </p>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onExportData}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Export JSON Backup</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    <span>Import JSON Backup</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-rose-300">Clear All Chat History</h4>
                  <p className="text-xs text-rose-300/70">Permanently erase all local conversations</p>
                </div>
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold shadow-md cursor-pointer transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge Data</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: About MEYRA AI */}
          {activeTab === "about" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 p-4 rounded-xl bg-[#1a1a1f] border border-white/5">
                <Logo size="lg" />
                <div>
                  <h3 className="text-base font-bold text-white">MEYRA AI</h3>
                  <p className="text-xs text-indigo-300">Your intelligent AI companion • Version 1.0.0</p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <p>
                  <strong>MEYRA AI</strong> is a full-stack, production-ready AI chat application architected with React 19, TypeScript, Vite, Tailwind CSS, and a resilient Express Node.js API backend.
                </p>
                <p>
                  Designed with strict separation of concerns, zero client-side secret exposure, full Markdown &amp; code block highlighting, streaming response mechanics, and local-first persistence.
                </p>
              </div>

              {/* Core Team Section */}
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-3">
                <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                  MEYRA AI — Core Leadership Team
                </div>
                
                {/* Himanshu Maurya */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>👑</span> Himanshu Maurya
                    </div>
                    <div className="text-xs text-amber-300/90 font-medium">Founder / CEO / CTO</div>
                    <div className="text-[11px] text-slate-400">Founder &amp; Creator • Vision, AI Systems &amp; Technology</div>
                  </div>
                  <a
                    href="https://www.instagram.com/meyra_ai_official/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-300 hover:text-pink-200 text-xs font-medium transition-colors w-fit"
                  >
                    <Instagram className="w-3 h-3" />
                    <span>@meyra_ai_official</span>
                  </a>
                </div>

                {/* Aditya Maurya */}
                <div className="pb-2 border-b border-white/5">
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>⚡</span> Aditya Maurya
                  </div>
                  <div className="text-xs text-cyan-300/90 font-medium">Co-Founder / COO</div>
                  <div className="text-[11px] text-slate-400">Operations, Execution &amp; Team Coordination</div>
                </div>

                {/* Meethi Yadav */}
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>💜</span> Meethi Yadav
                  </div>
                  <div className="text-xs text-purple-300/90 font-medium">Inspiration Behind MEYRA AI / Brand Advisor</div>
                  <div className="text-[11px] text-slate-400">MEYRA Name &amp; Concept Inspiration • Brand Advisor</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A0A0B] border border-white/10 text-xs font-mono space-y-1 text-slate-400">
                <div>Backend Engine: Express.js (Port 3000)</div>
                <div>AI Intelligence: MEYRA Neural Intelligence</div>
                <div>Client Engine: React 19 + Vite</div>
                <div>Storage Engine: LocalStorageChatStorage (Modular)</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/5 bg-[#0A0A0B] flex items-center justify-between">
          <span className="text-[11px] text-slate-500">MEYRA AI • Clean Modular Architecture</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
