import { Router, Request, Response } from "express";
import { aiProvider, ChatMessagePayload, extractCleanErrorMessage } from "../services/aiProvider";

export const chatRouter = Router();

// Health & configuration check endpoint
chatRouter.get("/status", (req: Request, res: Response) => {
  const isConfigured = aiProvider.isConfigured();
  res.json({
    status: "ok",
    appName: "MEYRA AI",
    version: "1.0.0",
    isConfigured,
    model: "gemini-3.1-flash-lite",
    message: isConfigured
      ? "MEYRA AI is online and connected to Gemini API."
      : "No API key configured. Please set GEMINI_API_KEY in environment variables.",
  });
});

// Chat completion endpoint (supporting both SSE streaming & standard response)
chatRouter.post("/chat", async (req: Request, res: Response): Promise<void> => {
  console.log(`[POST /api/chat] Received request: stream=${req.body?.stream}, messagesCount=${req.body?.messages?.length}`);
  try {
    const { messages, stream = true, systemPrompt, temperature, model } = req.body;

    // Input Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        error: "Invalid request payload. 'messages' array is required and cannot be empty.",
      });
      return;
    }

    // Validate message structure
    const validMessages: ChatMessagePayload[] = [];
    for (const msg of messages) {
      if (
        msg &&
        typeof msg.content === "string" &&
        (msg.role === "user" || msg.role === "assistant" || msg.role === "system")
      ) {
        validMessages.push({
          role: msg.role,
          content: msg.content.trim(),
        });
      }
    }

    if (validMessages.length === 0) {
      res.status(400).json({
        error: "No valid messages provided in the conversation payload.",
      });
      return;
    }

    // Check if API key is set
    if (!aiProvider.isConfigured()) {
      res.status(401).json({
        error:
          "[401 UNAUTHENTICATED] MEYRA AI: GEMINI_API_KEY is missing. Please configure GEMINI_API_KEY in your environment variables.",
        code: "MISSING_API_KEY",
      });
      return;
    }

    if (stream) {
      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Content-Encoding", "none");
      res.flushHeaders?.();

      try {
        await aiProvider.generateStream(
          {
            messages: validMessages,
            systemPrompt,
            temperature,
            model,
          },
          (chunk: string) => {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ text: chunk, done: false })}\n\n`);
            }
          }
        );

        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ text: "", done: true })}\n\n`);
        }
      } catch (streamErr: any) {
        const cleanErrorMessage = extractCleanErrorMessage(streamErr);
        console.error("Stream generation error:", cleanErrorMessage);
        if (!res.writableEnded) {
          res.write(
            `data: ${JSON.stringify({ error: cleanErrorMessage, done: true })}\n\n`
          );
        }
      } finally {
        if (!res.writableEnded) {
          res.end();
        }
      }
    } else {
      // Non-streaming response
      const reply = await aiProvider.generateResponse({
        messages: validMessages,
        systemPrompt,
        temperature,
        model,
      });

      res.json({
        role: "assistant",
        content: reply,
      });
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
