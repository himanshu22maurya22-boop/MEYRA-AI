import React, { useState, useEffect } from "react";
import {
  Brain,
  X,
  Trash2,
  Plus,
  Check,
  Edit2,
  ShieldCheck,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { MemoryItem, UserProfile } from "../../types";
import { chatStorage } from "../../services/storage";

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
}

function containsSensitiveCredentials(text: string): boolean {
  if (!text) return false;
  const sensitivePatterns = [
    /AIzaSy[A-Za-z0-9_-]{30,}/i,
    /gh[pousr]_[A-Za-z0-9_]{30,}/i,
    /sk-[a-zA-Z0-9]{20,}/i,
    /-----BEGIN[A-Z\s]+PRIVATE\s+KEY-----/i,
    /(password|passwd|secret_key|api_key|token)\s*[:=]\s*['"]?[^\s'"]{4,}['"]?/i,
  ];
  return sensitivePatterns.some((p) => p.test(text));
}

export const MemoryModal: React.FC<MemoryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState<
    "preference" | "fact" | "instruction" | "general"
  >("preference");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsEnabled(chatStorage.isMemoryEnabled());
      setMemories(chatStorage.getMemories(currentUser?.id));
      setShowClearConfirm(false);
      setEditingId(null);
      setValidationError(null);
    }
  }, [isOpen, currentUser]);

  const handleToggleEnable = () => {
    const next = !isEnabled;
    setIsEnabled(next);
    chatStorage.setMemoryEnabled(next);
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (!newText.trim()) return;

    if (containsSensitiveCredentials(newText)) {
      setValidationError(
        "Security Alert: For your protection, MEYRA AI strictly refuses to store passwords, API keys, or authentication secrets in memory."
      );
      return;
    }

    const newItem: MemoryItem = {
      id: "mem_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      userId: currentUser?.id || "local_user",
      text: newText.trim(),
      category: newCategory,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    chatStorage.saveMemory(newItem);
    setMemories((prev) => [newItem, ...prev]);
    setNewText("");
  };

  const handleStartEdit = (item: MemoryItem) => {
    setEditingId(item.id);
    setEditText(item.text);
    setValidationError(null);
  };

  const handleSaveEdit = (id: string) => {
    setValidationError(null);
    if (!editText.trim()) return;

    if (containsSensitiveCredentials(editText)) {
      setValidationError(
        "Security Alert: For your protection, MEYRA AI strictly refuses to store passwords, API keys, or authentication secrets in memory."
      );
      return;
    }

    const target = memories.find((m) => m.id === id);
    if (!target) return;

    const updated: MemoryItem = {
      ...target,
      text: editText.trim(),
      updatedAt: Date.now(),
    };

    chatStorage.saveMemory(updated);
    setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
    setEditingId(null);
  };

  const handleDeleteItem = (id: string) => {
    chatStorage.deleteMemory(id, currentUser?.id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const handleClearAll = () => {
    chatStorage.clearAllMemories(currentUser?.id);
    setMemories([]);
    setShowClearConfirm(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#141418] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">MEYRA Memory System</h3>
              <p className="text-xs text-slate-400">Personalized context & instructions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Master ON/OFF Switch Banner */}
        <div className="px-6 py-3.5 bg-neutral-900/40 border-b border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-white">Memory Status</span>
            <p className="text-[11px] text-slate-400">
              {isEnabled
                ? "MEYRA remembers your preferences & guidelines across chats."
                : "Memory is paused. No personal context will be injected into prompts."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            onClick={handleToggleEnable}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isEnabled ? "bg-indigo-600" : "bg-neutral-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Isolation & Privacy Assurance */}
          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-200 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-indigo-100">
                Encrypted & Isolated to Authenticated Account
              </p>
              <p className="text-[11px] text-indigo-300/80 leading-relaxed">
                Active Account:{" "}
                <span className="font-medium text-white/95">
                  {currentUser?.name
                    ? `${currentUser.name} (${currentUser.email})`
                    : currentUser?.email || "Local User (Guest)"}
                </span>
                . Memories are strictly isolated and private to your account. MEYRA never stores sensitive financial or password credentials.
              </p>
            </div>
          </div>

          {/* Validation Warning */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p>{validationError}</p>
            </div>
          )}

          {/* Add New Memory Form */}
          <form onSubmit={handleAddMemory} className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-300">
              Add a new instruction or preference
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g. 'I work with Python 3.12 and prefer concise bullet points'"
                className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-slate-300 focus:outline-none"
              >
                <option value="preference">Preference</option>
                <option value="instruction">Instruction</option>
                <option value="fact">Fact</option>
                <option value="general">General</option>
              </select>
              <button
                type="submit"
                disabled={!newText.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white shadow-sm cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </form>

          {/* List of Saved Memories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Saved Memories ({memories.length})</span>
              {memories.length > 0 && !showClearConfirm && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {showClearConfirm && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-between gap-3 text-xs text-rose-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Delete all saved memories permanently?</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-slate-300 text-[11px] font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Delete All
                  </button>
                </div>
              </div>
            )}

            {memories.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No memories saved yet. Add your first preference above!
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {memories.map((item) => {
                  const isEditing = editingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-neutral-900/60 border border-white/5 hover:border-white/10 transition-colors flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="flex-1 px-2.5 py-1 rounded-lg bg-black border border-indigo-500/50 text-white text-xs focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 rounded bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-slate-200 leading-relaxed break-words">
                              {item.text}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                              <span className="capitalize px-1.5 py-0.2 rounded bg-white/5 text-slate-400 font-mono">
                                {item.category}
                              </span>
                              <span>
                                {new Date(item.updatedAt).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded cursor-pointer transition-colors"
                            title="Edit memory"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded cursor-pointer transition-colors"
                            title="Delete memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-neutral-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
