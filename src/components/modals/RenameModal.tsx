import React, { useState, useEffect } from "react";
import { X, Edit3, Trash2, AlertTriangle } from "lucide-react";

interface RenameModalProps {
  isOpen: boolean;
  initialTitle: string;
  onClose: () => void;
  onSave: (newTitle: string) => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  initialTitle,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(title.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-[#131316] border border-white/10 shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Rename Chat</h3>
            <p className="text-xs text-slate-400">Give your conversation a clear title</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            id="rename-chat-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Conversation title"
            autoFocus
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0B] border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-[#1a1a1f] hover:bg-[#25252b] border border-white/5 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
            >
              Save Title
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DeleteModalProps {
  isOpen: boolean;
  conversationTitle?: string;
  onClose: () => void;
  onConfirm: () => void;
  isAll?: boolean;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  conversationTitle,
  onClose,
  onConfirm,
  isAll = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-[#131316] border border-white/10 shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              {isAll ? "Clear All Conversations?" : "Delete Conversation?"}
            </h3>
            <p className="text-xs text-slate-400">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          {isAll
            ? "Are you sure you want to delete all saved conversations from your local storage?"
            : `Are you sure you want to permanently delete "${conversationTitle || "this chat"}"?`}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-[#1a1a1f] hover:bg-[#25252b] border border-white/5 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors shadow-md shadow-rose-950/40 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isAll ? "Clear All Data" : "Delete Chat"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
