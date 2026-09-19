import { Router, Request, Response } from "express";
import { requireFounderAdmin, getFounderEmail } from "../middleware/auth";
import { adminRateLimiter } from "../middleware/rateLimiter";
import { aiProvider } from "../services/aiProvider";

export const adminRouter = Router();

// Apply strict rate limiting to all administrative endpoints
adminRouter.use(adminRateLimiter);

const appStartTime = Date.now();

// Store in-memory feedbacks for admin audit
export const inMemoryFeedbacks: any[] = [];

/**
 * Server-side Founder Verification endpoint.
 * Requires valid Google Token belonging to the founder account.
 */
adminRouter.get("/verify", requireFounderAdmin, (req: Request, res: Response) => {
  const adminUser = (req as any).adminUser;
  res.json({
    authorized: true,
    badge: "VERIFIED",
    founder: "Himanshu Maurya",
    email: getFounderEmail(),
    authenticatedAs: adminUser.email,
    verifiedAt: Date.now(),
    role: "Founder & Creator",
  });
});

/**
 * Protected Admin Stats & Telemetry.
 * Enforces server-side authentication and founder authorization.
 */
adminRouter.get("/stats", requireFounderAdmin, (_req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - appStartTime) / 1000);
  const founderEmail = getFounderEmail();

  res.json({
    authorized: true,
    owner: "Himanshu Maurya",
    email: founderEmail,
    uptimeSeconds,
    uptimeHuman: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor(
      (uptimeSeconds % 3600) / 60
    )}m ${uptimeSeconds % 60}s`,
    version: "2.0.0",
    geminiConfigured: aiProvider.isConfigured(),
    cloudRunBridge: "https://meyra-ai-804674901589.asia-southeast1.run.app",
    feedbacksCount: inMemoryFeedbacks.length,
    recentFeedbacks: inMemoryFeedbacks.slice(0, 10),
    systemHealth: "healthy",
    activeFeatures: [
      "Gemini 3 Flash",
      "Multimodal Vision",
      "Document Analysis",
      "MEYRA Memory System (Encrypted & Isolated)",
      "MEYRA AI Image Studio",
      "AI Personas",
      "Voice Mode & Speech Recognition",
      "Coding Workspace",
      "MEYRA Projects & Files",
      "Web Search Grounding",
    ],
  });
});
