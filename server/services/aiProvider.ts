import { GoogleGenAI } from "@google/genai";

export interface ChatMessagePayload {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessagePayload[];
  systemPrompt?: string;
  temperature?: number;
  model?: string;
}

export interface AIProvider {
  isConfigured(): boolean;
  generateResponse(options: ChatCompletionOptions): Promise<string>;
  generateStream(
    options: ChatCompletionOptions,
    onChunk: (text: string) => void
  ): Promise<void>;
}

// Deprecated or discontinued models to filter out
const DEPRECATED_MODELS = new Set([
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-preview",
  "gemini-2.0-flash",
  "gemini-2.0-pro",
  "gemini-2.0-flash-thinking",
  "gemini-pro",
]);

/**
 * Normalizes model names to active Gemini models.
 */
function sanitizeModelName(modelName?: string): string {
  if (!modelName || DEPRECATED_MODELS.has(modelName)) {
    return "gemini-3.1-flash-lite";
  }
  return modelName;
}

/**
 * Formats SDK and API errors into clear, actionable descriptions showing HTTP codes & exact causes.
 */
export function extractCleanErrorMessage(err: unknown): string {
  if (!err) return "Unknown error occurred while contacting the Gemini API.";

  let rawMessage = typeof err === "string" ? err : (err as any)?.message || String(err);
  let statusCode = (err as any)?.status || (err as any)?.statusCode || (err as any)?.code;

  // Try to parse embedded JSON error objects
  try {
    if (typeof rawMessage === "string" && (rawMessage.includes("{") || rawMessage.includes("ApiError"))) {
      const firstBrace = rawMessage.indexOf("{");
      const lastBrace = rawMessage.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonSubstring = rawMessage.slice(firstBrace, lastBrace + 1);
        const parsed = JSON.parse(jsonSubstring);

        if (parsed?.error) {
          if (parsed.error.code) statusCode = parsed.error.code;
          if (parsed.error.message) {
            try {
              const inner = JSON.parse(parsed.error.message);
              if (inner?.error?.message) {
                rawMessage = inner.error.message;
                if (inner.error.code) statusCode = inner.error.code;
              } else {
                rawMessage = parsed.error.message;
              }
            } catch {
              rawMessage = parsed.error.message;
            }
          }
        } else if (parsed?.message) {
          rawMessage = parsed.message;
        }
      }
    }
  } catch {
    // Ignore JSON parsing failure
  }

  // Format detailed, accurate error responses with HTTP status codes
  if (
    statusCode === 401 ||
    /401|UNAUTHENTICATED|invalid authentication|invalid api key|API_KEY_INVALID|ACCESS_TOKEN_TYPE_UNSUPPORTED/i.test(
      rawMessage
    )
  ) {
    return `[401 UNAUTHENTICATED] Invalid or unauthorized Gemini API key. Please check your GEMINI_API_KEY environment variable.`;
  }
  if (statusCode === 403 || /403|PERMISSION_DENIED/i.test(rawMessage)) {
    return `[403 FORBIDDEN] Permission denied for Gemini API. Please check your project permissions and GEMINI_API_KEY.`;
  }
  if (statusCode === 429 || /429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(rawMessage)) {
    return `[429 RESOURCE EXHAUSTED] Rate limit or quota reached for the Gemini API. Please wait a moment before trying again.`;
  }
  if (statusCode === 404 || /404|NOT_FOUND|model.*not found|model.*unsupported/i.test(rawMessage)) {
    return `[404 NOT FOUND] The requested Gemini model is not found or unsupported.`;
  }
  if (statusCode === 503 || /503|UNAVAILABLE|high demand|overloaded/i.test(rawMessage)) {
    return `[503 UNAVAILABLE] The Gemini API service is temporarily overloaded. Please retry in a few seconds.`;
  }
  if (/fetch failed|network timeout|socket hang up|ECONNRESET/i.test(rawMessage)) {
    return `[NETWORK ERROR] Could not connect to Gemini API servers. Please check your internet connection.`;
  }

  return rawMessage.replace(/^[a-zA-Z0-9_]+Error:\s*/, "").trim();
}

function isAuthError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err as any)?.message || String(err);
  const status = (err as any)?.status || (err as any)?.code || (err as any)?.statusCode;
  return (
    status === 401 ||
    status === 403 ||
    /401|403|UNAUTHENTICATED|ACCESS_TOKEN_TYPE_UNSUPPORTED|API_KEY_INVALID|invalid authentication/i.test(msg)
  );
}

function isModelError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err as any)?.message || String(err);
  const status = (err as any)?.status || (err as any)?.code || (err as any)?.statusCode;

  return (
    status === 503 ||
    status === 429 ||
    status === 404 ||
    /503|429|404|UNAVAILABLE|RESOURCE_EXHAUSTED|models\/.*not found|model.*not found/i.test(msg)
  );
}

class GeminiAIProvider implements AIProvider {
  // Supported active models in order of priority
  private primaryModel = "gemini-3.1-flash-lite";
  private fallbackModels = [
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview",
  ];

  // Cached verified working API key
  private cachedWorkingKey: string | null = null;

  /**
   * Retrieves all candidate API keys configured in the environment,
   * standardizing on GEMINI_API_KEY first.
   */
  private getCandidateApiKeys(): string[] {
    const keys: string[] = [];
    const seen = new Set<string>();

    const addKey = (k?: string) => {
      if (k && k.trim() !== "" && k !== "MY_GEMINI_API_KEY" && k !== "your_gemini_api_key_here" && !seen.has(k)) {
        seen.add(k);
        keys.push(k.trim());
      }
    };

    // If we have a cached working key, put it first
    if (this.cachedWorkingKey) {
      addKey(this.cachedWorkingKey);
    }

    // Standardize to GEMINI_API_KEY as primary
    addKey(process.env.GEMINI_API_KEY);
    // Fallback to alternative naming if present
    addKey(process.env.AI_API_KEY);
    addKey(process.env.AI_API_key);

    return keys;
  }

  public isConfigured(): boolean {
    return this.getCandidateApiKeys().length > 0;
  }

  private createClient(apiKey: string): GoogleGenAI {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  private formatContents(messages: ChatMessagePayload[]) {
    // Filter out system messages as they belong to systemInstruction
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // If only one message (the latest user prompt)
    if (conversationMessages.length === 1) {
      return conversationMessages[0].content;
    }

    // Format chat history turns for Gemini SDK
    return conversationMessages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));
  }

  /**
   * Generates a non-streaming response with automatic model fallback and key retry.
   */
  public async generateResponse(options: ChatCompletionOptions): Promise<string> {
    const apiKeys = this.getCandidateApiKeys();
    if (apiKeys.length === 0) {
      throw new Error(
        "[401 UNAUTHENTICATED] Missing GEMINI_API_KEY. Please set your GEMINI_API_KEY in the application settings."
      );
    }

    const requestedModel = sanitizeModelName(options.model || this.primaryModel);
    const modelsToTry = Array.from(
      new Set([requestedModel, ...this.fallbackModels.filter((m) => !DEPRECATED_MODELS.has(m))])
    );

    const contents = this.formatContents(options.messages);
    const systemInstruction =
      options.systemPrompt ||
      "You are MEYRA AI, an intelligent, helpful, and empathetic AI assistant. Provide thoughtful, well-structured answers with markdown formatting and clear code blocks where appropriate.";

    let lastError: unknown = null;

    for (const key of apiKeys) {
      const ai = this.createClient(key);

      for (const currentModel of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: currentModel,
            contents,
            config: {
              systemInstruction,
              temperature: options.temperature ?? 0.7,
            },
          });

          // Cache verified working key
          this.cachedWorkingKey = key;
          return response.text || "I was unable to generate a response. Please try again.";
        } catch (err: unknown) {
          lastError = err;

          // If authentication error on this key, invalidate cache and try next candidate key
          if (isAuthError(err)) {
            if (this.cachedWorkingKey === key) {
              this.cachedWorkingKey = null;
            }
            break; // Skip to next key
          }

          // If model issue (overloaded / 429 / 404), cascade to next model
          if (isModelError(err)) {
            continue;
          }

          continue;
        }
      }
    }

    throw new Error(extractCleanErrorMessage(lastError));
  }

  /**
   * Generates a streaming response with automatic model fallback and key retry.
   */
  public async generateStream(
    options: ChatCompletionOptions,
    onChunk: (text: string) => void
  ): Promise<void> {
    const apiKeys = this.getCandidateApiKeys();
    if (apiKeys.length === 0) {
      throw new Error(
        "[401 UNAUTHENTICATED] Missing GEMINI_API_KEY. Please set your GEMINI_API_KEY in the application settings."
      );
    }

    const requestedModel = sanitizeModelName(options.model || this.primaryModel);
    const modelsToTry = Array.from(
      new Set([requestedModel, ...this.fallbackModels.filter((m) => !DEPRECATED_MODELS.has(m))])
    );

    const contents = this.formatContents(options.messages);
    const systemInstruction =
      options.systemPrompt ||
      "You are MEYRA AI, an intelligent, helpful, and empathetic AI assistant. Provide thoughtful, well-structured answers with markdown formatting and clear code blocks where appropriate.";

    let lastError: unknown = null;
    let chunksEmitted = 0;

    for (const key of apiKeys) {
      const ai = this.createClient(key);

      for (const currentModel of modelsToTry) {
        try {
          const responseStream = await ai.models.generateContentStream({
            model: currentModel,
            contents,
            config: {
              systemInstruction,
              temperature: options.temperature ?? 0.7,
            },
          });

          for await (const chunk of responseStream) {
            if (chunk.text) {
              chunksEmitted++;
              onChunk(chunk.text);
            }
          }

          // Cache verified working key
          this.cachedWorkingKey = key;
          return;
        } catch (err: unknown) {
          lastError = err;

          // If chunks already emitted, cannot switch streams mid-generation
          if (chunksEmitted > 0) {
            throw new Error(extractCleanErrorMessage(err));
          }

          if (isAuthError(err)) {
            if (this.cachedWorkingKey === key) {
              this.cachedWorkingKey = null;
            }
            break; // Skip to next key
          }

          if (isModelError(err)) {
            continue;
          }

          continue;
        }
      }
    }

    throw new Error(extractCleanErrorMessage(lastError));
  }
}

export const aiProvider = new GeminiAIProvider();
