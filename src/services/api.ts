import { ApiStatus, Message } from "../types";

export interface StreamChatOptions {
  messages: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  temperature?: number;
  model?: string;
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export async function fetchApiStatus(): Promise<ApiStatus> {
  try {
    const res = await fetch("/api/status");
    if (!res.ok) {
      throw new Error(`Status check failed: HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      status: "error",
      appName: "MEYRA AI",
      version: "1.0.0",
      isConfigured: false,
      model: "gemini-3.1-flash-lite",
      message: err?.message || "Failed to reach server backend",
    };
  }
}

export async function streamChatCompletion({
  messages,
  systemPrompt,
  temperature,
  model,
  signal,
  onChunk,
  onComplete,
  onError,
}: StreamChatOptions): Promise<void> {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        systemPrompt,
        temperature,
        model,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      let errMessage = `Server request failed (Status ${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson.error) {
          errMessage = errorJson.error;
        }
      } catch (_) {
        // Fallback to text if json parsing fails
      }
      throw new Error(errMessage);
    }

    if (!response.body) {
      throw new Error("Response stream body is not readable.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const dataStr = trimmed.slice(6);
        let data: any;
        try {
          data = JSON.parse(dataStr);
        } catch {
          continue;
        }

        if (data?.error) {
          throw new Error(data.error);
        }
        if (data?.text) {
          onChunk(data.text);
        }
        if (data?.done) {
          onComplete?.();
          return;
        }
      }
    }

    onComplete?.();
  } catch (err: any) {
    if (signal?.aborted) {
      // User aborted stream deliberately
      onComplete?.();
      return;
    }
    console.error("Stream chat error:", err);
    let finalErrorMsg = err?.message || "Failed to communicate with AI server.";
    if (finalErrorMsg === "Failed to fetch") {
      finalErrorMsg = "Unable to connect to MEYRA AI server. Please check your network or server status and try again.";
    }
    onError?.(new Error(finalErrorMsg));
  }
}

export function generateAutoTitle(firstPrompt: string): string {
  const clean = firstPrompt
    .replace(/[#*`_>\[\]]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  if (!clean) return "New Conversation";
  const words = clean.split(" ").slice(0, 6).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
