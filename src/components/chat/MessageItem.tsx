import React, { useState } from "react";
import { Message } from "../../types";
import { Logo } from "../brand/Logo";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Copy, Check, RotateCw, AlertTriangle, User } from "lucide-react";

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  userDisplayName?: string;
  userAvatarColor?: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreaming = false,
  onRegenerate,
  userDisplayName = "User",
  userAvatarColor = "cyan",
}) => {
  const [copied, setCopied] = useState(false);

  const isUser = message.role === "user";
  const isError = message.status === "error";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      id={`message-${message.id}`}
      className={`group w-full py-5 px-4 sm:px-6 transition-colors ${
        isUser
          ? "bg-transparent"
          : "bg-[#131316]/50 border-y border-white/5"
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-4 items-start">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {isUser ? (
            <div
              className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shadow-inner border border-white/5"
            >
              {userDisplayName.charAt(0).toUpperCase()}
            </div>
          ) : (
            <Logo size="sm" animated={isStreaming} />
          )}
        </div>

        {/* Message Content Body */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">
                {isUser ? userDisplayName : "MEYRA AI"}
              </span>
              {!isUser && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-500/30">
                  Gemini AI
                </span>
              )}
              <span className="text-[11px] text-slate-500">{formattedTime}</span>
            </div>

            {/* Action buttons on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button
                id={`copy-msg-btn-${message.id}`}
                type="button"
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
                title="Copy message content"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {!isUser && onRegenerate && !isStreaming && (
                <button
                  id={`regenerate-btn-${message.id}`}
                  type="button"
                  onClick={onRegenerate}
                  className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-white/5 rounded transition-colors cursor-pointer"
                  title="Regenerate response"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Error Message display */}
          {isError ? (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{message.errorMessage || "Failed to generate response."}</span>
              </div>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <RotateCw className="w-3 h-3" />
                  Retry
                </button>
              )}
            </div>
          ) : (
            /* Standard text / Markdown */
            <div className="text-slate-200 text-sm leading-relaxed break-words">
              {isUser ? (
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              ) : (
                <MarkdownRenderer content={message.content} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
