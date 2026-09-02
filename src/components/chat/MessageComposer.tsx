import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Square, Sparkles, Trash2, CornerDownLeft } from "lucide-react";

interface MessageComposerProps {
  onSendMessage: (text: string) => void;
  onStopGeneration?: () => void;
  onClearChat?: () => void;
  isStreaming: boolean;
  enterToSend?: boolean;
  disabled?: boolean;
  hasMessages?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onStopGeneration,
  onClearChat,
  isStreaming,
  enterToSend = true,
  disabled = false,
  hasMessages = false,
}) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (enterToSend && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSendMessage(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div id="meyra-composer-container" className="w-full max-w-4xl mx-auto px-4 pb-4 pt-2">
      {/* Outer Glow Container */}
      <div className="relative group">
        {/* Ambient Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity pointer-events-none" />

        <div className="relative bg-[#1a1a1f] border border-white/10 rounded-2xl p-3 sm:p-4 flex flex-col shadow-2xl transition-all">
          {/* Text Input area */}
          <div className="pb-2">
            <textarea
              id="meyra-chat-input"
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder="Ask MEYRA AI anything... (Shift + Enter for new line)"
              className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 resize-none leading-relaxed text-sm sm:text-base outline-none max-h-[180px] overflow-y-auto"
            />
          </div>

          {/* Footer controls inside composer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                <CornerDownLeft className="w-3 h-3" />
                {enterToSend ? "Enter to send • Shift+Enter for newline" : "Press send button"}
              </span>

              {hasMessages && onClearChat && !isStreaming && (
                <button
                  type="button"
                  onClick={onClearChat}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                  title="Clear current conversation"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear chat</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Stop generation button */}
              {isStreaming ? (
                <button
                  id="meyra-stop-generation-btn"
                  type="button"
                  onClick={onStopGeneration}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  title="Stop AI generation"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop generating</span>
                </button>
              ) : (
                /* Send button */
                <button
                  id="meyra-send-message-btn"
                  type="button"
                  onClick={handleSubmit}
                  disabled={!input.trim() || disabled}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 sm:px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Send message"
                >
                  <span>Send</span>
                  <ArrowUp className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimers & Model info */}
      <p className="mt-3 text-center text-[11px] text-slate-500 font-medium">
        MEYRA AI can make mistakes. Check important info and code outputs.
      </p>
    </div>
  );
};
