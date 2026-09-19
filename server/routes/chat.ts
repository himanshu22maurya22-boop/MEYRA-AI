import { Router, Request, Response } from "express";
import {
  aiProvider,
  ChatMessagePayload,
  extractCleanErrorMessage,
} from "../services/aiProvider";
import {
  detectFounderIntent,
  resolveFounderInquiry,
  sanitizeExternalEntityResponse,
  MEYRA_CORE_TEAM_RESPONSE,
  isTimeSensitiveQuery,
} from "../../src/services/founderIntent";
import { detectImageIntent } from "../../src/services/imageIntent";
import { executeWebSearch, SearchSource } from "../services/webSearchService";
import { chatRateLimiter } from "../middleware/rateLimiter";

export const chatRouter = Router();

const CLOUD_RUN_BACKEND = "https://meyra-ai-804674901589.asia-southeast1.run.app";
const ADMIN_EMAIL = "himanshu22maurya22@gmail.com";

// Store in-memory feedbacks for admin audit
const inMemoryFeedbacks: any[] = [];
const appStartTime = Date.now();

// Health & configuration check endpoint
chatRouter.get("/status", async (_req: Request, res: Response) => {
  const localConfigured = aiProvider.isConfigured();
  if (localConfigured) {
    res.json({
      status: "ok",
      appName: "MEYRA AI",
      version: "2.0.0",
      isConfigured: true,
      backend: "local",
      model: "gemini-3.1-flash-lite",
      message: "MEYRA AI is online and connected to Gemini API.",
    });
    return;
  }

  // Check Cloud Run backend status
  try {
    const cloudRes = await fetch(`${CLOUD_RUN_BACKEND}/api/status`);
    if (cloudRes.ok) {
      const data = await cloudRes.json();
      res.json({
        ...data,
        backend: "cloud-run",
        cloudRunUrl: CLOUD_RUN_BACKEND,
      });
      return;
    }
  } catch (err) {
    console.warn("Could not reach Cloud Run status:", err);
  }

  res.json({
    status: "ok",
    appName: "MEYRA AI",
    version: "2.0.0",
    isConfigured: false,
    model: "gemini-3.1-flash-lite",
    message: "No API key configured. Please set GEMINI_API_KEY in environment variables.",
  });
});

// Chat completion endpoint (supporting multimodal attachments, search grounding, SSE streaming)
chatRouter.post("/chat", chatRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      messages,
      stream = true,
      systemPrompt,
      temperature,
      model,
      enableSearch = false,
      persona,
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        error: "Invalid request payload. 'messages' array is required and cannot be empty.",
      });
      return;
    }

    if (messages.length > 100) {
      res.status(400).json({
        error: "Message limit exceeded. Maximum 100 messages allowed per conversation batch.",
      });
      return;
    }

    const validMessages: ChatMessagePayload[] = [];
    for (const msg of messages) {
      if (
        msg &&
        typeof msg.content === "string" &&
        (msg.role === "user" || msg.role === "assistant" || msg.role === "system")
      ) {
        if (msg.content.length > 50000) {
          res.status(400).json({
            error: "Single message content exceeds maximum allowed length of 50,000 characters.",
          });
          return;
        }

        let safeAttachments = undefined;
        if (Array.isArray(msg.attachments)) {
          if (msg.attachments.length > 10) {
            res.status(400).json({ error: "Maximum 10 attachments allowed per message." });
            return;
          }
          safeAttachments = msg.attachments.filter(
            (att: any) =>
              att &&
              typeof att.name === "string" &&
              (!att.dataUrl || (typeof att.dataUrl === "string" && att.dataUrl.length < 15 * 1024 * 1024))
          );
        }

        validMessages.push({
          role: msg.role,
          content: msg.content.trim(),
          attachments: safeAttachments,
        });
      }
    }

    if (validMessages.length === 0) {
      res.status(400).json({
        error: "No valid messages provided in the conversation payload.",
      });
      return;
    }

    // Intercept Founder & Core Team inquiries permanently (strictly entity-aware)
    const lastUserMsg = [...validMessages].reverse().find((m) => m.role === "user");
    const lastUserIdx = lastUserMsg ? validMessages.lastIndexOf(lastUserMsg) : -1;
    const priorHistory = lastUserIdx > 0 ? validMessages.slice(0, lastUserIdx) : [];
    const founderResolution = lastUserMsg
      ? resolveFounderInquiry(lastUserMsg.content, priorHistory)
      : null;
    const isFounderQuery = Boolean(
      founderResolution?.isFounderInquiry && founderResolution.targetEntity === "meyra"
    );
    const isExternalCompanyQuery = Boolean(
      founderResolution?.isFounderInquiry && founderResolution.targetEntity === "other"
    );

    if (
      lastUserMsg &&
      (!lastUserMsg.attachments || lastUserMsg.attachments.length === 0) &&
      isFounderQuery
    ) {
      console.log(`[POST /api/chat] Intercepted MEYRA Core Team inquiry: "${lastUserMsg.content}"`);
      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const chunks = [
          "![MEYRA AI — Core Team](/meyra_core_team.png)\n\n",
          "### MEYRA AI — Core Team\n\n",
          "👑 **Himanshu Maurya**\n**Founder / CEO / CTO**\nFounder — MEYRA AI ke founder aur creator\nCEO — Company ki vision, leadership aur major decisions\nCTO — Technology, AI systems aur product development\n\n",
          "⚡ **Aditya Maurya**\n**Co-Founder / COO**\nCo-Founder — MEYRA AI ke co-founder\nCOO — Operations, execution, team coordination aur day-to-day business activities\n\n",
          "💜 **Meethi Yadav**\n**Inspiration Behind MEYRA AI / Brand Advisor**\nInspiration Behind MEYRA AI — MEYRA naam aur concept ke peeche inspiration\nBrand Advisor — Brand identity aur creative/brand perspective\n"
        ];

        for (const chunk of chunks) {
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        return;
      } else {
        res.json({
          response: MEYRA_CORE_TEAM_RESPONSE,
          role: "assistant",
          model: "meyra-core-team",
        });
        return;
      }
    }

    // Intercept visual artwork & image generation requests in chat
    const parsedImage =
      lastUserMsg && (!lastUserMsg.attachments || lastUserMsg.attachments.length === 0)
        ? detectImageIntent(lastUserMsg.content)
        : null;

    if (parsedImage && !isFounderQuery) {
      console.log(`[POST /api/chat] Intercepted image generation request: "${parsedImage.prompt}"`);
      if (stream) {
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Content-Encoding", "none");
        res.flushHeaders?.();

        res.write(`data: ${JSON.stringify({ text: "MEYRA AI is creating your image...\n\n", done: false })}\n\n`);

        try {
          const imageUrl = await aiProvider.generateImage({
            prompt: parsedImage.prompt,
            rawPrompt: lastUserMsg?.content,
            aspectRatio: parsedImage.aspectRatio,
            style: parsedImage.style,
          });

          const imageMarkdown = `![${parsedImage.prompt}](${imageUrl})\n\nHere is your generated artwork for: "${parsedImage.prompt}".`;
          const generatedImage = {
            imageUrl,
            prompt: parsedImage.prompt,
            aspectRatio: parsedImage.aspectRatio,
            style: parsedImage.style,
            createdAt: Date.now(),
          };

          res.write(
            `data: ${JSON.stringify({
              text: imageMarkdown,
              content: imageMarkdown,
              imageUrl,
              generatedImage,
              done: false,
            })}\n\n`
          );
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          return;
        } catch (imgErr: any) {
          console.error("Image generation error in chat stream:", imgErr);
          res.write(
            `data: ${JSON.stringify({
              text: "Sorry, I encountered an error while generating your image. Please try again.",
              done: true,
            })}\n\n`
          );
          res.end();
          return;
        }
      } else {
        try {
          const imageUrl = await aiProvider.generateImage({
            prompt: parsedImage.prompt,
            rawPrompt: lastUserMsg?.content,
            aspectRatio: parsedImage.aspectRatio,
            style: parsedImage.style,
          });

          const imageMarkdown = `![${parsedImage.prompt}](${imageUrl})\n\nHere is your generated artwork for: "${parsedImage.prompt}".`;
          const generatedImage = {
            imageUrl,
            prompt: parsedImage.prompt,
            aspectRatio: parsedImage.aspectRatio,
            style: parsedImage.style,
            createdAt: Date.now(),
          };

          res.json({
            role: "assistant",
            content: imageMarkdown,
            imageUrl,
            generatedImage,
            searchUsed: false,
          });
          return;
        } catch (imgErr: any) {
          console.error("Image generation error in chat non-streaming:", imgErr);
          res.status(500).json({ error: "Failed to generate image." });
          return;
        }
      }
    }

// Robust forwarder to Cloud Run backend with search-grounding retry and disclaimer fallback
async function forwardToCloudRunBackend(
  payload: {
    messages: any[];
    stream: boolean;
    systemPrompt?: string;
    temperature?: number;
    model?: string;
    enableSearch?: boolean;
    persona?: any;
    searchSources?: SearchSource[];
    isExternalCompanyQuery?: boolean;
  },
  res: Response
): Promise<void> {
  const {
    messages,
    stream,
    systemPrompt,
    temperature,
    model,
    enableSearch,
    persona,
    searchSources = [],
    isExternalCompanyQuery = false,
  } = payload;
  const attempts = enableSearch ? [true, false] : [false];

  for (let i = 0; i < attempts.length; i++) {
    const trySearch = attempts[i];
    const isSearchFallback = enableSearch && !trySearch;

    const effectiveSystemPrompt = isSearchFallback
      ? `${systemPrompt || ""}\n\n[SEARCH STATUS NOTICE: Real-time Google Web Search could not be completed because the live search service is currently unavailable. You MUST clearly state to the user in the natural language of their query (e.g. Hindi or English) that live search could not be completed and today's real-time information/weather/news/rates cannot be retrieved. Answer strictly using verified facts, communicate uncertainty if this requires recent information, and never invent fake news, fake weather, fake rates, or fake sources.]`
      : systemPrompt;

    try {
      const cloudResponse = await fetch(`${CLOUD_RUN_BACKEND}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          stream,
          systemPrompt: effectiveSystemPrompt,
          temperature,
          model,
          enableSearch: trySearch,
          persona,
        }),
      });

      if (!cloudResponse.ok) {
        const errText = await cloudResponse.text().catch(() => "");
        if (trySearch && enableSearch && i < attempts.length - 1) {
          console.warn(`[Cloud Run] Search attempt failed with status ${cloudResponse.status}. Retrying without search and with clear search status notice.`);
          continue;
        }
        throw new Error(`Cloud Run backend error (${cloudResponse.status}): ${errText}`);
      }

      if (stream) {
        if (!res.headersSent) {
          res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache, no-transform");
          res.setHeader("Connection", "keep-alive");
          res.setHeader("Content-Encoding", "none");
          res.flushHeaders?.();
        }

        // If search sources exist, emit them to SSE stream immediately!
        if (searchSources.length > 0) {
          res.write(`data: ${JSON.stringify({ sources: searchSources, done: false })}\n\n`);
        }

        if (!cloudResponse.body) {
          throw new Error("Cloud Run response body is null");
        }

        const reader = cloudResponse.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let sseBuffer = "";
        let isSuppressingMeyraDisclaimer = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (isExternalCompanyQuery) {
            const chunkText = decoder.decode(value, { stream: true });
            sseBuffer += chunkText;
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataPart = line.slice(6).trim();
                if (dataPart === "[DONE]" || dataPart === '{"done":true}') {
                  if (!res.writableEnded) res.write(`data: ${dataPart}\n\n`);
                  continue;
                }
                try {
                  const parsed = JSON.parse(dataPart);
                  const content = parsed.text || parsed.content || parsed.response || "";
                  if (
                    content.includes("Note regarding MEYRA AI") ||
                    content.includes("Note: As MEYRA AI") ||
                    content.includes("MEYRA AI — Core Team") ||
                    content.includes("/meyra_core_team.png")
                  ) {
                    isSuppressingMeyraDisclaimer = true;
                    continue;
                  }
                  if (isSuppressingMeyraDisclaimer) {
                    // Suppress subsequent lines of the injected MEYRA team disclaimer
                    continue;
                  }
                  if (!res.writableEnded) {
                    res.write(`${line}\n`);
                  }
                } catch {
                  if (!isSuppressingMeyraDisclaimer && !res.writableEnded) {
                    res.write(`${line}\n`);
                  }
                }
              } else {
                if (!isSuppressingMeyraDisclaimer && !res.writableEnded) {
                  res.write(`${line}\n`);
                }
              }
            }
          } else {
            if (!res.writableEnded) {
              res.write(value);
            }
          }
        }
        if (!res.writableEnded) {
          res.end();
        }
        return;
      } else {
        const data = await cloudResponse.json();
        if (isExternalCompanyQuery && data.response) {
          data.response = sanitizeExternalEntityResponse(data.response);
        }
        if (searchSources.length > 0) {
          data.sources = searchSources;
          data.searchUsed = true;
        } else if (isSearchFallback) {
          data.sources = [];
          data.searchUsed = false;
        }
        res.json(data);
        return;
      }
    } catch (err: any) {
      if (trySearch && enableSearch && i < attempts.length - 1) {
        console.warn("[Cloud Run] Exception during search request, retrying without search:", err?.message);
        continue;
      }
      throw err;
    }
  }
}

    // Auto-detect current/time-sensitive queries for search grounding
    const isCurrentInfoQuery = lastUserMsg ? isTimeSensitiveQuery(lastUserMsg.content) : false;
    const requestedSearch = Boolean(enableSearch || isCurrentInfoQuery || isExternalCompanyQuery);

    let searchSources: SearchSource[] = [];
    let effectiveSystemPrompt = systemPrompt || "";
    let passSearchToModel = false;

    // Prevent models from outputting raw tool action JSON in conversational mode
    effectiveSystemPrompt = `${effectiveSystemPrompt}\n\nCRITICAL CONVERSATIONAL DIRECTIVE:
- Never output raw tool-calling JSON, action blocks, or payloads such as {"action": "dalle.text2im", ...}, {"action": "dalle2im", ...}, or internal JSON parameters.
- When asked to generate, design, or create an image, artwork, wallpaper, or logo, describe what you visualize in natural, warm language (Hindi, Hinglish, or English).`.trim();

    // Directives for external company / founder inquiries
    if (isExternalCompanyQuery) {
      effectiveSystemPrompt = `${effectiveSystemPrompt}\n\nCRITICAL ENTITY-RESOLUTION & FOUNDER DIRECTIVE:
- The user is asking about the founder, leadership, or history of an external entity (${founderResolution?.entityName || "company/organization"}).
- You MUST answer specifically, factually, and accurately about THAT entity (e.g., Google was founded by Larry Page and Sergey Brin; Microsoft by Bill Gates and Paul Allen; OpenAI by Sam Altman, Greg Brockman, etc.).
- NEVER mention or display Himanshu Maurya, Aditya Maurya, Meethi Yadav, MEYRA AI's team, or the /meyra_core_team.png image when answering about an external entity.
- NEVER append disclaimers or side notes containing MEYRA AI's core team when discussing other companies.
- If the user asks about 'my company' or an unspecified company, state clearly that you do not have access to private user records and ask for the company name to look up its public records.`.trim();
    } else if (founderResolution?.isFounderInquiry && founderResolution.targetEntity === "unknown") {
      effectiveSystemPrompt = `${effectiveSystemPrompt}\n\nCRITICAL FOUNDER INQUIRY DIRECTIVE:
- The user asked a generic question or word regarding a founder/CEO without specifying MEYRA AI.
- Explain the definition, role, or concept of a founder/leadership neutrally, or ask which company they want to know about.
- NEVER output MEYRA AI's core team, Himanshu Maurya, Aditya Maurya, Meethi Yadav, or /meyra_core_team.png.`.trim();
    }

    if (requestedSearch && lastUserMsg) {
      console.log(`[WebSearch] Executing live web search for: "${lastUserMsg.content}" (userToggle: ${Boolean(enableSearch)}, autoDetect: ${isCurrentInfoQuery})`);
      try {
        const searchResult = await executeWebSearch(lastUserMsg.content);
        if (searchResult && searchResult.sources.length > 0) {
          searchSources = searchResult.sources;
          console.log(`[WebSearch] Found ${searchSources.length} verified sources via ${searchResult.provider}`);

          effectiveSystemPrompt = `${effectiveSystemPrompt}\n\n[VERIFIED REAL-TIME SEARCH GROUNDING DATA FOR: "${lastUserMsg.content}"]\nProvider: ${searchResult.provider}\n${searchResult.summaryContext}\n\nCRITICAL RESPONSE INSTRUCTIONS:\n1. Answer the user's question accurately and helpfully based strictly on the verified real-time search data above.\n2. Respond in the natural language and tone of the user's inquiry (Hindi, Hinglish, or English).\n3. Summarize the latest facts, news, weather, or numbers clearly.\n4. Do NOT claim you cannot access current information or cannot browse the web, because live web retrieval was successfully executed above.\n5. Do NOT invent fake facts or unverified links outside the retrieved data.`;
          passSearchToModel = false;
        } else {
          console.log(`[WebSearch] No sources found for: "${lastUserMsg.content}"`);
          if (enableSearch) {
            effectiveSystemPrompt = `${effectiveSystemPrompt}\n\n[SEARCH STATUS: Real-time web search was performed for "${lastUserMsg.content}" but returned no current records. Honestly inform the user that live search returned no current records for this query, answer using verified facts, and never fabricate fake news or fake links.]`;
          }
        }
      } catch (searchErr) {
        console.warn("[WebSearch] Search execution error:", searchErr);
      }
    }

    // If local provider is not configured, forward directly to Cloud Run backend
    if (!aiProvider.isConfigured()) {
      try {
        console.log(`[POST /api/chat] Routing to secure Cloud Run backend: ${CLOUD_RUN_BACKEND}`);
        await forwardToCloudRunBackend(
          {
            messages: validMessages,
            stream,
            systemPrompt: effectiveSystemPrompt,
            temperature,
            model,
            enableSearch: passSearchToModel,
            persona,
            searchSources,
            isExternalCompanyQuery,
          },
          res
        );
        return;
      } catch (cloudErr: any) {
        console.error("Cloud Run proxy error:", cloudErr);
        res.status(502).json({
          error: `Failed to connect to Cloud Run backend: ${cloudErr?.message || "Unknown error"}`,
        });
        return;
      }
    }

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Content-Encoding", "none");
      res.flushHeaders?.();

      let chunksEmitted = 0;

      // If search sources exist, emit them to SSE stream immediately!
      if (searchSources.length > 0 && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ sources: searchSources, done: false })}\n\n`);
      }

      try {
        await aiProvider.generateStream(
          {
            messages: validMessages,
            systemPrompt: effectiveSystemPrompt,
            temperature,
            model,
            enableSearch: passSearchToModel,
            onSearchSources: (sources) => {
              if (searchSources.length === 0 && !res.writableEnded) {
                res.write(`data: ${JSON.stringify({ sources, done: false })}\n\n`);
              }
            },
          },
          (chunk: string) => {
            if (!res.writableEnded) {
              chunksEmitted++;
              res.write(`data: ${JSON.stringify({ text: chunk, done: false })}\n\n`);
            }
          }
        );

        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ text: "", done: true })}\n\n`);
        }
      } catch (streamErr: any) {
        console.warn("Local stream failed. Attempting Cloud Run fallback if no chunks sent. Error:", streamErr?.message);
        if (chunksEmitted === 0) {
          try {
            await forwardToCloudRunBackend(
              {
                messages: validMessages,
                stream: true,
                systemPrompt: effectiveSystemPrompt,
                temperature,
                model,
                enableSearch: passSearchToModel,
                persona,
                searchSources,
                isExternalCompanyQuery: !isFounderQuery,
              },
              res
            );
            return;
          } catch (cloudErr: any) {
            const cleanErrorMessage = extractCleanErrorMessage(cloudErr || streamErr);
            console.error("Cloud Run fallback error:", cleanErrorMessage);
            if (!res.writableEnded) {
              res.write(
                `data: ${JSON.stringify({ error: cleanErrorMessage, done: true })}\n\n`
              );
            }
          }
        } else {
          const cleanErrorMessage = extractCleanErrorMessage(streamErr);
          if (!res.writableEnded) {
            res.write(
              `data: ${JSON.stringify({ error: cleanErrorMessage, done: true })}\n\n`
            );
          }
        }
      } finally {
        if (!res.writableEnded) {
          res.end();
        }
      }
    } else {
      let extractedSources: Array<{ title: string; url: string; snippet?: string }> = searchSources;
      try {
        const reply = await aiProvider.generateResponse({
          messages: validMessages,
          systemPrompt: effectiveSystemPrompt,
          temperature,
          model,
          enableSearch: passSearchToModel,
          onSearchSources: (sources) => {
            if (extractedSources.length === 0) {
              extractedSources = sources;
            }
          },
        });

        // Check if model returned tool/action JSON for image generation
        if (
          reply &&
          (reply.includes('"action"') || reply.includes('dalle.text2im') || reply.includes('text2im')) &&
          (reply.includes('prompt') || reply.includes('action_input'))
        ) {
          let extractedPrompt = "";
          try {
            const parsed = JSON.parse(reply);
            if (parsed.action_input) {
              if (typeof parsed.action_input === "string") {
                try {
                  const inputObj = JSON.parse(parsed.action_input);
                  extractedPrompt = inputObj.prompt || inputObj.text || parsed.action_input;
                } catch {
                  extractedPrompt = parsed.action_input;
                }
              } else if (parsed.action_input.prompt) {
                extractedPrompt = parsed.action_input.prompt;
              }
            }
          } catch {
            const m = reply.match(/"prompt"\s*:\s*"([^"]+)"/i);
            if (m) extractedPrompt = m[1];
          }

          if (extractedPrompt) {
            try {
              const generatedUrl = await aiProvider.generateImage({
                prompt: extractedPrompt,
                rawPrompt: extractedPrompt,
                aspectRatio: "1:1",
                style: "Photorealistic",
              });
              const imgMd = `![${extractedPrompt}](${generatedUrl})\n\nHere is your generated artwork for: "${extractedPrompt}".`;
              res.json({
                role: "assistant",
                content: imgMd,
                imageUrl: generatedUrl,
                generatedImage: {
                  imageUrl: generatedUrl,
                  prompt: extractedPrompt,
                  aspectRatio: "1:1",
                  style: "Photorealistic",
                  createdAt: Date.now(),
                },
                searchUsed: false,
              });
              return;
            } catch (err) {
              console.error("Error generating image from action payload:", err);
            }
          }
        }

        const finalReply = !isFounderQuery ? sanitizeExternalEntityResponse(reply) : reply;

        res.json({
          role: "assistant",
          content: finalReply,
          sources: extractedSources.length > 0 ? extractedSources : undefined,
          searchUsed: extractedSources.length > 0,
        });
      } catch (localErr: any) {
        console.warn("Local generateResponse failed, falling back to Cloud Run:", localErr?.message);
        try {
          await forwardToCloudRunBackend(
            {
              messages: validMessages,
              stream: false,
              systemPrompt: effectiveSystemPrompt,
              temperature,
              model,
              enableSearch: passSearchToModel,
              persona,
              searchSources,
              isExternalCompanyQuery: !isFounderQuery,
            },
            res
          );
        } catch (cloudErr: any) {
          const cleanErrorMessage = extractCleanErrorMessage(cloudErr || localErr);
          res.status(500).json({ error: cleanErrorMessage });
        }
      }
    }
  } catch (error: any) {
    const cleanErrorMessage = extractCleanErrorMessage(error);
    console.error("Chat API route error:", cleanErrorMessage);
    if (!res.headersSent) {
      res.status(500).json({
        error: cleanErrorMessage,
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: cleanErrorMessage, done: true })}\n\n`);
      res.end();
    }
  }
});

// Helper route to generate auto title
chatRouter.post("/title", async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    if (!aiProvider.isConfigured()) {
      res.json({ title: prompt.slice(0, 30) + (prompt.length > 30 ? "..." : "") });
      return;
    }

    const title = await aiProvider.generateResponse({
      messages: [
        {
          role: "user",
          content: `Create a brief, 3 to 6 word title summarizing this initial conversation prompt. Do NOT use quotes or punctuation: "${prompt.slice(
            0,
            300
          )}"`,
        },
      ],
      systemPrompt: "You generate ultra-concise 3-6 word chat titles. Output only the plain title text.",
      temperature: 0.2,
    });

    res.json({ title: title.replace(/["']/g, "").trim().slice(0, 40) });
  } catch (err) {
    res.json({ title: "New Conversation" });
  }
});

// Image generation endpoint
chatRouter.post("/image/generate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, aspectRatio = "1:1" } = req.body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      res.status(400).json({ error: "Prompt is required for image generation." });
      return;
    }

    if (!aiProvider.isConfigured()) {
      res.status(503).json({
        error: "Image generation requires GEMINI_API_KEY configured on the server.",
      });
      return;
    }

    const imageUrl = await aiProvider.generateImage({
      prompt: prompt.trim(),
      aspectRatio,
    });

    res.json({
      status: "ok",
      imageUrl,
      prompt: prompt.trim(),
      aspectRatio,
    });
  } catch (err: any) {
    const msg = extractCleanErrorMessage(err);
    res.status(500).json({ error: msg });
  }
});

// Web Search Tool API endpoint
chatRouter.post("/search", async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string") {
      res.status(400).json({ error: "Query is required." });
      return;
    }

    // Call aiProvider with search grounding to synthesize search results
    if (aiProvider.isConfigured()) {
      try {
        let extractedSources: Array<{ title: string; url: string; snippet?: string }> = [];
        const synthesis = await aiProvider.generateResponse({
          messages: [
            {
              role: "user",
              content: `Perform a factual web search and provide a synthesized factual summary for: "${query}". Include relevant facts and citations.`,
            },
          ],
          enableSearch: true,
          onSearchSources: (sources) => {
            extractedSources = sources;
          },
        });

        res.json({
          query,
          summary: synthesis,
          sources: extractedSources,
        });
        return;
      } catch (localErr) {
        console.warn("Local search synthesis failed, attempting Cloud Run fallback:", localErr);
      }
    }

    // Fallback via Cloud Run backend
    try {
      const cloudRes = await fetch(`${CLOUD_RUN_BACKEND}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: query }],
          stream: false,
          enableSearch: false,
          systemPrompt: `You are MEYRA AI Web Search assistant. Real-time live web search is currently unavailable. State clearly to the user in the language of their query that live search could not be completed and today's real-time information cannot be confirmed. Answer only with verified general knowledge without inventing current facts, weather, prices, or fake links.`,
        }),
      });

      if (cloudRes.ok) {
        const data = await cloudRes.json();
        res.json({
          query,
          summary: data.content || data.response || "Live web search could not be completed at this time.",
          sources: [],
        });
        return;
      }
    } catch {
      // ignore
    }

    res.json({
      query,
      summary: "Live web search could not be completed at this time as the search service is temporarily unavailable.",
      sources: [],
    });
  } catch (err: any) {
    res.status(500).json({ error: extractCleanErrorMessage(err) });
  }
});

// Feedback and Bug Report endpoint
chatRouter.post("/feedback", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      type = "Feedback",
      message,
      userEmail,
      userName,
      userId,
      targetEmail = ADMIN_EMAIL,
      appVersion = "2.0.0",
      platform = "Web / Android",
    } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({
        status: "error",
        message: "Message is required to submit feedback or report.",
      });
      return;
    }

    const feedbackEntry = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      message: message.trim(),
      userEmail: userEmail || "anonymous",
      userName: userName || "MEYRA User",
      userId: userId || "local_user",
      targetEmail,
      appVersion,
      platform,
      receivedAt: new Date().toISOString(),
    };

    inMemoryFeedbacks.unshift(feedbackEntry);
    if (inMemoryFeedbacks.length > 100) inMemoryFeedbacks.pop();

    console.log(
      `[POST /api/feedback] ✅ Received ${feedbackEntry.type} from ${feedbackEntry.userName} (${feedbackEntry.userEmail}) for ${feedbackEntry.targetEmail}: "${feedbackEntry.message.slice(0, 100)}..."`
    );

    res.json({
      status: "ok",
      id: feedbackEntry.id,
      message: "Feedback submitted successfully. Thank you for helping improve MEYRA AI.",
    });
  } catch (err: any) {
    console.error("Error processing feedback submission:", err);
    res.status(500).json({
      status: "error",
      message: "Internal server error while processing feedback.",
    });
  }
});

// Admin Stats & Health endpoint (Verified with owner email himanshu22maurya22@gmail.com)
chatRouter.get("/admin/stats", async (req: Request, res: Response): Promise<void> => {
  const requestEmail = req.query.email as string;

  if (!requestEmail || requestEmail.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase()) {
    res.status(403).json({
      error: "Access denied. Only the platform creator (Himanshu Maurya) has administrative access.",
    });
    return;
  }

  const uptimeSeconds = Math.floor((Date.now() - appStartTime) / 1000);

  res.json({
    authorized: true,
    owner: "Himanshu Maurya",
    email: ADMIN_EMAIL,
    uptimeSeconds,
    uptimeHuman: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    version: "2.0.0",
    geminiConfigured: aiProvider.isConfigured(),
    cloudRunBridge: CLOUD_RUN_BACKEND,
    feedbacksCount: inMemoryFeedbacks.length,
    recentFeedbacks: inMemoryFeedbacks.slice(0, 10),
    systemHealth: "healthy",
    activeFeatures: [
      "Gemini 3 Flash",
      "Multimodal Vision",
      "Document Analysis",
      "MEYRA Memory System",
      "AI Personas",
      "Voice Conversation & TTS",
      "Coding Workspace",
      "MEYRA Projects & Files",
      "Web Search Grounding",
    ],
  });
});
