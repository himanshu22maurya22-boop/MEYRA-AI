import { Router, Request, Response } from "express";
import { aiProvider, extractCleanErrorMessage } from "../services/aiProvider";

export const voiceRouter = Router();

const CLOUD_RUN_BACKEND = "https://meyra-ai-804674901589.asia-southeast1.run.app";

/**
 * Health & configuration check for MEYRA AI Voice Architecture
 */
voiceRouter.get("/voice/status", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    primary: "webkitSpeechRecognition / SpeechRecognition",
    fallback: "MEYRA Voice Server Transcribe (Gemini Cloud)",
    supportedLanguages: [
      { code: "en-IN", name: "English (India)" },
      { code: "hi-IN", name: "Hindi (India)" },
    ],
    backendConfigured: aiProvider.isConfigured(),
    privacyNotice:
      "Audio transmitted to MEYRA server is processed in memory for transcription only, never permanently stored, and deleted immediately after processing.",
  });
});

/**
 * Fallback server-side transcription endpoint
 * Accepts audio recording (base64) recorded via user explicit action and transcribes it via Gemini.
 * Audio is NEVER stored on disk or in database. Temporary memory buffer is released immediately.
 */
voiceRouter.post("/voice/transcribe", async (req: Request, res: Response): Promise<void> => {
  try {
    const { audioBase64, mimeType = "audio/webm", language = "en-IN" } = req.body;

    if (!audioBase64 || typeof audioBase64 !== "string" || audioBase64.trim().length === 0) {
      res.status(400).json({
        error: "Missing or invalid 'audioBase64' payload. Valid base64 audio data is required.",
      });
      return;
    }

    // Forward to Cloud Run backend if local provider is not configured
    if (!aiProvider.isConfigured()) {
      try {
        console.log(`[POST /api/voice/transcribe] Forwarding to Cloud Run backend: ${CLOUD_RUN_BACKEND}`);
        const cloudRes = await fetch(`${CLOUD_RUN_BACKEND}/api/voice/transcribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audioBase64,
            mimeType,
            language,
          }),
        });

        if (cloudRes.ok) {
          const data = await cloudRes.json();
          res.json(data);
          return;
        }

        const errText = await cloudRes.text();
        res.status(cloudRes.status).json({
          error: `Cloud Run backend returned error: ${errText}`,
        });
        return;
      } catch (err: any) {
        console.error("Error routing voice transcription to Cloud Run:", err);
        res.status(502).json({
          error: "Could not reach MEYRA Cloud Run transcription service.",
        });
        return;
      }
    }

    // Process transcription with Gemini
    const result = await aiProvider.transcribeAudio({
      audioBase64,
      mimeType,
      language: language === "hi-IN" ? "hi-IN" : "en-IN",
    });

    res.json({
      success: true,
      text: result.text,
      model: result.model,
      language,
      privacy: "Processed securely in memory. No audio retained.",
    });
  } catch (err: any) {
    console.error("[POST /api/voice/transcribe] Error:", err);
    const cleanMessage = extractCleanErrorMessage(err);
    res.status(500).json({
      error: cleanMessage || "Failed to transcribe audio on MEYRA server.",
    });
  }
});
