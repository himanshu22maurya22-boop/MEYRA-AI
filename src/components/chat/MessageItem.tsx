import React, { useState, useEffect } from "react";
import { Message, MessageAttachment, SearchSource } from "../../types";
import { Logo } from "../brand/Logo";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  Copy,
  Check,
  RotateCw,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Volume2,
  VolumeX,
  Square,
  Globe,
  ExternalLink,
  Sparkles,
  Download,
  Bookmark,
  BookmarkCheck,
  Share2,
} from "lucide-react";
import { ttsService, TTSState } from "../../services/tts";
import { chatStorage } from "../../services/storage";

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  userDisplayName?: string;
  userPhotoUrl?: string;
  userAvatarColor?: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreaming = false,
  onRegenerate,
  userDisplayName = "User",
  userPhotoUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeakingThis, setIsSpeakingThis] = useState(() =>
    ttsService.isSpeakingMessage(message.id)
  );
  const [showSources, setShowSources] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const isUser = message.role === "user";
  const isError = message.status === "error";

  const handleSaveArtwork = () => {
    if (!message.generatedImage) return;
    chatStorage.saveArtwork({
      id: "art_" + Date.now(),
      prompt: message.generatedImage.prompt,
      imageUrl: message.generatedImage.imageUrl,
      aspectRatio: message.generatedImage.aspectRatio,
      style: message.generatedImage.style,
      createdAt: Date.now(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleDownloadImage = () => {
    if (!message.generatedImage) return;
    const link = document.createElement("a");
    link.href = message.generatedImage.imageUrl;
    link.download = `meyra-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareImage = async () => {
    if (!message.generatedImage) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "MEYRA AI Artwork",
          text: `Artwork generated with MEYRA AI: "${message.generatedImage.prompt}"`,
          url: message.generatedImage.imageUrl.startsWith("http") ? message.generatedImage.imageUrl : window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(
        `Generated with MEYRA AI: "${message.generatedImage.prompt}"\n${message.generatedImage.imageUrl.slice(0, 150)}...`
      );
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const unsub = ttsService.subscribe((state: TTSState) => {
      const active = state.isSpeaking && state.activeMessageId === message.id;
      setIsSpeakingThis(active);
    });
    return unsub;
  }, [message.id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  const handleToggleSpeak = () => {
    if (isSpeakingThis) {
      ttsService.stop();
    } else {
      ttsService.speak(message.content, {
        messageId: message.id,
      });
    }
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  /* ========================================================================= */
  /* USER MESSAGE: ALIGNED TO THE RIGHT                                        */
  /* ========================================================================= */
  if (isUser) {
    return (
      <div
        id={`message-${message.id}`}
        className="w-full py-2 px-4 sm:px-6 flex justify-end animate-fade-in"
      >
        <div className="max-w-[85%] sm:max-w-[75%] md:max-w-[65%] flex flex-col items-end">
          {/* Header row: time & user avatar */}
          <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400 select-none">
            <span>{formattedTime}</span>
            <span className="font-medium text-slate-300">{userDisplayName}</span>
            {userPhotoUrl ? (
              <img
                src={userPhotoUrl}
                alt={userDisplayName}
                className="w-4 h-4 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-indigo-700 flex items-center justify-center text-[10px] font-bold text-white">
                {userDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* User Message Bubble */}
          <div className="group relative px-4 py-3 rounded-2xl rounded-tr-xs bg-indigo-600 text-white shadow-md shadow-indigo-900/20 text-sm leading-relaxed break-words">
            {/* Render any attachments attached to user message */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-2">
                {message.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-1.5 rounded-xl bg-black/30 border border-white/10 flex items-center gap-2 max-w-full"
                  >
                    {att.type === "image" && att.dataUrl ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="w-10 h-10 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="p-1.5 rounded-lg bg-white/10">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="text-[11px] truncate max-w-[140px]">
                      <p className="font-medium truncate">{att.name}</p>
                      <p className="text-[9px] opacity-75">{Math.round(att.size / 1024)} KB</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="whitespace-pre-wrap leading-relaxed selection:bg-indigo-300 selection:text-indigo-950">
              {message.content}
            </p>

            {/* Quick copy on hover */}
            <button
              id={`copy-msg-btn-${message.id}`}
              type="button"
              onClick={handleCopy}
              className="absolute -left-8 top-2.5 p-1 text-slate-400 hover:text-white bg-[#151518] border border-white/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ========================================================================= */
  /* MEYRA AI MESSAGE: ALIGNED TO THE LEFT                                     */
  /* ========================================================================= */
  return (
    <div
      id={`message-${message.id}`}
      className="w-full py-2 px-4 sm:px-6 flex justify-start animate-fade-in"
    >
      <div className="max-w-[92%] sm:max-w-[85%] md:max-w-[75%] flex flex-col items-start">
        {/* Header row: MEYRA AI Logo, Assistant Name (strictly MEYRA AI), time */}
        <div className="flex items-center gap-2 mb-1.5 text-[11px] text-slate-400 select-none">
          <Logo size="sm" animated={isStreaming} />
          <span className="font-semibold text-white tracking-wide">MEYRA AI</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-950/70 text-indigo-300 border border-indigo-500/30">
            AI
          </span>
          {message.searchUsed && (
            <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
              <Globe className="w-2.5 h-2.5" />
              Search
            </span>
          )}
          <span className="text-slate-500">{formattedTime}</span>
        </div>

        {/* AI Message Bubble */}
        <div className="group relative w-full px-4.5 py-3.5 rounded-2xl rounded-tl-xs bg-[#141419] border border-white/10 text-slate-200 shadow-sm text-sm leading-relaxed break-words">
          {message.isImageGenerating ? (
            <div className="flex flex-col items-center justify-center py-6 px-4 space-y-3">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-indigo-200 animate-pulse">
                MEYRA AI is creating your image...
              </p>
              <p className="text-xs text-slate-400">Synthesizing visual details</p>
            </div>
          ) : message.generatedImage ? (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 group/img">
                <img
                  src={message.generatedImage.imageUrl}
                  alt={message.generatedImage.prompt}
                  className="w-full h-auto max-h-[460px] object-contain rounded-2xl mx-auto transition-transform duration-300 group-hover/img:scale-[1.01]"
                  loading="lazy"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-300 font-medium italic">
                  "Here is your image."
                </p>
                {message.generatedImage.style && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                    {message.generatedImage.style} • {message.generatedImage.aspectRatio || "1:1"}
                  </span>
                )}
              </div>

              {/* Action Buttons: Save, Download, Share, Regenerate */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                <button
                  id={`save-art-${message.id}`}
                  type="button"
                  onClick={handleSaveArtwork}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 text-xs font-medium cursor-pointer transition-all active:scale-95"
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Saved</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Save</span>
                    </>
                  )}
                </button>

                <button
                  id={`download-art-${message.id}`}
                  type="button"
                  onClick={handleDownloadImage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium cursor-pointer transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download</span>
                </button>

                <button
                  id={`share-art-${message.id}`}
                  type="button"
                  onClick={handleShareImage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium cursor-pointer transition-all active:scale-95"
                >
                  {shareSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Share</span>
                    </>
                  )}
                </button>

                {onRegenerate && (
                  <button
                    id={`regen-art-${message.id}`}
                    type="button"
                    onClick={onRegenerate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium cursor-pointer transition-all active:scale-95"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Regenerate</span>
                  </button>
                )}
              </div>
            </div>
          ) : isError ? (
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
            <>
              <MarkdownRenderer content={message.content} />
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
              )}

              {/* Web Search Sources / Citations */}
              {message.searchSources && message.searchSources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowSources(!showSources)}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    <Globe className="w-3 h-3" />
                    <span>{message.searchSources.length} Web Reference(s)</span>
                  </button>

                  {showSources && (
                    <div className="mt-2 space-y-1.5 animate-fade-in">
                      {message.searchSources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 hover:border-cyan-500/30 text-slate-300 hover:text-white text-xs transition-colors"
                        >
                          <span className="truncate pr-2 font-medium">{source.title}</span>
                          <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Assistant Action Footer */}
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-500 font-medium">MEYRA AI</span>
            <div className="flex items-center gap-1">
              {/* Text to speech (Read Aloud / Stop) button */}
              <button
                id={`read-aloud-btn-${message.id}`}
                type="button"
                onClick={handleToggleSpeak}
                className={`p-1 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSpeakingThis
                    ? "text-rose-300 bg-rose-500/25 hover:bg-rose-500/35 border border-rose-500/40 px-2 py-0.5"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
                title={isSpeakingThis ? "Stop speaking" : "Read aloud"}
                aria-label={isSpeakingThis ? "Stop speaking" : "Read aloud"}
              >
                {isSpeakingThis ? (
                  <>
                    <Square className="w-3 h-3 fill-current text-rose-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-rose-300">Stop</span>
                  </>
                ) : (
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>

              {/* Copy response */}
              <button
                id={`copy-msg-btn-${message.id}`}
                type="button"
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
                title="Copy response"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Retry / Regenerate */}
              {onRegenerate && !isStreaming && (
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
        </div>
      </div>
    </div>
  );
};
