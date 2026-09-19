import React from "react";
import { LogOut, X } from "lucide-react";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="logout-confirm-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="logout-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        className="w-full max-w-sm rounded-2xl bg-[#131316] border border-white/10 shadow-2xl p-6 relative"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 id="logout-dialog-title" className="text-base font-semibold text-white">
              Log out
            </h3>
            <p className="text-xs text-slate-400">Sign out of MEYRA AI</p>
          </div>
        </div>

        <p className="text-sm text-slate-300 py-2 leading-relaxed">
          Are you sure you want to log out?
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-4">
          <button
            id="cancel-logout-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-[#1a1a1f] hover:bg-[#25252b] border border-white/5 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="confirm-logout-btn"
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-600/30 cursor-pointer"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};
