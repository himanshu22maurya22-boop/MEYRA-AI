import { useState, useEffect, useRef, useCallback } from "react";
import {
  VoiceFallbackRecorder,
  transcribeAudioWithMeyraBackend,
  isMediaRecorderSupported,
} from "../services/voiceFallback";

export type SpeechLanguage = "en-IN" | "hi-IN";
export type BrowserSupportStatus = "Supported" | "Not supported";
export type MicrophoneAccessStatus = "Granted" | "Denied" | "Unavailable" | "Not requested";
export type SpeechRecognitionStatus =
  | "Available"
  | "Started"
  | "Error"
  | "Idle"
  | "Fallback Active";
export type PermissionsPolicyStatus = "Allowed" | "Blocked" | "Unknown";
export type VoiceArchitectureMode = "primary" | "fallback";

export interface SpeechRecognitionDiagnostics {
  voiceMode: VoiceArchitectureMode;
  browser: BrowserSupportStatus;
  microphone: MicrophoneAccessStatus;
  speechRecognition: SpeechRecognitionStatus;
  permissionsPolicy: PermissionsPolicyStatus;
  lastActualError: string | null;
  activeEngine: string;
  // Deep inspection & context
  selectedLanguage: string;
  isInsideIframe: boolean;
  currentOrigin: string;
  permissionsPolicyDetails: string;
  recognitionCreated: boolean;
  recognitionStarted: boolean;
  recognitionEnded: boolean;
  isFallbackRecording: boolean;
  isTranscribing: boolean;
}

export interface SpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  onStart?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (errorMessage: string, errorCode?: string) => void;
  onEnd?: (finalTranscript: string) => void;
  onTranscribing?: (isTranscribing: boolean) => void;
}

/**
 * Inspect document permissions policy (W3C standard and legacy Chromium feature policy)
 */
export function detectPermissionsPolicy(): {
  status: PermissionsPolicyStatus;
  details: string;
} {
  if (typeof document === "undefined") {
    return { status: "Unknown", details: "SSR environment" };
  }

  const doc = document as any;

  // Modern W3C Permissions Policy API
  if (doc.permissionsPolicy && typeof doc.permissionsPolicy.allowsFeature === "function") {
    try {
      const allowed = doc.permissionsPolicy.allowsFeature("microphone");
      return {
        status: allowed ? "Allowed" : "Blocked",
        details: allowed
          ? "document.permissionsPolicy allows microphone"
          : "document.permissionsPolicy explicitly blocks microphone (Permissions-Policy header or iframe without allow='microphone')",
      };
    } catch {
      // Ignore query failure
    }
  }

  // Legacy Chromium Feature Policy API
  if (doc.featurePolicy && typeof doc.featurePolicy.allowsFeature === "function") {
    try {
      const allowed = doc.featurePolicy.allowsFeature("microphone");
      return {
        status: allowed ? "Allowed" : "Blocked",
        details: allowed
          ? "document.featurePolicy allows microphone"
          : "document.featurePolicy explicitly blocks microphone",
      };
    } catch {
      // Ignore query failure
    }
  }

  return {
    status: "Allowed",
    details: "Permissions Policy API not explicitly restricting microphone",
  };
}

/**
 * Detect whether app is running inside an iframe (like AI Studio preview) or top-level window
 */
export function detectIframeContext(): {
  isInsideIframe: boolean;
  origin: string;
} {
  if (typeof window === "undefined") {
    return { isInsideIframe: false, origin: "" };
  }
  let isInsideIframe = false;
  try {
    isInsideIframe = window.self !== window.top;
  } catch {
    isInsideIframe = true;
  }
  return {
    isInsideIframe,
    origin: window.location.origin,
  };
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}) {
  const [voiceMode, setVoiceMode] = useState<VoiceArchitectureMode>("primary");
  const [fallbackSuggested, setFallbackSuggested] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecordingFallback, setIsRecordingFallback] = useState(false);
  const [isTranscribingFallback, setIsTranscribingFallback] = useState(false);
  const [language, setLanguage] = useState<SpeechLanguage>("en-IN");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState("");

  const policyInit = detectPermissionsPolicy();
  const iframeInit = detectIframeContext();

  // Developer & User Diagnostic State (Requirements 4, 7, Two-Layer Architecture)
  const [diagnostics, setDiagnostics] = useState<SpeechRecognitionDiagnostics>({
    voiceMode: "primary",
    browser: "Supported",
    microphone: "Not requested",
    speechRecognition: "Idle",
    permissionsPolicy: policyInit.status,
    lastActualError: null,
    activeEngine: "Web Speech API (Browser)",
    selectedLanguage: "en-IN",
    isInsideIframe: iframeInit.isInsideIframe,
    currentOrigin: iframeInit.origin,
    permissionsPolicyDetails: policyInit.details,
    recognitionCreated: false,
    recognitionStarted: false,
    recognitionEnded: false,
    isFallbackRecording: false,
    isTranscribing: false,
  });

  const recognitionRef = useRef<any>(null);
  const fallbackRecorderRef = useRef<VoiceFallbackRecorder | null>(null);
  const isRecordingFallbackRef = useRef(false);
  const isManuallyStoppedRef = useRef(false);
  const inactivityTimerRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const transcriptRef = useRef("");
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Keep fallback recorder singleton initialized
  if (!fallbackRecorderRef.current) {
    fallbackRecorderRef.current = new VoiceFallbackRecorder();
  }

  // Initial detection of browser capability & permissions policy
  useEffect(() => {
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    const supported = Boolean(SpeechRecognitionAPI);
    const policy = detectPermissionsPolicy();
    const iframe = detectIframeContext();

    setIsSupported(supported);
    if (!supported) {
      setFallbackSuggested(true);
    }

    setDiagnostics((prev) => ({
      ...prev,
      browser: supported ? "Supported" : "Not supported",
      speechRecognition: supported ? "Available" : "Error",
      permissionsPolicy: policy.status,
      permissionsPolicyDetails: policy.details,
      isInsideIframe: iframe.isInsideIframe,
      currentOrigin: iframe.origin,
      selectedLanguage: language,
      activeEngine:
        prev.voiceMode === "fallback" ? "MEYRA Cloud (Gemini)" : "Web Speech API (Browser)",
      lastActualError: supported
        ? policy.status === "Blocked"
          ? "Microphone blocked by Permissions-Policy or iframe"
          : null
        : "Speech recognition is not supported by this browser.",
    }));
  }, [language]);

  /**
   * Switch between Primary (Browser Web Speech) and Fallback (MEYRA Cloud Audio Transcription)
   */
  const switchToFallback = useCallback(() => {
    setVoiceMode("fallback");
    setFallbackSuggested(false);
    setErrorMessage(null);
    setDiagnostics((prev) => ({
      ...prev,
      voiceMode: "fallback",
      activeEngine: "MEYRA Cloud (Gemini)",
      speechRecognition: "Idle",
      lastActualError: null,
    }));
  }, []);

  const switchToPrimary = useCallback(() => {
    setVoiceMode("primary");
    setErrorMessage(null);
    setDiagnostics((prev) => ({
      ...prev,
      voiceMode: "primary",
      activeEngine: "Web Speech API (Browser)",
      speechRecognition: "Idle",
      lastActualError: null,
    }));
  }, []);

  /**
   * Start Fallback recording:
   * Requests real microphone permission normally, records audio with MediaRecorder
   */
  const startFallbackRecording = useCallback(
    async (langOverride?: SpeechLanguage) => {
      const selectedLang = langOverride || language;
      setVoiceMode("fallback");
      setFallbackSuggested(false);
      setErrorMessage(null);
      setTranscript("");
      finalTranscriptRef.current = "";
      transcriptRef.current = "";
      isManuallyStoppedRef.current = false;

      try {
        if (!fallbackRecorderRef.current) {
          fallbackRecorderRef.current = new VoiceFallbackRecorder();
        }

        await fallbackRecorderRef.current.startRecording();
        isRecordingFallbackRef.current = true;
        setIsRecordingFallback(true);
        setIsListening(true);
        setIsTranscribingFallback(false);

        setDiagnostics((prev) => ({
          ...prev,
          voiceMode: "fallback",
          microphone: "Granted",
          speechRecognition: "Started",
          activeEngine: "MEYRA Cloud (Gemini)",
          selectedLanguage: selectedLang,
          isFallbackRecording: true,
          isTranscribing: false,
          lastActualError: null,
        }));

        optionsRef.current.onStart?.();
      } catch (err: any) {
        isRecordingFallbackRef.current = false;
        setIsRecordingFallback(false);
        setIsListening(false);

        const errName = err?.name || "Error";
        const errMsg = err?.message || "";
        const fullErr = `${errName}${errMsg ? `: ${errMsg}` : ""}`;
        let friendlyErr = "Failed to start microphone recording.";

        if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
          friendlyErr =
            "Microphone access was denied. Please allow microphone access for this site in your browser.";
          setDiagnostics((prev) => ({
            ...prev,
            microphone: "Denied",
            speechRecognition: "Error",
            lastActualError: fullErr,
          }));
        } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
          friendlyErr = "No microphone hardware found on this device.";
          setDiagnostics((prev) => ({
            ...prev,
            microphone: "Unavailable",
            speechRecognition: "Error",
            lastActualError: fullErr,
          }));
        } else {
          friendlyErr = `Microphone error (${errName}): ${errMsg}`;
          setDiagnostics((prev) => ({
            ...prev,
            microphone: "Unavailable",
            speechRecognition: "Error",
            lastActualError: fullErr,
          }));
        }

        setErrorMessage(friendlyErr);
        optionsRef.current.onError?.(friendlyErr, errName);
      }
    },
    [language]
  );

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop temporary test tracks immediately
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      setDiagnostics((prev) => ({
        ...prev,
        microphone: "Granted",
        lastActualError: null,
      }));
      return true;
    } catch (err: any) {
      const errName = err?.name || "Error";
      const errMsg = err?.message || "";
      const fullErr = `${errName}${errMsg ? `: ${errMsg}` : ""}`;
      let friendlyErr = "Microphone access was denied. Please allow microphone access for this site in your browser.";
      if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        friendlyErr = "No microphone hardware found on this device.";
      }
      setErrorMessage(friendlyErr);
      setDiagnostics((prev) => ({
        ...prev,
        microphone: errName.includes("NotFound") ? "Unavailable" : "Denied",
        speechRecognition: "Error",
        lastActualError: fullErr,
      }));
      optionsRef.current.onError?.(friendlyErr, errName);
      return false;
    }
  }, []);

  const cancelListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    clearInactivityTimer();

    if (isRecordingFallbackRef.current) {
      isRecordingFallbackRef.current = false;
      setIsRecordingFallback(false);
      setIsTranscribingFallback(false);
      if (fallbackRecorderRef.current) {
        fallbackRecorderRef.current.cleanup();
      }
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    setIsListening(false);
    setTranscript("");
    finalTranscriptRef.current = "";
    transcriptRef.current = "";
  }, [clearInactivityTimer]);

  const stopListening = useCallback(async () => {
    isManuallyStoppedRef.current = true;
    clearInactivityTimer();

    // If Fallback recording is active: stop recorder, release microphone tracks, and transcribe
    if (isRecordingFallbackRef.current) {
      isRecordingFallbackRef.current = false;
      setIsRecordingFallback(false);
      setIsTranscribingFallback(true);
      optionsRef.current.onTranscribing?.(true);

      setDiagnostics((prev) => ({
        ...prev,
        isFallbackRecording: false,
        isTranscribing: true,
      }));

      try {
        const audioBlob = await fallbackRecorderRef.current!.stopRecording();
        const currentLang = language;
        const result = await transcribeAudioWithMeyraBackend(audioBlob, currentLang);
        const text = (result.text || "").trim();

        setIsTranscribingFallback(false);
        setIsListening(false);
        optionsRef.current.onTranscribing?.(false);

        setDiagnostics((prev) => ({
          ...prev,
          microphone: "Granted",
          speechRecognition: "Fallback Active",
          activeEngine: result.model || "gemini-3.5-transcribe",
          isTranscribing: false,
          lastActualError: null,
        }));

        if (text) {
          setTranscript(text);
          transcriptRef.current = text;
          finalTranscriptRef.current = text;
          optionsRef.current.onResult?.(text, true);
          optionsRef.current.onEnd?.(text);
        } else {
          optionsRef.current.onEnd?.("");
        }
      } catch (transcribeErr: any) {
        setIsTranscribingFallback(false);
        setIsListening(false);
        optionsRef.current.onTranscribing?.(false);

        const errMsg =
          transcribeErr?.message || "Server audio transcription failed. Please try again.";
        setErrorMessage(errMsg);
        setDiagnostics((prev) => ({
          ...prev,
          speechRecognition: "Error",
          lastActualError: errMsg,
          isTranscribing: false,
        }));
        optionsRef.current.onError?.(errMsg, "TranscriptionError");
        optionsRef.current.onEnd?.("");
      }
      return;
    }

    // Otherwise, primary browser SpeechRecognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
    }
    setIsListening(false);
  }, [language, clearInactivityTimer]);

  /**
   * DIRECT USER GESTURE START:
   * Requests mic permission when needed, handles English/Hindi/Hinglish, and supports seamless fallback.
   */
  const startListening = useCallback(
    async (langOverride?: SpeechLanguage) => {
      const selectedLang = langOverride || language;
      isManuallyStoppedRef.current = false;
      setErrorMessage(null);
      setTranscript("");
      finalTranscriptRef.current = "";
      transcriptRef.current = "";

      // 1. If explicit fallback mode, start fallback recording directly
      if (voiceMode === "fallback") {
        await startFallbackRecording(selectedLang);
        return;
      }

      if (typeof window === "undefined") return;

      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      const policy = detectPermissionsPolicy();

      // If Web Speech API not supported in browser, seamlessly use MEYRA Fallback
      if (!SpeechRecognitionAPI) {
        switchToFallback();
        await startFallbackRecording(selectedLang);
        return;
      }

      if (policy.status === "Blocked") {
        switchToFallback();
        await startFallbackRecording(selectedLang);
        return;
      }

      // Request / verify real microphone permission upfront so user sees prompt if not granted
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        try {
          const micGranted = await requestMicrophonePermission();
          if (!micGranted) {
            setIsListening(false);
            return;
          }
        } catch {
          // Proceed to recognition attempt
        }
      }

      // Clean up previous recognition instance if running
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }

      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = selectedLang;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        // Reset inactivity safety timer (25s)
        clearInactivityTimer();
        inactivityTimerRef.current = setTimeout(() => {
          console.log("Voice input inactivity timeout. Gracefully completing.");
          stopListening();
        }, 25000);

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage(null);
          setDiagnostics((prev) => ({
            ...prev,
            microphone: "Granted",
            speechRecognition: "Started",
            recognitionStarted: true,
            recognitionEnded: false,
            lastActualError: null,
          }));
          optionsRef.current.onStart?.();
        };

        recognition.onspeechstart = () => {
          clearInactivityTimer();
          inactivityTimerRef.current = setTimeout(() => {
            stopListening();
          }, 25000);
          optionsRef.current.onSpeechStart?.();
        };

        recognition.onspeechend = () => {
          optionsRef.current.onSpeechEnd?.();
        };

        recognition.onresult = (event: any) => {
          clearInactivityTimer();
          inactivityTimerRef.current = setTimeout(() => {
            stopListening();
          }, 25000);

          let accumulatedFinal = "";
          let accumulatedInterim = "";

          for (let i = 0; i < event.results.length; ++i) {
            const result = event.results[i];
            const text = result[0]?.transcript || "";
            if (result.isFinal) {
              accumulatedFinal += text;
            } else {
              accumulatedInterim += text;
            }
          }

          const combined = (
            accumulatedFinal + (accumulatedInterim ? " " + accumulatedInterim : "")
          ).trim();

          if (combined) {
            setTranscript(combined);
            transcriptRef.current = combined;
            if (accumulatedFinal) {
              finalTranscriptRef.current = accumulatedFinal.trim();
            }
            optionsRef.current.onResult?.(
              combined,
              Boolean(accumulatedFinal && !accumulatedInterim)
            );
          }
        };

        recognition.onerror = async (event: any) => {
          clearInactivityTimer();
          const errorType = event?.error || "unknown";
          const rawMessage = event?.message || "";
          const fullBrowserError = rawMessage ? `${errorType}: ${rawMessage}` : errorType;

          // If manually stopped by user, abort is expected
          if (errorType === "aborted" && isManuallyStoppedRef.current) {
            return;
          }

          // If no-speech: do not hard-fail or show scary red error, complete cleanly
          if (errorType === "no-speech") {
            setDiagnostics((prev) => ({
              ...prev,
              microphone: "Granted",
              speechRecognition: "Idle",
            }));
            setIsListening(false);
            const textSoFar = finalTranscriptRef.current || transcriptRef.current;
            optionsRef.current.onEnd?.(textSoFar);
            return;
          }

          // If network, service-not-allowed, audio-capture, or not-allowed in iframe:
          // Seamlessly fallback to MEYRA Cloud Voice Recording
          if (
            errorType === "network" ||
            errorType === "service-not-allowed" ||
            errorType === "audio-capture" ||
            (errorType === "not-allowed" && policy.status !== "Blocked")
          ) {
            console.log(`SpeechRecognition encountered ${errorType}. Falling back to MEYRA Cloud.`);
            switchToFallback();
            await startFallbackRecording(selectedLang);
            return;
          }

          let friendlyError = "Speech recognition encountered an error. Please try again.";
          let micState: MicrophoneAccessStatus = "Unavailable";

          switch (errorType) {
            case "not-allowed":
              micState = "Denied";
              friendlyError =
                "Microphone access was denied. Please allow microphone permissions for this site.";
              break;
            case "audio-capture":
              micState = "Unavailable";
              friendlyError = "Microphone could not be accessed.";
              break;
            case "network":
              friendlyError = "Speech recognition service is temporarily unavailable.";
              break;
            case "service-not-allowed":
              friendlyError =
                "Speech recognition service is unavailable on this device.";
              break;
            case "language-not-supported":
              friendlyError = `Language ${selectedLang === "hi-IN" ? "Hindi" : "English"} is not supported by your browser.`;
              break;
            default:
              friendlyError = `Speech recognition error: ${errorType}`;
              break;
          }

          setErrorMessage(friendlyError);
          setFallbackSuggested(true);
          setDiagnostics((prev) => ({
            ...prev,
            microphone: micState,
            speechRecognition: "Error",
            lastActualError: fullBrowserError,
          }));
          optionsRef.current.onError?.(friendlyError, errorType);
          setIsListening(false);
        };

        recognition.onend = () => {
          clearInactivityTimer();
          setIsListening(false);
          setDiagnostics((prev) => ({
            ...prev,
            recognitionEnded: true,
            speechRecognition: prev.speechRecognition === "Error" ? "Error" : "Available",
          }));
          const finalResult = finalTranscriptRef.current || transcriptRef.current;
          optionsRef.current.onEnd?.(finalResult);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (startErr: any) {
        clearInactivityTimer();
        console.warn("Failed to start SpeechRecognition, falling back to MEYRA Cloud:", startErr);
        switchToFallback();
        await startFallbackRecording(selectedLang);
      }
    },
    [
      language,
      voiceMode,
      startFallbackRecording,
      switchToFallback,
      requestMicrophonePermission,
      clearInactivityTimer,
      stopListening,
    ]
  );

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  /**
   * Temporary Internal Test Microphone action (Requirement 10 & 4 & 5)
   * Distinguishes Microphone Access from Speech Recognition Service.
   */
  const testMicrophoneAndService = useCallback(async (): Promise<{
    micResult: string;
    micSuccess: boolean;
    serviceResult: string;
    serviceSuccess: boolean;
  }> => {
    let micResult = "Checking...";
    let micSuccess = false;
    let serviceResult = "Not tested";
    let serviceSuccess = false;

    // 1. Call getUserMedia({ audio: true })
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      micResult = "MediaDevices / getUserMedia not supported in this browser context";
      setDiagnostics((d) => ({
        ...d,
        microphone: "Unavailable",
        lastActualError: "getUserMedia not supported",
      }));
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micResult = "Microphone access: Granted";
        micSuccess = true;

        // Release temporary stream tracks
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });

        setDiagnostics((d) => ({
          ...d,
          microphone: "Granted",
          lastActualError: null,
        }));
      } catch (err: any) {
        const errName = err?.name || "Error";
        const errMsg = err?.message || "";
        const fullErr = `${errName}${errMsg ? `: ${errMsg}` : ""}`;
        let mappedErr = "";

        if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
          mappedErr =
            "Microphone access was denied. Please allow microphone access for this site.";
        } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
          mappedErr = "No microphone was found on this device.";
        } else if (errName === "NotReadableError") {
          mappedErr = "The microphone is currently unavailable.";
        } else if (errName === "SecurityError") {
          mappedErr =
            "Microphone access is blocked by the browser or site security settings.";
        } else {
          mappedErr = `Microphone error (${errName}): ${errMsg}`;
        }
        micResult = mappedErr;
        setDiagnostics((d) => ({
          ...d,
          microphone: "Denied",
          lastActualError: fullErr,
        }));
      }
    }

    // 4 & 5. Test SpeechRecognition separately
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionAPI) {
      serviceResult = "Speech recognition is not supported by this browser.";
      setDiagnostics((d) => ({
        ...d,
        browser: "Not supported",
        speechRecognition: "Error",
        lastActualError: serviceResult,
      }));
    } else {
      try {
        const testRec = new SpeechRecognitionAPI();
        testRec.lang = language;
        testRec.continuous = false;
        testRec.interimResults = false;

        const testPromise = new Promise<string>((resolve) => {
          const timer = setTimeout(() => {
            try {
              testRec.abort();
            } catch {}
            resolve("Speech recognition started (no error received in 2.5s)");
          }, 2500);

          testRec.onstart = () => {
            clearTimeout(timer);
            try {
              testRec.stop();
            } catch {}
            resolve("Speech recognition service: Available & Connected");
          };

          testRec.onerror = (e: any) => {
            clearTimeout(timer);
            const errCode = e?.error || "unknown";
            const errText = e?.message ? `${errCode} - ${e.message}` : errCode;
            let msg = "";
            if (errCode === "not-allowed") {
              msg = "Speech recognition permission was denied.";
            } else if (errCode === "no-speech") {
              msg = "Speech recognition active (no speech detected)";
            } else if (errCode === "audio-capture") {
              msg = "Microphone could not be accessed by speech service.";
            } else if (errCode === "network") {
              msg = "Speech recognition service is unavailable.";
            } else {
              msg = `Speech recognition service error: ${errText}`;
            }
            resolve(msg);
          };
        });

        testRec.start();
        serviceResult = await testPromise;
        serviceSuccess =
          !serviceResult.includes("denied") && !serviceResult.includes("unavailable");

        setDiagnostics((d) => ({
          ...d,
          speechRecognition: serviceSuccess ? "Available" : "Error",
          lastActualError: serviceSuccess ? d.lastActualError : serviceResult,
        }));
      } catch (startErr: any) {
        serviceResult = `Speech recognition test failed to start: ${startErr?.message || startErr?.name || "Error"}`;
        setDiagnostics((d) => ({
          ...d,
          speechRecognition: "Error",
          lastActualError: serviceResult,
        }));
      }
    }

    return { micResult, micSuccess, serviceResult, serviceSuccess };
  }, [language]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
      if (fallbackRecorderRef.current) {
        fallbackRecorderRef.current.cleanup();
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    language,
    transcript,
    setLanguage,
    errorMessage,
    setErrorMessage,
    startListening,
    stopListening,
    cancelListening,
    toggleListening,
    requestMicrophonePermission,
    diagnostics,
    testMicrophoneAndService,
    // Two-layer voice architecture additions
    voiceMode,
    setVoiceMode,
    switchToFallback,
    switchToPrimary,
    fallbackSuggested,
    setFallbackSuggested,
    isFallbackMode: voiceMode === "fallback",
    isRecordingFallback,
    isTranscribingFallback,
    startFallbackRecording,
  };
}
