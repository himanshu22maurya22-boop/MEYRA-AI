/**
 * Text-to-Speech (TTS) Service using Web Speech / SpeechSynthesis API.
 * Provides safe playback, instant UI state synchronization, interruption, muting, and lifecycle events.
 */

export interface TTSState {
  isSpeaking: boolean;
  activeMessageId: string | null;
  isMuted: boolean;
  isSupported: boolean;
}

type TTSListener = (state: TTSState) => void;

class TTSService {
  private isSpeaking = false;
  private activeMessageId: string | null = null;
  private isMuted = false;
  private isSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners = new Set<TTSListener>();
  private resumeTimer: any = null;
  private requestIdCounter = 0;

  constructor() {
    if (this.isSupported) {
      // Clean up on page unload or hidden
      window.addEventListener("beforeunload", () => {
        this.stop();
      });
      window.addEventListener("pagehide", () => {
        this.stop();
      });
    }
  }

  public subscribe(listener: TTSListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => {
      try {
        l(state);
      } catch (err) {
        console.error("TTS listener error:", err);
      }
    });
  }

  public getState(): TTSState {
    return {
      isSpeaking: this.isSpeaking,
      activeMessageId: this.activeMessageId,
      isMuted: this.isMuted,
      isSupported: this.isSupported,
    };
  }

  public isSpeakingMessage(messageId: string): boolean {
    return this.isSpeaking && this.activeMessageId === messageId;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isSpeaking) {
      this.stop();
    }
    this.notify();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Cleans markdown syntax, code blocks, and urls for natural spoken output.
   */
  private sanitizeForSpeech(rawText: string): string {
    return rawText
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, " [code block omitted] ")
      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")
      // Remove markdown links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove markdown bold/italic/headings
      .replace(/[*_#~>]/g, "")
      // Remove urls
      .replace(/https?:\/\/\S+/g, "link")
      // Remove emojis so TTS does not speak emoji descriptions (e.g. 'waving hand sign')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Reads the given text aloud.
   * If already speaking, interrupts previous speech immediately.
   * Updates state synchronously so UI changes to 'Stop' with zero lag.
   */
  public speak(
    text: string,
    options: {
      messageId?: string;
      lang?: "en-IN" | "hi-IN" | "en-US";
      rate?: number;
      pitch?: number;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): boolean {
    if (!this.isSupported || this.isMuted) return false;

    const cleanText = this.sanitizeForSpeech(text);
    if (!cleanText) return false;

    // Increment request ID to cancel any pending async speak calls
    const thisRequestId = ++this.requestIdCounter;

    // Clear keep-alive resume timer
    if (this.resumeTimer) {
      clearInterval(this.resumeTimer);
      this.resumeTimer = null;
    }

    // Immediately stop previous speech in the browser
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}

    // Immediately notify UI that this specific message is active
    this.isSpeaking = true;
    this.activeMessageId = options.messageId || "generic";
    this.notify();

    // Brief timeout prevents Chrome from swallowing speak() if cancel() was just issued
    setTimeout(() => {
      if (this.requestIdCounter !== thisRequestId) {
        return; // Superseded by another request or stop()
      }

      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const hasHindi = /[\u0900-\u097F]/.test(cleanText);
        const targetLang = options.lang || (hasHindi ? "hi-IN" : "en-IN");
        utterance.lang = targetLang;
        utterance.rate = options.rate ?? 1.0;
        utterance.pitch = options.pitch ?? 1.0;

        // Select high quality voice matching language if available
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const preferred = voices.find(
            (v) =>
              v.lang.toLowerCase().replace("_", "-").startsWith(targetLang.slice(0, 2).toLowerCase()) &&
              (v.name.includes("Google") || v.name.includes("Natural") || v.localService)
          );
          if (preferred) {
            utterance.voice = preferred;
          }
        }

        utterance.onstart = () => {
          if (this.requestIdCounter !== thisRequestId) return;
          this.isSpeaking = true;
          this.activeMessageId = options.messageId || "generic";
          this.notify();
        };

        utterance.onend = () => {
          if (this.requestIdCounter !== thisRequestId) return;
          this.cleanupUtterance();
          this.notify();
          options.onEnd?.();
        };

        utterance.onerror = (event) => {
          // If canceled by stop(), do not treat as abnormal error, simply clean up
          if (this.requestIdCounter !== thisRequestId) return;
          this.cleanupUtterance();
          this.notify();
          options.onError?.(event);
        };

        this.currentUtterance = utterance;

        // Keep-alive timer for Chrome pause bug on long speech
        this.resumeTimer = setInterval(() => {
          if (!this.isSpeaking || this.requestIdCounter !== thisRequestId) {
            if (this.resumeTimer) clearInterval(this.resumeTimer);
            return;
          }
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 4000);

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("TTS speak failed:", err);
        if (this.requestIdCounter === thisRequestId) {
          this.cleanupUtterance();
          this.notify();
        }
      }
    }, 30);

    return true;
  }

  /**
   * Interrupts and halts all ongoing speech immediately.
   * Cancels SpeechSynthesis and notifies all listeners.
   */
  public stop() {
    this.requestIdCounter++;
    if (this.resumeTimer) {
      clearInterval(this.resumeTimer);
      this.resumeTimer = null;
    }
    if (this.isSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.activeMessageId = null;
    this.notify();
  }

  private cleanupUtterance() {
    if (this.resumeTimer) {
      clearInterval(this.resumeTimer);
      this.resumeTimer = null;
    }
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.activeMessageId = null;
  }
}

export const ttsService = new TTSService();
