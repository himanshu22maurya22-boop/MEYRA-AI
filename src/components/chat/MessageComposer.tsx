import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowUp,
  Square,
  Trash2,
  Mic,
  MicOff,
  AlertCircle,
  X,
  Paperclip,
  Plus,
  Camera,
  Image as ImageIcon,
  FileText,
  Globe,
} from "lucide-react";
import { useSpeechRecognition, SpeechLanguage } from "../../hooks/useSpeechRecognition";
import { MessageAttachment } from "../../types";
import { validateFile } from "../../services/fileParser";
import { CameraModal } from "./CameraModal";

interface MessageComposerProps {
  onSendMessage: (text: string, attachments?: MessageAttachment[], enableSearch?: boolean) => void;
  onStopGeneration?: () => void;
  onClearChat?: () => void;
  onOpenVoiceMode?: () => void;
  isStreaming: boolean;
  enterToSend?: boolean;
  disabled?: boolean;
  hasMessages?: boolean;
  isWebSearchActive?: boolean;
  onToggleWebSearch?: () => void;
  externalInput?: string;
  onExternalInputHandled?: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onStopGeneration,
  onClearChat,
  onOpenVoiceMode,
  isStreaming,
  enterToSend = true,
  disabled = false,
  hasMessages = false,
  isWebSearchActive = false,
  onToggleWebSearch,
  externalInput,
  onExternalInputHandled,
}) => {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const baseTextRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close attachment dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAttachMenuOpen(false);
      }
    }
    if (attachMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [attachMenuOpen]);

  // Listen for voice dictation results from Voice Mode Modal
  useEffect(() => {
    const handleSetInput = (e: any) => {
      const text = e.detail;
      if (typeof text === "string") {
        setInput(text);
        baseTextRef.current = text;
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
          }
        }, 50);
      }
    };
    window.addEventListener("meyra:set-input", handleSetInput);
    return () => {
      window.removeEventListener("meyra:set-input", handleSetInput);
    };
  }, []);

  // Handle external input prefill (e.g. from home suggestion chips)
  useEffect(() => {
    if (externalInput !== undefined && externalInput !== "") {
      setInput(externalInput);
      baseTextRef.current = externalInput;
      if (onExternalInputHandled) {
        onExternalInputHandled();
      }
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 50);
    }
  }, [externalInput, onExternalInputHandled]);

  // Handle Speech Recognition
  const handleSpeechResult = useCallback((recognizedText: string, isFinal: boolean) => {
    const base = baseTextRef.current.trim();
    const combined = base ? `${base} ${recognizedText}` : recognizedText;
    setInput(combined);
    if (isFinal) {
      baseTextRef.current = combined;
    }
  }, []);

  const {
    isListening,
    language,
    setLanguage,
    errorMessage,
    setErrorMessage,
    startListening,
    stopListening,
    cancelListening,
  } = useSpeechRecognition({
    onResult: handleSpeechResult,
  });

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      baseTextRef.current = input;
      startListening();
    }
  };

  const handleSwitchLanguage = (newLang: SpeechLanguage) => {
    setLanguage(newLang);
    if (isListening) {
      stopListening();
      baseTextRef.current = input;
      startListening(newLang);
    }
  };

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);

    const validation = validateFile(file);
    if (!validation.valid) {
      setFileError(validation.error || "File cannot be processed.");
      return;
    }

    try {
      let dataUrl: string | undefined = undefined;
      let extractedText: string | undefined = undefined;

      if (validation.type === "image") {
        dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
      } else {
        extractedText = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsText(file);
        });
      }

      const newAtt: MessageAttachment = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: validation.type === "image" ? "image" : "document",
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
        extractedText,
      };

      setAttachments((prev) => [...prev, newAtt]);
      setAttachMenuOpen(false);
    } catch (err: any) {
      setFileError("Could not read file: " + (err?.message || "Unknown error"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCameraCapture = (attachment: MessageAttachment) => {
    setAttachments((prev) => [...prev, attachment]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || isStreaming || disabled) return;

    if (isListening) {
      stopListening();
    }

    onSendMessage(
      trimmed,
      attachments.length > 0 ? attachments : undefined,
      isWebSearchActive
    );

    setInput("");
    setAttachments([]);
    baseTextRef.current = "";
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleVoiceAction = () => {
    if (isListening) {
      stopListening();
      return;
    }
    if (onOpenVoiceMode) {
      onOpenVoiceMode();
    } else {
      handleToggleVoice();
    }
  };

  const hasTypedText = input.length > 0 || attachments.length > 0;

  return (
    <div id="meyra-composer-container" className="w-full max-w-3xl mx-auto px-2 sm:px-4 pb-1.5 sm:pb-3 pt-1">
      {/* Outer Glow Container */}
      <div className="relative group">
        {/* Ambient Glow */}
        <div
          className={`absolute -inset-0.5 rounded-2xl blur-sm transition-opacity pointer-events-none ${
            isListening
              ? "bg-gradient-to-r from-rose-500 via-indigo-500 to-purple-600 opacity-60 animate-pulse"
              : "bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 group-focus-within:opacity-40"
          }`}
        />

        <div className="relative bg-[#16161b] border border-white/10 rounded-2xl p-2.5 sm:p-3.5 flex flex-col shadow-2xl transition-all">
          {/* Active Voice Listening Banner */}
          {isListening && (
            <div
              id="voice-listening-indicator"
              className="mb-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-950/50 via-indigo-950/40 to-[#141419] border border-rose-500/40 flex items-center justify-between gap-2 animate-fade-in"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex items-center justify-center shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute" />
                  <span className="w-2 h-2 rounded-full bg-rose-500 relative" />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-semibold text-rose-300 truncate">Listening...</span>
                  <span className="text-[11px] font-medium text-slate-400 hidden sm:inline truncate">
                    Speak {language === "hi-IN" ? "in Hindi" : "in English"} • Text updates in field below
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleSwitchLanguage("en-IN")}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      language === "en-IN" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchLanguage("hi-IN")}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                      language === "hi-IN" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    हिन्दी
                  </button>
                </div>
                <button
                  id="voice-composer-cancel-btn"
                  type="button"
                  onClick={() => {
                    cancelListening();
                    setInput(baseTextRef.current);
                  }}
                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                  title="Cancel voice recording"
                >
                  Cancel
                </button>
                <button
                  id="voice-composer-done-btn"
                  type="button"
                  onClick={stopListening}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Staged Attachments Preview Bar */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2 animate-fade-in">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="group relative flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200"
                >
                  {att.type === "image" && att.dataUrl ? (
                    <img
                      src={att.dataUrl}
                      alt={att.name}
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="p-1 rounded-md bg-indigo-500/20 text-indigo-400">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                  <span className="max-w-[130px] truncate text-[11px] font-medium">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-0.5 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error notifications */}
          {(errorMessage || fileError) && (
            <div className="mb-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2 animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-[11px] truncate">{errorMessage || fileError}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setFileError(null);
                }}
                className="p-1 text-amber-300 hover:text-white rounded hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Text Input area */}
          <div className="pb-2">
            <textarea
              id="meyra-chat-input"
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                baseTextRef.current = e.target.value;
              }}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={
                isListening
                  ? "Speaking... Recognized text appears here"
                  : "Ask MEYRA AI anything..."
              }
              className="w-full bg-transparent border-none focus:ring-0 text-white placeholder-slate-500 resize-none leading-relaxed text-sm sm:text-base outline-none max-h-[180px] overflow-y-auto"
            />
          </div>

          {/* Footer controls */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400 gap-2">
            {/* Left section: Plus action menu, direct file attach, and Web Search toggle */}
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0" ref={menuRef}>
              {/* Plus Menu Button */}
              <div className="relative">
                <button
                  id="composer-plus-menu-btn"
                  type="button"
                  onClick={() => setAttachMenuOpen(!attachMenuOpen)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                    attachMenuOpen
                      ? "bg-white/10 text-white border-white/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border-white/5"
                  }`}
                  title="Add photo, image or document"
                  aria-label="Add options"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {attachMenuOpen && (
                  <div className="absolute bottom-11 left-0 w-48 rounded-2xl bg-[#141418] border border-white/10 shadow-2xl py-1.5 z-50 animate-fade-in divide-y divide-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraModalOpen(true);
                        setAttachMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left text-xs text-slate-200 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-indigo-400" />
                      <span>Take Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setAttachMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left text-xs text-slate-200 cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4 text-purple-400" />
                      <span>Upload Image</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setAttachMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left text-xs text-slate-200 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <span>Document / PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Direct Attach Button */}
              <button
                id="composer-attach-direct-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 transition-colors cursor-pointer flex items-center gap-1"
                title="Attach file, photo or document"
                aria-label="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.md,.json,.js,.py,.ts"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Web Search Toggle */}
              {onToggleWebSearch && (
                <button
                  type="button"
                  onClick={onToggleWebSearch}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    isWebSearchActive
                      ? "bg-cyan-600/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                      : "bg-white/5 text-slate-400 hover:text-white border-white/5 hover:bg-white/10"
                  }`}
                  title={isWebSearchActive ? "Web Search Active" : "Enable live Web Search"}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Search</span>
                </button>
              )}

              {/* Clear chat button */}
              {hasMessages && onClearChat && !isStreaming && (
                <button
                  type="button"
                  onClick={onClearChat}
                  className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer ml-1"
                  title="Clear current conversation"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Right section: Action Button (Stop when generating, Send when typing, Voice Mode when empty) */}
            <div className="flex items-center shrink-0">
              {isStreaming ? (
                /* Stop generation button */
                <button
                  id="meyra-stop-generation-btn"
                  type="button"
                  onClick={onStopGeneration}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer shadow-sm shrink-0"
                  title="Stop AI generation"
                  aria-label="Stop generation"
                >
                  <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                </button>
              ) : hasTypedText ? (
                /* Send message button */
                <button
                  id="meyra-send-message-btn"
                  type="button"
                  onClick={handleSubmit}
                  disabled={(!input.trim() && attachments.length === 0) || disabled}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white flex items-center justify-center transition-all duration-150 shadow-md shadow-indigo-600/30 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title="Send message"
                  aria-label="Send message"
                >
                  <ArrowUp className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
                </button>
              ) : (
                /* Voice Mode button (default state when input is empty) */
                <button
                  id="meyra-voice-mode-action-btn"
                  type="button"
                  onClick={handleVoiceAction}
                  disabled={disabled}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer shrink-0 shadow-sm ${
                    isListening
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-600/40 ring-2 ring-rose-400 animate-pulse"
                      : "bg-[#202028] hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-white/10 hover:border-indigo-500/30"
                  }`}
                  title={isListening ? "Stop listening" : "Open Voice Mode"}
                  aria-label="Open Voice Mode"
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4 text-white animate-bounce" />
                  ) : (
                    <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-indigo-400" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCameraCapture}
      />

      <p className="mt-2.5 text-center text-[10px] sm:text-[11px] text-slate-500 font-medium">
        MEYRA AI can make mistakes. Verify important information.
      </p>
    </div>
  );
};
