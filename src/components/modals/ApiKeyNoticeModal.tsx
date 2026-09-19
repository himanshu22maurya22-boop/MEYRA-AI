import React from "react";
import { X, Key, Terminal, ExternalLink, CheckCircle } from "lucide-react";

interface ApiKeyNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyNoticeModal: React.FC<ApiKeyNoticeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-[#131316] border border-amber-500/30 shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">API Key Configuration</h3>
            <p className="text-xs text-amber-300">Set up your AI provider key for local dev</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <p>
            MEYRA AI communicates securely with foundation AI models via its server-side backend. No API keys are ever stored or exposed in client bundles.
          </p>

          <div className="p-3.5 rounded-xl bg-[#0A0A0B] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 font-mono text-indigo-400 font-semibold text-[11px]">
              <Terminal className="w-3.5 h-3.5" />
              <span>How to configure in VS Code / Locally:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
              <li>
                Create or edit the <code className="text-amber-300 font-mono bg-white/5 px-1 py-0.5 rounded">.env</code> file in your project root.
              </li>
              <li>
                Add your Gemini API key using <code className="text-amber-300 font-mono bg-white/5 px-1 py-0.5 rounded">GEMINI_API_KEY</code>:
                <pre className="mt-1 p-2 rounded bg-black/50 border border-white/5 text-indigo-300 font-mono text-[11px] overflow-x-auto">
GEMINI_API_KEY="your_gemini_api_key_here"
                </pre>
              </li>
              <li>
                Restart your dev server: <code className="text-emerald-300 font-mono bg-white/5 px-1 py-0.5 rounded">npm run dev</code>
              </li>
            </ol>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
            >
              <span>Get a free Gemini API Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
