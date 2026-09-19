import React, { useState } from "react";
import { X, Mail, Send, CheckCircle2, AlertCircle, Instagram } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"Feedback" | "Bug Report" | "Problem" | "Feature Suggestion">("Feedback");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          userName: name.trim() || "Web User",
          userEmail: email.trim() || "anonymous",
          message: message.trim(),
          targetEmail: "himanshu22maurya22@gmail.com",
          platform: "Web",
          appVersion: "1.0.0",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit feedback. Please try again.");
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setMessage("");
        setName("");
        setEmail("");
        onClose();
      }, 2500);
    } catch (err: any) {
      setError(err?.message || "Something went wrong sending feedback.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-[#131316] border border-white/10 shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Feedback &amp; Bug Report</h3>
            <p className="text-xs text-slate-400">Sent directly to creator Himanshu Maurya</p>
          </div>
        </div>

        {/* Founder & Direct Contact info */}
        <div className="mb-4 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-slate-300 flex items-center justify-between">
          <div>
            <div className="font-semibold text-white">Himanshu Maurya</div>
            <div className="text-slate-400 text-[11px]">himanshu22maurya22@gmail.com</div>
          </div>
          <a
            href="https://www.instagram.com/meyra_ai_official/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-300 hover:text-pink-200 text-xs font-medium transition-colors"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>@meyra_ai_official</span>
          </a>
        </div>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
            <h4 className="text-base font-bold text-white">Feedback Received!</h4>
            <p className="text-xs text-slate-400">Thank you for helping improve MEYRA AI.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(["Feedback", "Bug Report", "Problem", "Feature Suggestion"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setType(cat)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors cursor-pointer ${
                      type === cat
                        ? "bg-indigo-600/30 border-indigo-500 text-indigo-300 font-semibold"
                        : "bg-[#1a1a1f] border-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0A0A0B] border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Your Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0A0A0B] border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Message</label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what happened or what you'd like to see..."
                className="w-full px-3 py-2 rounded-xl bg-[#0A0A0B] border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-[#1a1a1f] hover:bg-[#25252b] border border-white/5 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!message.trim() || sending}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? "Sending..." : "Submit Feedback"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
