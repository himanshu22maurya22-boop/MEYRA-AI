import { Router, Request, Response } from "express";
import { aiProvider } from "../services/aiProvider";
import { authenticateUser } from "../middleware/auth";
import { generateSynthesizedArtwork } from "../services/imageSynthesizer";
import { imageRateLimiter, getClientIp } from "../middleware/rateLimiter";
import { logSecurityEvent } from "../services/securityLogger";

export const imageRouter = Router();

imageRouter.use(imageRateLimiter);

// Store generated images per user in-memory for server session library
export interface GeneratedImageItem {
  id: string;
  userId: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: string;
  style?: string;
  createdAt: number;
}

const userImagesMap = new Map<string, GeneratedImageItem[]>();

function resolveUserId(req: Request, user: any): string {
  if (user && user.id) {
    return user.id;
  }
  const clientIp = getClientIp(req);
  return `guest_${Buffer.from(clientIp).toString("base64url").slice(0, 16)}`;
}

/**
 * POST /api/image/generate
 * Generates an image using server-side Gemini image models.
 * Strictly never exposes API keys to client.
 */
imageRouter.post("/generate", async (req: Request, res: Response): Promise<void> => {
  const { prompt, aspectRatio = "1:1", style = "default" } = req.body || {};

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "Prompt is required to generate an image." });
    return;
  }

  const cleanPrompt = prompt.replace(/[<>]/g, "").trim();
  if (cleanPrompt.length > 2000) {
    res.status(400).json({ error: "Image prompt exceeds maximum allowed length (2,000 characters)." });
    return;
  }

  const allowedAspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];
  const safeAspectRatio = allowedAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";

  const user = await authenticateUser(req);
  const userId = resolveUserId(req, user);

  // IDOR check: if client sent foreign userId, log security event
  if (req.body?.userId && req.body.userId !== userId) {
    logSecurityEvent("IDOR_ATTEMPT_BLOCKED", {
      ip: getClientIp(req),
      userId,
      resource: "image",
      action: "generate",
      reason: `Client attempted to assign image generation to foreign userId: ${String(req.body.userId).slice(0, 20)}`,
    });
  }

  try {
    let finalPrompt = cleanPrompt;
    const normalizedStyle = (typeof style === "string" ? style : "").toLowerCase().slice(0, 50);
    if (normalizedStyle.includes("photo") || normalizedStyle.includes("realistic")) {
      finalPrompt = `${cleanPrompt}, ultra-realistic 8k photograph, natural cinematic lighting, highly detailed`;
    } else if (normalizedStyle.includes("anime")) {
      finalPrompt = `${cleanPrompt}, Japanese anime aesthetic, vibrant illustration, detailed line art, masterpiece`;
    } else if (normalizedStyle.includes("3d") || normalizedStyle.includes("render")) {
      finalPrompt = `${cleanPrompt}, 3D octane render, ray-tracing, volumetric lighting, smooth surfaces, digital art`;
    } else if (normalizedStyle.includes("cinematic")) {
      finalPrompt = `${cleanPrompt}, dramatic cinematic film still, 35mm lens, moody lighting, wide-angle cinematic shot`;
    } else if (normalizedStyle.includes("minimalist")) {
      finalPrompt = `${cleanPrompt}, minimalist graphic design, clean lines, elegant color palette, high contrast`;
    } else if (normalizedStyle.includes("digital") || normalizedStyle.includes("art")) {
      finalPrompt = `${cleanPrompt}, digital concept art, vibrant color palette, dynamic composition`;
    }

    // Call server AI Provider
    const imageUrl = await aiProvider.generateImage({
      prompt: finalPrompt,
      rawPrompt: cleanPrompt,
      aspectRatio: safeAspectRatio,
      style: normalizedStyle,
    });

    const imageItem: GeneratedImageItem = {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      prompt: cleanPrompt,
      imageUrl,
      aspectRatio: safeAspectRatio,
      style: normalizedStyle,
      createdAt: Date.now(),
    };

    // Store in user library
    const userList = userImagesMap.get(userId) || [];
    userList.unshift(imageItem);
    if (userList.length > 50) userList.pop();
    userImagesMap.set(userId, userList);

    res.json({
      status: "ok",
      imageUrl,
      prompt: cleanPrompt,
      aspectRatio: safeAspectRatio,
      style: normalizedStyle,
      image: imageItem,
    });
  } catch (err: any) {
    try {
      const fallbackUrl = await generateSynthesizedArtwork({
        prompt: cleanPrompt,
        aspectRatio: safeAspectRatio,
        style: String(style || "default"),
      });

      const fallbackItem: GeneratedImageItem = {
        id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        prompt: cleanPrompt,
        imageUrl: fallbackUrl,
        aspectRatio: safeAspectRatio,
        style: String(style || "default"),
        createdAt: Date.now(),
      };

      const userList = userImagesMap.get(userId) || [];
      userList.unshift(fallbackItem);
      if (userList.length > 50) userList.pop();
      userImagesMap.set(userId, userList);

      res.json({
        status: "ok",
        imageUrl: fallbackUrl,
        prompt: cleanPrompt,
        aspectRatio: safeAspectRatio,
        style: String(style || "default"),
        image: fallbackItem,
        notice: "Generated using MEYRA Art Synthesizer.",
      });
    } catch {
      res.status(500).json({
        error: "Failed to generate image. Please check your prompt and try again.",
      });
    }
  }
});

/**
 * GET /api/image/library
 * Returns saved images isolated for the authenticated user.
 */
imageRouter.get("/library", async (req: Request, res: Response): Promise<void> => {
  const user = await authenticateUser(req);
  const userId = resolveUserId(req, user);

  if (req.query.userId && req.query.userId !== userId) {
    logSecurityEvent("IDOR_ATTEMPT_BLOCKED", {
      ip: getClientIp(req),
      userId,
      resource: "image",
      action: "library",
      reason: `Client attempted to query foreign userId: ${String(req.query.userId).slice(0, 20)}`,
    });
  }

  const list = userImagesMap.get(userId) || [];
  res.json({
    status: "ok",
    userId: user ? "authenticated_user" : "guest",
    count: list.length,
    images: list,
  });
});

/**
 * DELETE /api/image/:id
 * Deletes a saved image owned strictly by the authenticated user.
 */
imageRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const user = await authenticateUser(req);
  const userId = resolveUserId(req, user);
  const { id } = req.params;

  if (!id || !/^[a-zA-Z0-9_\-]{1,64}$/.test(id)) {
    res.status(400).json({ error: "Invalid image identifier format." });
    return;
  }

  const userList = userImagesMap.get(userId) || [];
  const existingIdx = userList.findIndex((img) => img.id === id);

  if (existingIdx === -1) {
    logSecurityEvent("IDOR_ATTEMPT_BLOCKED", {
      ip: getClientIp(req),
      userId,
      resource: "image",
      action: "delete",
      reason: `Image ID ${id} not found in user's isolated collection`,
    });
    res.status(404).json({ error: "Image not found or unauthorized." });
    return;
  }

  userList.splice(existingIdx, 1);
  userImagesMap.set(userId, userList);

  res.json({ status: "ok", deletedId: id });
});
