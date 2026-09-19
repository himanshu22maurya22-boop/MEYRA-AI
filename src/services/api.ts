import { ApiStatus, MessageAttachment, SearchSource } from "../types";

export interface StreamChatOptions {
  messages: Array<{
    role: string;
    content: string;
    attachments?: MessageAttachment[];
  }>;
  systemPrompt?: string;
  temperature?: number;
  model?: string;
  userId?: string;
  enableSearch?: boolean;
  persona?: string;
  signal?: AbortSignal;
  onChunk: (chunk: string) => void;
  onSources?: (sources: SearchSource[]) => void;
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
      version: "2.0.0",
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
  userId,
  enableSearch = false,
  persona,
  signal,
  onChunk,
  onSources,
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
        userId,
        enableSearch,
        persona,
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
      } catch (_) {}
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
        if (data?.sources && Array.isArray(data.sources)) {
          onSources?.(data.sources);
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
      onComplete?.();
      return;
    }
    console.error("Stream chat error:", err);
    let finalErrorMsg = err?.message || "Failed to communicate with AI server.";
    if (finalErrorMsg === "Failed to fetch") {
      finalErrorMsg =
        "Unable to connect to MEYRA AI server. Please check your network or server status and try again.";
    }
    onError?.(new Error(finalErrorMsg));
  }
}

export async function generateImageApi(options: {
  prompt: string;
  aspectRatio?: string;
  style?: string;
  quality?: string;
  token?: string;
}): Promise<{ imageUrl: string; prompt: string; id: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const res = await fetch("/api/image/generate", {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt: options.prompt,
      aspectRatio: options.aspectRatio,
      style: options.style,
      quality: options.quality,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to generate image.");
  }
  return {
    imageUrl: data.image?.imageUrl || data.imageUrl,
    prompt: data.image?.prompt || options.prompt,
    id: data.image?.id || `img_${Date.now()}`,
  };
}

export async function verifyAdminStatus(token?: string): Promise<{
  authorized: boolean;
  badge: string;
  founder: string;
  email: string;
}> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch("/api/admin/verify", { headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Founder admin authorization required.");
  }
  return data;
}

export async function fetchAdminStats(token?: string): Promise<any> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch("/api/admin/stats", { headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Access denied to admin dashboard.");
  }
  return data;
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
