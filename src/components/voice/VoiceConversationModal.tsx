import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  Volume2,
  VolumeX,
  X,
  Square,
} from "lucide-react";
import { ttsService, TTSState } from "../../services/tts";
import { useSpeechRecognition, SpeechLanguage } from "../../hooks/useSpeechRecognition";
import { UserProfile, UserSettings } from "../../types";
import { chatStorage } from "../../services/storage";
import { Logo } from "../brand/Logo";

/**
 * Resolves the user's display name for Voice Mode.
 * Adheres strictly to security, privacy, and identity requirements:
 * 1. Reads the latest saved display name from authenticated user profile or settings.
 * 2. NEVER hardcodes any specific name.
 * 3. Never uses email address.
 * 4. Never uses internal User ID.
 * 5. Returns empty string if no valid display name exists so fallback greeting is used.
 */
export function resolveUserDisplayName(
  user?: UserProfile | null,
  settings?: UserSettings | null
): string {
  try {
    const storedUser = typeof window !== "undefined" ? chatStorage.getUser() : null;
    const storedSettings = typeof window !== "undefined" ? chatStorage.getSettings() : null;

    // Check authenticated user profile name first, then userDisplayName setting
    const rawCandidate = (
      user?.name ||
      storedUser?.name ||
      settings?.userDisplayName ||
      storedSettings?.userDisplayName ||
      ""
    ).trim();

    if (!rawCandidate) return "";

    // Requirement 5: Do NOT use the user's email address
    if (rawCandidate.includes("@")) return "";

    // Requirement 6: Do NOT use the internal Unique User ID
    const userId = user?.id || storedUser?.id;
    if (userId && rawCandidate === userId) return "";
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawCandidate)) return "";

    // Ignore placeholder default names
    if (rawCandidate.toLowerCase() === "user" || rawCandidate.toLowerCase() === "guest") {
      return "";
    }

    return rawCandidate;
  } catch {
    return "";
  }
}

/**
 * Constructs the opening greeting for Voice Mode.
 * Examples:
 * Display Name = "Himanshu" -> "Namaste Himanshu 👋\nMain MEYRA AI hoon. Kaise help karun?"
 * Display Name = "Aditya"   -> "Namaste Aditya 👋\nMain MEYRA AI hoon. Kaise help karun?"
 * Display Name = "Ankit"    -> "Namaste Ankit 👋\nMain MEYRA AI hoon. Kaise help karun?"
 * Display Name = "Sonu"     -> "Namaste Sonu 👋\nMain MEYRA AI hoon. Kaise help karun?"
 * No Display Name           -> "Namaste 👋\nMain MEYRA AI hoon. Kaise help karun?"
 */
export function getVoiceGreeting(
  user?: UserProfile | null,
  settings?: UserSettings | null
): { text: string; spokenText: string; displayName?: string } {
  const displayName = resolveUserDisplayName(user, settings);

  if (displayName) {
    return {
      text: `Namaste ${displayName} 👋\nMain MEYRA AI hoon. Kaise help karun?`,
      spokenText: `Namaste ${displayName}. Main MEYRA AI hoon. Kaise help karun?`,
      displayName,
    };
  }

  return {
    text: `Namaste 👋\nMain MEYRA AI hoon. Kaise help karun?`,
    spokenText: `Namaste. Main MEYRA AI hoon. Kaise help karun?`,
  };
}

interface VoiceConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => Promise<void>;
  onStopGeneration?: () => void;
  isStreaming: boolean;
  lastAssistantMessage?: string;
  defaultLang?: "en-IN" | "hi-IN";
  user?: UserProfile | null;
  settings?: UserSettings | null;
}

type Mode = "dictate" | "conversation";
type ConversationPhase = "ready" | "listening" | "processing" | "thinking" | "speaking" | "error";

export const VoiceConversationModal: React.FC<VoiceConversationModalProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  onStopGeneration,
  isStreaming,
  lastAssistantMessage,
  defaultLang = "en-IN",
  user,
  settings,
}) => {
  const [mode, setMode] = useState<Mode>("conversation");
  const [phase, setPhase] = useState<ConversationPhase>("ready");
  const [isMuted, setIsMuted] = useState(false);
  const [language, setLanguage] = useState<SpeechLanguage>(defaultLang);
  const [transcriptLive, setTranscriptLive] = useState("");
  const [speakingText, setSpeakingText] = useState("");
  const [userError, setUserError] = useState<string | null>(null);
  const [greetingInfo, setGreetingInfo] = useState<{ text: string; spokenText: string; displayName?: string } | null>(null);
  const sessionGreetingPlayedRef = useRef(false);

  // Audio diagnostic test status & developer panel
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    running: boolean;
    micResult?: string;
    micSuccess?: boolean;
    serviceResult?: string;
    serviceSuccess?: boolean;
  } | null>(null);

  const processedMessageRef = useRef<string | null>(null);
  const latestTranscriptRef = useRef("");
  const isConversationActiveRef = useRef(false);
  const speakTimerRef = useRef<any>(null);
  const fallbackListeningTimerRef = useRef<any>(null);
  const dictateTimerRef = useRef<any>(null);

  const speech = useSpeechRecognition({
    continuous: false,
    interimResults: true,
    onStart: () => {
      setPhase("listening");
      setUserError(null);
    },
    onSpeechStart: () => {
      setPhase("listening");
    },
    onSpeechEnd: () => {
      setPhase("processing");
    },
    onTranscribing: (transcribing: boolean) => {
      if (transcribing) {
        setPhase("processing");
      }
    },
    onResult: (text: string) => {
      setTranscriptLive(text);
      latestTranscriptRef.current = text;
      setPhase("listening");
    },
    onError: (err: string) => {
      setUserError(err);
      setPhase("error");
    },
    onEnd: (finalText: string) => {
      const textToUse = (finalText || latestTranscriptRef.current || transcriptLive).trim();
      if (textToUse) {
        if (mode === "dictate") {
          setPhase("processing");
          dictateTimerRef.current = setTimeout(() => {
            putInChatInput(textToUse);
          }, 200);
        } else if (mode === "conversation") {
          handleSendConversation(textToUse);
        }
      } else {
        setPhase((curr) => (curr === "error" ? "error" : "ready"));
      }
    },
  });

  // Put recognized text directly into MEYRA chat composer without auto-sending
  const putInChatInput = (text: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("meyra:set-input", { detail: text }));
      const inputEl = document.getElementById("meyra-chat-input") as HTMLTextAreaElement | null;
      if (inputEl) {
        inputEl.value = text;
        inputEl.focus();
      }
    }
    onClose();
  };

  // Sync TTS state
  useEffect(() => {
    const unsub = ttsService.subscribe((state: TTSState) => {
      setIsMuted(state.isMuted);
      if (state.isSpeaking) {
        setPhase("speaking");
      } else if (!isStreaming && phase === "speaking") {
        setPhase("ready");
      }
    });
    return unsub;
  }, [isStreaming, phase]);

  // Read aloud new assistant messages when in Conversation mode
  useEffect(() => {
    if (!isOpen || isStreaming || !lastAssistantMessage || mode !== "conversation") return;

    if (processedMessageRef.current !== lastAssistantMessage) {
      processedMessageRef.current = lastAssistantMessage;
      setSpeakingText(lastAssistantMessage.slice(0, 300) + "...");
      setPhase("speaking");

      const spoke = ttsService.speak(lastAssistantMessage, {
        lang: language,
        onEnd: () => {
          if (!isOpen || mode !== "conversation" || !isConversationActiveRef.current) return;
          setPhase("ready");
          startListeningCycle();
        },
        onError: () => {
          if (!isOpen || mode !== "conversation" || !isConversationActiveRef.current) return;
          setPhase("ready");
        },
      });

      if (!spoke) {
        fallbackListeningTimerRef.current = setTimeout(() => {
          if (!isOpen || mode !== "conversation" || !isConversationActiveRef.current) return;
          setPhase("ready");
          startListeningCycle();
        }, 1500);
      }
    }
  }, [isOpen, isStreaming, lastAssistantMessage, language, mode]);

  // Modal open/close lifecycle & dynamic opening greeting
  useEffect(() => {
    if (isOpen) {
      ttsService.stop();
      setUserError(null);
      setTranscriptLive("");
      latestTranscriptRef.current = "";
      processedMessageRef.current = lastAssistantMessage || null;
      setPhase("ready");

      // Dynamically resolve user profile display name and construct greeting
      const greeting = getVoiceGreeting(user, settings);
      setGreetingInfo(greeting);
      setSpeakingText(greeting.text);

      // Play greeting once when a new Voice Mode session begins
      sessionGreetingPlayedRef.current = true;

      // Speak opening greeting through MEYRA's existing TTS system
      speakTimerRef.current = setTimeout(() => {
        if (!isOpen) return;
        const isCurrentlyMuted = ttsService.getState().isMuted;
        if (!isCurrentlyMuted) {
          setPhase("speaking");
          const spoke = ttsService.speak(greeting.spokenText, {
            lang: language === "hi-IN" ? "hi-IN" : "en-IN",
            onEnd: () => {
              if (!isOpen) return;
              setPhase("ready");
              startListeningCycle();
            },
            onError: () => {
              if (!isOpen) return;
              setPhase("ready");
              startListeningCycle();
            },
          });

          if (!spoke) {
            fallbackListeningTimerRef.current = setTimeout(() => {
              if (!isOpen) return;
              setPhase("ready");
              startListeningCycle();
            }, 1500);
          }
        } else {
          setPhase("ready");
          startListeningCycle();
        }
      }, 350);
    } else {
      ttsService.stop();
      speech.cancelListening();
      isConversationActiveRef.current = false;
      setPhase("ready");
      setUserError(null);
      setTestStatus(null);
      setGreetingInfo(null);
      setSpeakingText("");
      sessionGreetingPlayedRef.current = false;
    }

    return () => {
      if (speakTimerRef.current) {
        clearTimeout(speakTimerRef.current);
        speakTimerRef.current = null;
      }
      if (fallbackListeningTimerRef.current) {
        clearTimeout(fallbackListeningTimerRef.current);
        fallbackListeningTimerRef.current = null;
      }
      if (dictateTimerRef.current) {
        clearTimeout(dictateTimerRef.current);
        dictateTimerRef.current = null;
      }
      ttsService.stop();
      speech.cancelListening();
    };
  }, [isOpen]);

  const startListeningCycle = () => {
    isConversationActiveRef.current = true;
    setUserError(null);
    ttsService.stop();
    setSpeakingText("");
    setTranscriptLive("");
    latestTranscriptRef.current = "";
    speech.startListening(language);
  };

  const handleStopListening = () => {
    speech.stopListening();
    setPhase("ready");
    const textToUse = latestTranscriptRef.current || transcriptLive;
    if (mode === "dictate" && textToUse.trim()) {
      putInChatInput(textToUse.trim());
    }
  };

  /**
   * Closes Voice Mode immediately:
   * - Cancels speech recognition immediately and releases microphone tracks
   * - Stops TTS speech playback immediately
   * - Cleans up all pending voice timers
   * - Stops active generation if in progress
   * - Closes Voice Mode UI and returns to normal MEYRA chat/home screen
   */
  const handleCloseVoiceMode = useCallback((e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 1. Clear any active voice timers
    if (speakTimerRef.current) {
      clearTimeout(speakTimerRef.current);
      speakTimerRef.current = null;
    }
    if (fallbackListeningTimerRef.current) {
      clearTimeout(fallbackListeningTimerRef.current);
      fallbackListeningTimerRef.current = null;
    }
    if (dictateTimerRef.current) {
      clearTimeout(dictateTimerRef.current);
      dictateTimerRef.current = null;
    }

    // 2. Stop active conversation cycle
    isConversationActiveRef.current = false;

    // 3. Immediately abort speech recognition & release microphone hardware
    speech.cancelListening();

    // 4. Immediately halt any TTS speech synthesis
    ttsService.stop();

    // 5. Cancel active generation if in progress
    onStopGeneration?.();

    // 6. Reset session states
    setSpeakingText("");
    setTranscriptLive("");
    latestTranscriptRef.current = "";
    setPhase("ready");
    setUserError(null);
    setTestStatus(null);
    sessionGreetingPlayedRef.current = false;

    // 7. Close the Voice Mode interface immediately
    onClose();
  }, [onClose, onStopGeneration, speech]);

  // Alias for legacy button handlers
  const handleEndConversation = handleCloseVoiceMode;

  // Escape key listener to close Voice Mode immediately
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseVoiceMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleCloseVoiceMode]);

  const handleSendConversation = async (textToSend: string) => {
    setPhase("thinking");
    setTranscriptLive("");
    latestTranscriptRef.current = "";

    try {
      await onSendMessage(textToSend);
    } catch {
      setPhase("ready");
    }
  };

  const handleInterrupt = () => {
    ttsService.stop();
    startListeningCycle();
  };

  const toggleMute = () => {
    const muted = ttsService.toggleMute();
    setIsMuted(muted);
  };

  const switchLanguage = (lang: SpeechLanguage) => {
    setLanguage(lang);
    if (speech.isListening) {
      speech.stopListening();
      speech.startListening(lang);
    }
  };

  // Requirement 10: Test Microphone Hardware & Speech Recognition separately
  const handleTestMicrophone = async () => {
    setTestStatus({ running: true });
    try {
      const res = await speech.testMicrophoneAndService();
      setTestStatus({
        running: false,
        micResult: res.micResult,
        micSuccess: res.micSuccess,
        serviceResult: res.serviceResult,
        serviceSuccess: res.serviceSuccess,
      });
    } catch (e: any) {
      setTestStatus({
        running: false,
        micResult: `Test failed: ${e?.message || "Unknown error"}`,
        micSuccess: false,
        serviceResult: "Not reached",
        serviceSuccess: false,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="meyra-voice-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCloseVoiceMode();
        }
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#08080C] text-white p-4 sm:p-8 animate-fade-in select-none overflow-hidden"
    >
      {/* Subtle Ambient Glow that responds to voice phase */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          phase === "listening"
            ? "bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.18)_0%,_transparent_70%)] opacity-100"
            : phase === "speaking"
            ? "bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.18)_0%,_transparent_70%)] opacity-100"
            : phase === "thinking" || phase === "processing"
            ? "bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.15)_0%,_transparent_70%)] opacity-100"
            : "bg-[radial-gradient(circle_at_center,_rgba(79,70,229,0.1)_0%,_transparent_70%)] opacity-60"
        }`}
      />

      {/* Top Bar: Minimal MEYRA AI Branding & Close "X" Button */}
      <header className="w-full max-w-4xl flex items-center justify-between pt-2 px-2 z-20">
        <div className="flex items-center gap-2.5">
          <Logo size="sm" showText={false} />
          <span className="text-xs sm:text-sm font-semibold tracking-wider text-slate-300 uppercase">
            MEYRA AI
          </span>
        </div>

        <button
          id="voice-modal-close"
          type="button"
          onClick={handleCloseVoiceMode}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleCloseVoiceMode();
          }}
          className="relative z-30 min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/15 active:bg-white/25 border border-white/10 transition-all cursor-pointer shadow-sm"
          title="Close Voice Mode"
          aria-label="Close Voice Mode"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Center Stage: Central Voice Orb, MEYRA Logo, Dynamic Status & Conversational Text */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-lg my-auto text-center px-4 z-20">
        {/* Animated Central Voice Orb with MEYRA Emblem */}
        <div
          onClick={() => {
            if (phase === "listening") {
              handleStopListening();
            } else if (phase === "speaking") {
              handleInterrupt();
            } else {
              startListeningCycle();
            }
          }}
          className="relative my-6 flex items-center justify-center cursor-pointer group select-none"
          title={
            phase === "listening"
              ? "Listening... Tap to stop"
              : phase === "speaking"
              ? "Speaking... Tap to interrupt"
              : "Tap to talk with MEYRA"
          }
        >
          {/* Radiating Soundwave / Aura Rings */}
          <div
            className={`absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full transition-all duration-700 pointer-events-none ${
              phase === "listening"
                ? "bg-indigo-500/20 scale-125 animate-ping"
                : phase === "speaking"
                ? "bg-cyan-500/20 scale-115 animate-pulse"
                : phase === "thinking" || phase === "processing"
                ? "bg-purple-500/15 scale-110 animate-pulse"
                : "bg-indigo-600/10 scale-100"
            }`}
          />
          <div
            className={`absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full transition-all duration-500 pointer-events-none ${
              phase === "listening"
                ? "bg-gradient-to-tr from-indigo-600/35 to-rose-600/30 blur-xl scale-110"
                : phase === "speaking"
                ? "bg-gradient-to-tr from-cyan-600/35 to-indigo-600/30 blur-xl scale-110"
                : phase === "thinking" || phase === "processing"
                ? "bg-gradient-to-tr from-purple-600/25 to-indigo-600/25 blur-lg"
                : "bg-indigo-600/15 blur-lg"
            }`}
          />

          {/* Core Orb Container */}
          <div
            className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 border ${
              phase === "listening"
                ? "bg-gradient-to-tr from-[#1E1B4B] to-[#312E81] border-indigo-400/50 shadow-indigo-500/40 scale-105"
                : phase === "speaking"
                ? "bg-gradient-to-tr from-[#083344] to-[#164E63] border-cyan-400/50 shadow-cyan-500/40 scale-105 animate-pulse"
                : phase === "thinking" || phase === "processing"
                ? "bg-gradient-to-tr from-[#2E1065] to-[#3B0764] border-purple-400/40 shadow-purple-500/30 animate-pulse"
                : "bg-[#12121A] border-white/10 shadow-indigo-950/50 group-hover:border-indigo-500/40 group-hover:scale-105"
            }`}
          >
            {/* Embedded MEYRA AI Faceted Emblem */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`w-full h-full p-2 transition-transform duration-500 ${
                  phase === "listening"
                    ? "scale-110"
                    : phase === "speaking"
                    ? "scale-105"
                    : "scale-100"
                }`}
              >
                <defs>
                  <linearGradient id="vMLeft" x1="8" y1="38" x2="16" y2="8" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4F46E5" />
                    <stop offset="1" stopColor="#818CF8" />
                  </linearGradient>
                  <linearGradient id="vMRight" x1="40" y1="38" x2="32" y2="8" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#7C3AED" />
                    <stop offset="1" stopColor="#A78BFA" />
                  </linearGradient>
                  <linearGradient id="vMInLeft" x1="16" y1="8" x2="24" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366F1" />
                    <stop offset="1" stopColor="#4338CA" />
                  </linearGradient>
                  <linearGradient id="vMInRight" x1="32" y1="8" x2="24" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#9333EA" />
                    <stop offset="1" stopColor="#6D28D9" />
                  </linearGradient>
                  <linearGradient id="vMCore" x1="20" y1="19" x2="28" y2="29" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38BDF8" />
                    <stop offset="1" stopColor="#C084FC" />
                  </linearGradient>
                </defs>
                <path d="M8 38L8 14L16 8L16 32Z" fill="url(#vMLeft)" />
                <path d="M40 38L40 14L32 8L32 32Z" fill="url(#vMRight)" />
                <path d="M16 8L24 24L16 32Z" fill="url(#vMInLeft)" />
                <path d="M32 8L24 24L32 32Z" fill="url(#vMInRight)" />
                <path d="M24 19L28 24L24 29L20 24Z" fill="url(#vMCore)" />
                <path d="M11 38H37L34 42H14L11 38Z" fill="#1E1E2D" />
                <path d="M24 7L25.5 10L28 11L25.5 12L24 15L22.5 12L20 11L22.5 10Z" fill="#38BDF8" />
              </svg>
            </div>
          </div>
        </div>

        {/* Branding & Minimal Conversational State Label */}
        <div className="mt-1 mb-3">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white/95">MEYRA AI</h2>
          <p className="text-sm font-medium tracking-wide text-indigo-400 mt-1 transition-all duration-300">
            {phase === "listening"
              ? "Listening..."
              : phase === "processing" || phase === "thinking"
              ? "Thinking..."
              : phase === "speaking"
              ? "Speaking..."
              : userError
              ? "Tap microphone to speak"
              : "Tap to speak"}
          </p>
        </div>

        {/* Dynamic Subtitle / Live Conversational Text */}
        <div
          id="voice-transcript-box"
          className="w-full min-h-[64px] max-h-36 overflow-y-auto px-4 py-2 text-center text-sm leading-relaxed text-slate-300 flex flex-col items-center justify-center transition-all"
        >
          {transcriptLive ? (
            <p className="text-white font-medium italic animate-fade-in">&quot;{transcriptLive}&quot;</p>
          ) : speakingText ? (
            <p className="text-indigo-200/90 whitespace-pre-line leading-relaxed text-sm animate-fade-in">
              {speakingText}
            </p>
          ) : greetingInfo ? (
            <p className="text-indigo-200/90 whitespace-pre-line leading-relaxed text-sm animate-fade-in">
              {greetingInfo.text}
            </p>
          ) : null}
        </div>
      </main>

      {/* Bottom Area: Simple Mic & End Conversation Controls */}
      <footer className="w-full max-w-sm flex flex-col items-center gap-4 pb-4 sm:pb-8 z-20">
        <div className="flex items-center justify-center gap-6">
          {/* Mute/Unmute Audio Toggle */}
          <button
            id="voice-mute-toggle"
            type="button"
            onClick={toggleMute}
            className={`min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMuted
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10"
            }`}
            title={isMuted ? "Unmute MEYRA voice" : "Mute MEYRA voice"}
            aria-label={isMuted ? "Unmute MEYRA voice" : "Mute MEYRA voice"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Primary Microphone / Voice Control */}
          <button
            id="voice-mic-toggle-btn"
            type="button"
            onClick={() => {
              if (phase === "listening") {
                handleStopListening();
              } else if (phase === "speaking") {
                handleInterrupt();
              } else {
                startListeningCycle();
              }
            }}
            className={`min-w-[64px] min-h-[64px] rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer active:scale-95 ${
              phase === "listening"
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 animate-pulse ring-4 ring-rose-500/20"
                : phase === "speaking"
                ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/40 ring-4 ring-cyan-500/20"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/40 ring-4 ring-indigo-500/20"
            }`}
            title={
              phase === "listening"
                ? "Stop listening"
                : phase === "speaking"
                ? "Interrupt & speak"
                : "Start speaking"
            }
            aria-label="Toggle voice input"
          >
            {phase === "listening" ? (
              <Square className="w-6 h-6 fill-current" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>

          {/* End Conversation / Close Button */}
          <button
            id="voice-end-conversation-btn"
            type="button"
            onClick={handleCloseVoiceMode}
            className="min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition-all cursor-pointer"
            title="End Conversation"
            aria-label="End Conversation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
};
