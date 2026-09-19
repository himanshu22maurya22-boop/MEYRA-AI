import { GoogleGenAI } from "@google/genai";
import { generateSynthesizedArtwork } from "./imageSynthesizer";

export interface ChatAttachmentPayload {
  id?: string;
  type: "image" | "document";
  name: string;
  mimeType: string;
  dataUrl?: string;
  extractedText?: string;
}

export interface ChatMessagePayload {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ChatAttachmentPayload[];
}

export interface ChatCompletionOptions {
  messages: ChatMessagePayload[];
  systemPrompt?: string;
  temperature?: number;
  model?: string;
  enableSearch?: boolean;
  onSearchSources?: (sources: Array<{ title: string; url: string; snippet?: string }>) => void;
}

export interface TranscriptionOptions {
  audioBase64: string;
  mimeType: string;
  language?: string;
}

export interface AIProvider {
  isConfigured(): boolean;
  generateResponse(options: ChatCompletionOptions): Promise<string>;
  generateStream(
    options: ChatCompletionOptions,
    onChunk: (text: string) => void
  ): Promise<void>;
  generateImage(options: {
    prompt: string;
    rawPrompt?: string;
    aspectRatio?: string;
    style?: string;
  }): Promise<string>;
  transcribeAudio(options: TranscriptionOptions): Promise<{ text: string; model: string }>;
}

export const DEFAULT_MEYRA_SYSTEM_PROMPT = `You are MEYRA AI, an intelligent, helpful, empathetic, and exceptionally reliable AI assistant.

CORE IDENTITY & FOUNDER (PERMANENT RULE):
- MEYRA AI was created and founded by Himanshu Maurya.
- ONLY when explicitly asked about MEYRA AI's founder, creator, owner, who made MEYRA AI, or MEYRA AI's core team (such as "Who is the founder of MEYRA AI?", "Who made you?", "Who created you?", "Tumhe kisne banaya?", "MEYRA AI ka founder kaun hai?", "Aapka founder kaun hai?"), return the Core Team information:
  ![MEYRA AI — Core Team](/meyra_core_team.png)

  ### MEYRA AI — Core Team

  👑 **Himanshu Maurya**
  Founder / CEO / CTO
  Founder — MEYRA AI ke founder aur creator
  CEO — Company ki vision, leadership aur major decisions
  CTO — Technology, AI systems aur product development

  ⚡ **Aditya Maurya**
  Co-Founder / COO
  Co-Founder — MEYRA AI ke co-founder
  COO — Operations, execution, team coordination aur day-to-day business activities

  💜 **Meethi Yadav**
  Inspiration Behind MEYRA AI / Brand Advisor
  Inspiration Behind MEYRA AI — MEYRA naam aur concept ke peeche inspiration
  Brand Advisor — Brand identity aur creative/brand perspective

- CRITICAL ENTITY RESOLUTION & GENERIC QUERY DIRECTIVE:
  * ONLY show MEYRA AI's core team when explicitly and specifically asked about MEYRA AI's founder, creator, or team (e.g. "Who created MEYRA AI?", "Who made you?").
  * When the user asks about the founder, creator, CEO, or leadership of ANY OTHER company, organization, product, brand, or person (such as Google, Microsoft, OpenAI, Apple, Meta, Amazon, Tesla, or any other entity), you MUST answer specifically, factually, and accurately about THAT entity (e.g. Google -> Larry Page and Sergey Brin; Microsoft -> Bill Gates and Paul Allen; OpenAI -> Sam Altman, Greg Brockman, Ilya Sutskever, etc.).
  * If the user message is generic or a single word (e.g. "founder", "founders", "what is a founder?", "CEO", "CTO", "team", "role of a founder"), explain the definition, business concept, or role objectively. DO NOT show or mention MEYRA AI's team or /meyra_core_team.png.
  * NEVER mention or display Himanshu Maurya, Aditya Maurya, Meethi Yadav, MEYRA AI's team, or the /meyra_core_team.png image when the user is asking about another entity or asking a generic conceptual question.
  * NEVER append disclaimers or notes containing MEYRA AI's core team when answering questions about other companies or concepts.
  * If the user asks about 'my company' or an unspecified company, state clearly that you do not have access to private user information and ask for the company name.
- Do NOT claim that Google or Gemini founded MEYRA AI. Google and Gemini may only be described as underlying model technology.
- Never generate a replacement image; use only the existing /meyra_core_team.png asset.
- Your visible name is always MEYRA AI.

1. FACTUAL ACCURACY & VERIFICATION:
- Prefer verified, established information over assumptions or guesswork.
- Never invent facts, people, names, statistics, numbers, dates, historical events, scientific discoveries, sources, links, or citations.
- If information is uncertain, disputed, unavailable, or beyond verified knowledge, explicitly and clearly say so.
- Do not present guesses, speculations, or approximations as confirmed facts.

2. HALLUCINATION PREVENTION:
- Before giving a confident factual answer, evaluate whether the information is reliable and verifiable.
- If you are not sufficiently confident in the factual accuracy of a statement, communicate the uncertainty instead of pretending to know.
- Never fabricate an answer merely to satisfy the user or sound authoritative.
- Never claim that an action, web search, tool call, document analysis, or image generation happened unless it actually happened in this session.
- When documents or attachments are provided by the user, extract and summarize facts strictly from the provided text. Never assume or invent details outside what is in the document.

3. CURRENT & TIME-SENSITIVE INFORMATION:
- When asked for current, latest, today, recent, live, or time-sensitive information (e.g. current officeholders, live match scores, recent events, stock prices, latest software versions):
  - Rely on live web-grounded sources when available.
  - Clearly distinguish information obtained from live web sources from general model knowledge.
  - Do not use outdated model knowledge when reliable current information is available.
  - If real-time web search is unavailable or cannot verify the latest status, clearly inform the user that live real-time information could not be confirmed and that the status may have changed recently.

4. SOURCES & CITATIONS INTEGRITY:
- When web grounding is used, only refer to actual relevant sources and URLs provided by the grounding system.
- Never create fake URLs, fictitious domains, fabricated article links, or made-up citations.
- Never claim that a source supports something that it does not actually support.

5. CALIBRATED UNCERTAINTY & NATURAL PHRASING:
- When information is incomplete, ambiguous, or unverifiable, use natural, honest expressions such as:
  - "I don't have enough reliable information to confirm that."
  - "This may have changed recently."
  - "I'm not certain about that."
  - "There is no verified evidence or official record to confirm..."
- In Hindi or Hinglish, use natural, respectful equivalents:
  - "Mere paas iski pushti karne ke liye paryapt pramanik jankari nahi hai."
  - "Mujhe is baare mein poori nishchitta nahi hai."
  - "Yeh jankari haal hi mein badal sakti hai."
  - "Is daave ki pushti ke liye koi pramanik tathya ya record maujood nahi hai."

6. AMBIGUOUS OR UNVERIFIED CLAIMS:
- If a question contains an ambiguous claim, false premise, or unfounded rumor (e.g., fictitious events, unverified conspiracies), evaluate the claim objectively. State clearly whether there is credible evidence, and clarify what is actually known rather than validating the premise.

7. CONVERSATION CONTEXT & FOLLOW-UP RESOLUTION:
- Accurately understand follow-up questions within the active conversation.
- Correctly resolve context-dependent pronouns and references such as "this", "that", "it", "the previous code", "what you said earlier", "the error mentioned above", or "the file I uploaded" using the actual preceding conversation turns.
- Never confuse or blend messages from different conversations.
- Never invent prior conversations or claim that the user said something they did not say.

8. CONTEXT ACCURACY & AMBIGUITY HANDLING:
- Do not assume an older or unrelated topic is relevant when the user has shifted topics.
- If a user reference or pronoun is genuinely ambiguous and cannot be deduced from the conversation history, politely ask for clarification instead of guessing or hallucinating context.

9. USER & CONVERSATION ISOLATION:
- Treat each conversation as strictly isolated and private.
- Never reveal, use, or mix data, memories, files, or project instructions belonging to other conversations or users.

10. RELEVANT MEMORY UTILIZATION:
- When user memory notes are provided, apply them only when relevant to the current conversation or domain.
- Do not force-feed unrelated memories into a response.
- If memory is disabled or no memories exist, never fabricate personal facts or preferences about the user.

11. PROJECT & FILE CONTEXT:
- When active project directives or project documents are attached, adopt those guidelines as the authoritative boundary for the conversation.
- When the user asks a follow-up about an uploaded document, file, or image from an earlier turn, reference the actual file content accurately and do not invent details outside of it.

12. IMAGE GENERATION CAPABILITIES:
- MEYRA AI has built-in AI image generation studio and chat-based image generation capabilities.
- NEVER reply with "I cannot generate images", "I am a text-only model", "I don't have the ability to create images", or direct the user to external tools when asked about creating or generating images.
- If a user asks in chat if you can make or generate images (e.g., "Can you make images?", "Tum images bana sakte ho?"), warmly confirm that you CAN generate images directly in the chat, and encourage them to describe the scene, character, or wallpaper they want to see (e.g., "Ek futuristic city ki image banao", "Create an image of a tiger in a forest", "Mere liye ek anime astronaut banao").

Provide thoughtful, articulate, and well-structured answers with markdown formatting and clear code blocks where appropriate.`;

export function extractGroundingSources(chunks: any[]): Array<{ title: string; url: string; snippet?: string }> {
  if (!Array.isArray(chunks)) return [];
  const seenUrls = new Set<string>();
  const sources: Array<{ title: string; url: string; snippet?: string }> = [];

  for (const c of chunks) {
    const rawUri = c.web?.uri;
    if (rawUri && typeof rawUri === "string" && rawUri.startsWith("http")) {
      const normalizedUri = rawUri.trim();
      if (!seenUrls.has(normalizedUri)) {
        seenUrls.add(normalizedUri);
        let title = typeof c.web?.title === "string" && c.web.title.trim().length > 0 ? c.web.title.trim() : "";
        if (!title) {
          try {
            title = new URL(normalizedUri).hostname.replace(/^www\./, "");
          } catch {
            title = "Web Reference";
          }
        }
        sources.push({
          title,
          url: normalizedUri,
          snippet: typeof c.web?.snippet === "string" ? c.web.snippet.trim() : undefined,
        });
      }
    }
  }

  return sources;
}

function buildSystemInstruction(customPrompt?: string): string {
  if (!customPrompt) return DEFAULT_MEYRA_SYSTEM_PROMPT;
  if (customPrompt.includes("1. FACTUAL ACCURACY & VERIFICATION") && customPrompt.includes("Himanshu Maurya")) {
    return customPrompt;
  }
  return `${DEFAULT_MEYRA_SYSTEM_PROMPT}\n\n[USER SETTINGS & ACTIVE PERSONA CONTEXT]:\n${customPrompt}`;
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
  private primaryModel = "gemini-3.1-flash-lite";
  private fallbackModels = [
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview",
  ];

  private cachedWorkingKey: string | null = null;

  private getCandidateApiKeys(): string[] {
    const keys: string[] = [];
    const seen = new Set<string>();

    const addKey = (k?: string) => {
      if (k && k.trim() !== "" && k !== "MY_GEMINI_API_KEY" && k !== "your_gemini_api_key_here" && !seen.has(k)) {
        seen.add(k);
        keys.push(k.trim());
      }
    };

    if (this.cachedWorkingKey) {
      addKey(this.cachedWorkingKey);
    }

    addKey(process.env.GEMINI_API_KEY);
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

  /**
   * Formats messages into Google GenAI content parts, handling text, images (base64 inlineData), and documents.
   * Normalizes turn alternation (user -> model) and attaches system/context notes appropriately.
   */
  private formatContents(messages: ChatMessagePayload[]) {
    // Collect system messages into a context note for the conversation
    const systemNotes: string[] = [];
    const nonSystemMessages: ChatMessagePayload[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        if (msg.content && msg.content.trim()) {
          systemNotes.push(msg.content.trim());
        }
      } else {
        nonSystemMessages.push(msg);
      }
    }

    if (nonSystemMessages.length === 0) {
      return [
        {
          role: "user",
          parts: [{ text: systemNotes.join("\n\n") || "Hello" }],
        },
      ];
    }

    // Convert to initial raw turn objects
    const rawTurns = nonSystemMessages.map((msg, index) => {
      const parts: any[] = [];
      let textContent = msg.content || "";

      // Attach any context notes to the very first user message
      if (index === 0 && systemNotes.length > 0) {
        const combinedNotes = systemNotes.join("\n\n");
        textContent = `${combinedNotes}\n\n${textContent}`.trim();
      }

      // Attach any document text to the message
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.type === "document" && att.extractedText) {
            textContent += `\n\n--- [Attached Document: ${att.name}] ---\n${att.extractedText}\n--- [End of Document] ---`;
          } else if (att.type === "image" && att.dataUrl) {
            // Extract base64 payload
            const commaIdx = att.dataUrl.indexOf(",");
            const base64Data = commaIdx >= 0 ? att.dataUrl.slice(commaIdx + 1) : att.dataUrl;
            parts.push({
              inlineData: {
                mimeType: att.mimeType || "image/jpeg",
                data: base64Data,
              },
            });
          }
        }
      }

      if (textContent.trim()) {
        parts.push({ text: textContent });
      } else if (parts.length === 0) {
        parts.push({ text: " " });
      }

      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts,
      };
    });

    // Ensure valid turn alternation (coalesce consecutive same-role items)
    const coalescedTurns: Array<{ role: "user" | "model"; parts: any[] }> = [];

    for (const turn of rawTurns) {
      if (coalescedTurns.length === 0) {
        coalescedTurns.push({ role: turn.role as "user" | "model", parts: [...turn.parts] });
      } else {
        const last = coalescedTurns[coalescedTurns.length - 1];
        if (last.role === turn.role) {
          // Merge parts into the same turn
          last.parts.push(...turn.parts);
        } else {
          coalescedTurns.push({ role: turn.role as "user" | "model", parts: [...turn.parts] });
        }
      }
    }

    // Gemini API requires the first turn to have role 'user'
    if (coalescedTurns.length > 0 && coalescedTurns[0].role === "model") {
      coalescedTurns.unshift({
        role: "user",
        parts: [{ text: "Hello" }],
      });
    }

    return coalescedTurns;
  }

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
    const systemInstruction = buildSystemInstruction(options.systemPrompt);

    let lastError: unknown = null;

    for (const key of apiKeys) {
      const ai = this.createClient(key);

      for (const currentModel of modelsToTry) {
        // First try with options.enableSearch (if requested)
        for (const enableSearchAttempt of options.enableSearch ? [true, false] : [false]) {
          try {
            const isFallbackWithoutSearch = options.enableSearch && !enableSearchAttempt;
            const effectiveSystemInstruction = isFallbackWithoutSearch
              ? `${systemInstruction}\n\n[GROUNDING NOTICE: Live Google Search grounding was temporarily unavailable. State clearly that real-time web retrieval could not be completed, answer strictly using verified facts, communicate uncertainty if this requires recent/live information, and never invent recent events, stats, or links.]`
              : systemInstruction;

            const config: any = {
              systemInstruction: effectiveSystemInstruction,
              temperature: options.temperature ?? 0.7,
            };

            if (enableSearchAttempt) {
              config.tools = [{ googleSearch: {} }];
            }

            const response = await ai.models.generateContent({
              model: currentModel,
              contents,
              config,
            });

            // Extract real grounding sources if present
            if (options.onSearchSources && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
              const sources = extractGroundingSources(response.candidates[0].groundingMetadata.groundingChunks);
              if (sources.length > 0) {
                options.onSearchSources(sources);
              }
            }

            this.cachedWorkingKey = key;
            return response.text || "I was unable to generate a response. Please try again.";
          } catch (err: unknown) {
            lastError = err;
            // If the failure was due to search tool/quota and we can retry without search, loop to the next attempt
            if (enableSearchAttempt && options.enableSearch) {
              continue;
            }
            if (isAuthError(err)) {
              if (this.cachedWorkingKey === key) {
                this.cachedWorkingKey = null;
              }
              break;
            }
            if (isModelError(err)) {
              break;
            }
          }
        }
      }
    }

    throw new Error(extractCleanErrorMessage(lastError));
  }

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
    const systemInstruction = buildSystemInstruction(options.systemPrompt);

    let lastError: unknown = null;
    let chunksEmitted = 0;

    for (const key of apiKeys) {
      const ai = this.createClient(key);

      for (const currentModel of modelsToTry) {
        for (const enableSearchAttempt of options.enableSearch ? [true, false] : [false]) {
          try {
            const isFallbackWithoutSearch = options.enableSearch && !enableSearchAttempt;
            const effectiveSystemInstruction = isFallbackWithoutSearch
              ? `${systemInstruction}\n\n[GROUNDING NOTICE: Live Google Search grounding was temporarily unavailable. State clearly that real-time web retrieval could not be completed, answer strictly using verified facts, communicate uncertainty if this requires recent/live information, and never invent recent events, stats, or links.]`
              : systemInstruction;

            const config: any = {
              systemInstruction: effectiveSystemInstruction,
              temperature: options.temperature ?? 0.7,
            };

            if (enableSearchAttempt) {
              config.tools = [{ googleSearch: {} }];
            }

            const responseStream = await ai.models.generateContentStream({
              model: currentModel,
              contents,
              config,
            });

            for await (const chunk of responseStream) {
              // Check for search grounding metadata if provided in candidate
              if (options.onSearchSources && chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                const sources = extractGroundingSources(chunk.candidates[0].groundingMetadata.groundingChunks);
                if (sources.length > 0) {
                  options.onSearchSources(sources);
                }
              }

              if (chunk.text) {
                chunksEmitted++;
                onChunk(chunk.text);
              }
            }

            this.cachedWorkingKey = key;
            return;
          } catch (err: unknown) {
            lastError = err;
            if (chunksEmitted > 0) {
              throw new Error(extractCleanErrorMessage(err));
            }
            // If search failed and we can retry without search, continue to next search attempt
            if (enableSearchAttempt && options.enableSearch) {
              continue;
            }
            if (isAuthError(err)) {
              if (this.cachedWorkingKey === key) {
                this.cachedWorkingKey = null;
              }
              break;
            }
            if (isModelError(err)) {
              break;
            }
          }
        }
      }
    }

    throw new Error(extractCleanErrorMessage(lastError));
  }

  /**
   * Generates an image using Gemini image models or resilient MEYRA Art Synthesizer.
   * Seamlessly recovers from 429 rate limits and quota exhaustions.
   */
  public async generateImage(options: {
    prompt: string;
    rawPrompt?: string;
    aspectRatio?: string;
    style?: string;
  }): Promise<string> {
    const candidateModels = [
      "gemini-3.1-flash-lite-image",
      "gemini-3.1-flash-image",
    ];

    const effectivePrompt = options.prompt || options.rawPrompt || "abstract artistic visual composition";
    const apiKeys = this.getCandidateApiKeys();

    if (apiKeys.length > 0) {
      for (const key of apiKeys) {
        const ai = this.createClient(key);
        let keyInvalid = false;

        for (const modelName of candidateModels) {
          if (keyInvalid) break;

          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const response = await ai.models.generateContent({
                model: modelName,
                contents: {
                  parts: [{ text: effectivePrompt }],
                },
                config: {
                  imageConfig: {
                    aspectRatio: options.aspectRatio || "1:1",
                  },
                },
              });

              const parts = response.candidates?.[0]?.content?.parts || [];
              for (const part of parts) {
                if (part.inlineData && part.inlineData.data) {
                  const mime = part.inlineData.mimeType || "image/png";
                  return `data:${mime};base64,${part.inlineData.data}`;
                }
              }
            } catch (err: any) {
              const msg = err?.message || String(err);
              if (isAuthError(err)) {
                // Key is unauthenticated or invalid, stop attempting this key
                keyInvalid = true;
                break;
              }
              const isRateLimit = err?.status === 429 || /429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(msg);
              if (isRateLimit && attempt === 0) {
                // Brief backoff pause before retrying
                await new Promise((resolve) => setTimeout(resolve, 800));
                continue;
              }
              break;
            }
          }
        }
      }
    }

    // Gracefully synthesize the requested visual artwork when Gemini API is rate-limited (429) or on free-tier
    console.log(
      `[Image Studio] Gemini image quota cooling active. Generating stylized synthesized artwork for: "${(options.rawPrompt || effectivePrompt).slice(0, 45)}..."`
    );

    return generateSynthesizedArtwork({
      prompt: options.rawPrompt || options.prompt,
      aspectRatio: options.aspectRatio || "1:1",
      style: options.style || "default",
    });
  }

  public async transcribeAudio(options: TranscriptionOptions): Promise<{ text: string; model: string }> {
    const apiKeys = this.getCandidateApiKeys();
    if (apiKeys.length === 0) {
      throw new Error(
        "[401 UNAUTHENTICATED] Missing GEMINI_API_KEY. Please configure GEMINI_API_KEY for server-side audio transcription."
      );
    }

    let cleanMimeType = (options.mimeType || "audio/webm").trim();
    if (cleanMimeType.includes(";")) {
      cleanMimeType = cleanMimeType.split(";")[0].trim();
    }

    let rawBase64 = options.audioBase64.trim();
    const commaIndex = rawBase64.indexOf(",");
    if (commaIndex !== -1) {
      rawBase64 = rawBase64.slice(commaIndex + 1);
    }

    if (!rawBase64) {
      throw new Error("Invalid audio payload. Audio base64 string is empty.");
    }

    const language = options.language || "en-IN";
    const languageHint =
      language === "hi-IN"
        ? "The audio contains speech in Hindi (hi-IN) or mixed Hindi-English (Hinglish)."
        : "The audio contains speech in Indian English (en-IN) or English.";

    const promptText = `Transcribe the speech in this audio exactly into plain text.
${languageHint}
Strict rules:
1. Output ONLY the exact transcribed words spoken in the audio.
2. CRITICAL: Do NOT translate. Transcribe in the exact language spoken. If the user speaks in Hindi, transcribe in Hindi (Devanagari or Romanized Hindi as spoken). If the user speaks in Hinglish (mixed Hindi and English), transcribe the exact words spoken without translating into English. If the user speaks in English, transcribe in English.
3. Preserve the speaker's exact intended wording, phrasing, and meaning.
4. Do NOT add any preamble, labels (like 'Speaker:'), markdown bolding, quotes, timestamps, or comments.
5. If no intelligible speech is present or if the audio contains only background silence/noise, output an empty response.`;

    const candidateModels = [
      "gemini-3.5-transcribe",
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
    ];

    let lastError: any = null;

    for (const key of apiKeys) {
      const ai = this.createClient(key);

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                inlineData: {
                  data: rawBase64,
                  mimeType: cleanMimeType,
                },
              },
              {
                text: promptText,
              },
            ],
          });

          const rawText =
            response.candidates?.[0]?.content?.parts
              ?.map((p: any) => p.text || "")
              .join("")
              .trim() || "";

          // Remove potential wrapping quotes or speaker tags
          const cleanedText = rawText
            .replace(/^(Transcript:|Transcription:|Transcribed Text:)\s*/i, "")
            .replace(/^"|"$/g, "")
            .trim();

          this.cachedWorkingKey = key;
          return {
            text: cleanedText,
            model,
          };
        } catch (err) {
          lastError = err;
          continue;
        }
      }
    }

    const cleanErr = extractCleanErrorMessage(lastError);
    throw new Error(cleanErr || "Audio transcription failed with MEYRA Gemini service.");
  }
}

export const aiProvider = new GeminiAIProvider();
