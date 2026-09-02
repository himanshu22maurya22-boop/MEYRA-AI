import React from "react";
import { X, Shield, Lock, Eye, Server, RefreshCw } from "lucide-react";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#131316] border border-white/10 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#131316] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Privacy Policy</h2>
              <p className="text-xs text-slate-400">Effective Date: September 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="px-6 py-5 overflow-y-auto space-y-5 text-slate-300 text-sm leading-relaxed">
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-indigo-200 text-xs flex items-center gap-3">
            <Lock className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>
              <strong>Zero-Client Secrets:</strong> Your AI API keys are stored solely on your server environment and never exposed to the client or browser.
            </span>
          </div>

          <section>
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              1. Information We Collect
            </h3>
            <p className="text-slate-400 mb-2">
              MEYRA AI is architected with privacy-by-design principles:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300 text-xs">
              <li>
                <strong>Local Chat History:</strong> Conversations and user preferences are stored in your browser's local storage by default. They are not transmitted to third-party ad networks.
              </li>
              <li>
                <strong>API Request Payloads:</strong> Prompts you submit are processed by the secure server endpoint (<code className="text-indigo-300 font-mono bg-white/5 px-1 py-0.5 rounded">/api/chat</code>) and forwarded directly to the configured AI model provider (such as Google Gemini).
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              2. Data Processing & Model Interaction
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              When you send a message, your conversation context is transmitted via HTTPS to the official AI provider endpoint to generate real-time intelligent completions. MEYRA AI does not sell, license, or monetize your personal conversations.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-400" />
              3. User Control & Data Deletion
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              You retain full control over your conversation history. You can clear individual messages, rename chats, or purge your entire conversation database at any time through the Settings panel. You can also export your data as a standalone JSON file.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/5 bg-[#0A0A0B] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
