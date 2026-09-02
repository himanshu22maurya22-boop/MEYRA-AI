import React from "react";
import { X, FileText, CheckCircle, AlertCircle, Scale } from "lucide-react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#131316] border border-white/10 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#131316] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Terms of Service</h2>
              <p className="text-xs text-slate-400">Version 1.0 • September 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto space-y-5 text-slate-300 text-sm leading-relaxed">
          <section>
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              1. Acceptance of Terms
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              By launching, downloading, modifying, or using the MEYRA AI software application, you agree to comply with these terms, applicable laws, and relevant AI provider usage policies.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              2. Open Architecture & Local Execution
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              MEYRA AI is structured as a modular TypeScript/React application with an Express backend designed for local development in editors such as VS Code or deployment on standard cloud environments. You are granted permission to build, extend, and deploy your custom instances.
            </p>
          </section>

          <section>
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              3. AI Output Disclaimer & Responsible Use
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              AI-generated responses, code snippets, and textual completions are produced algorithmically by foundation models. While MEYRA AI strives to provide high quality, outputs should be reviewed and verified for safety and correctness before production deployment.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/5 bg-[#0A0A0B] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
