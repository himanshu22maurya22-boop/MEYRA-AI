/**
 * MEYRA AI - Voice Fallback Service
 * Provides robust client-side audio recording and server-side transcription
 * using Google Gemini when Android Chrome / Web Speech API is unavailable or denied.
 */

export interface TranscribeResult {
  success: boolean;
  text: string;
  model: string;
  language: string;
  privacy: string;
}

export function isMediaRecorderSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

export function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/wav",
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "";
}

export class VoiceFallbackRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mimeType: string = "";
  private isRecording = false;

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Request microphone permission explicitly through normal browser prompts
   * and start recording audio.
   */
  public async startRecording(): Promise<void> {
    if (!isMediaRecorderSupported()) {
      throw new Error(
        "Audio recording is not supported in this browser. Please use a modern browser with microphone support."
      );
    }

    // Stop any existing stream
    this.cleanup();

    // Explicit getUserMedia call triggers standard browser permission prompt if needed
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.mediaStream = stream;
    this.audioChunks = [];
    this.mimeType = getSupportedAudioMimeType();

    const options: MediaRecorderOptions = this.mimeType ? { mimeType: this.mimeType } : {};
    const recorder = new MediaRecorder(stream, options);

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    recorder.start(250); // Collect data chunks every 250ms
    this.mediaRecorder = recorder;
    this.isRecording = true;
  }

  /**
   * Stop recording, immediately release microphone hardware tracks,
   * and return the recorded audio Blob.
   */
  public async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        this.cleanup();
        reject(new Error("No active recording to stop."));
        return;
      }

      const recorder = this.mediaRecorder;

      recorder.onstop = () => {
        try {
          const actualMime = this.mimeType || recorder.mimeType || "audio/webm";
          const audioBlob = new Blob(this.audioChunks, { type: actualMime });
          this.cleanup();
          resolve(audioBlob);
        } catch (err) {
          this.cleanup();
          reject(err);
        }
      };

      try {
        recorder.stop();
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  /**
   * Release all microphone tracks immediately so Android mic hardware indicator turns off.
   */
  public cleanup(): void {
    this.isRecording = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

/**
 * Encodes audio Blob to base64 and posts to MEYRA Cloud Run backend for Gemini transcription.
 * Audio is NEVER permanently stored and is discarded immediately after transcription.
 */
export async function transcribeAudioWithMeyraBackend(
  audioBlob: Blob,
  language: "en-IN" | "hi-IN" = "en-IN"
): Promise<TranscribeResult> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const commaIdx = res.indexOf(",");
      resolve(commaIdx !== -1 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = () => reject(new Error("Failed to read audio data"));
    reader.readAsDataURL(audioBlob);
  });

  const response = await fetch("/api/voice/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audioBase64: base64,
      mimeType: audioBlob.type || "audio/webm",
      language,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData.error || `Server transcription failed with status ${response.status}`
    );
  }

  const result: TranscribeResult = await response.json();
  return result;
}
