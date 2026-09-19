import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { chatRouter } from "./server/routes/chat";
import { authRouter } from "./server/routes/auth";
import { adminRouter } from "./server/routes/admin";
import { memoryRouter } from "./server/routes/memory";
import { imageRouter } from "./server/routes/image";
import { voiceRouter } from "./server/routes/voice";
import { resourcesRouter } from "./server/routes/resources";

// Load environment variables
dotenv.config();

// Ensure GEMINI_API_KEY is loaded and verified in server.ts
const serverApiKey =
  process.env.GEMINI_API_KEY ||
  process.env.AI_API_KEY ||
  process.env.AI_API_key;

if (serverApiKey) {
  console.log("✅ GEMINI_API_KEY detected and loaded successfully in server.ts");
} else {
  console.log("ℹ️ Running in Cloud Run bridge mode with fallback to secure Cloud Run backend");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security: Disable Express fingerprinting header
  app.disable("x-powered-by");

  // Basic security & parsing middleware
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Defensive HTTP Headers & Permissions-Policy
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Prevent MIME sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");
    // Cross-origin and referrer security
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Explicitly allow microphone and camera for MEYRA AI origin and self
    res.setHeader(
      "Permissions-Policy",
      'microphone=(self "https://meyra-ai-804674901589.asia-southeast1.run.app" "https://ais-dev-wchgur6747xxdop4tgptsu-645177094277.asia-east1.run.app" "https://ais-pre-wchgur6747xxdop4tgptsu-645177094277.asia-east1.run.app"), camera=(self "https://meyra-ai-804674901589.asia-southeast1.run.app" "https://ais-dev-wchgur6747xxdop4tgptsu-645177094277.asia-east1.run.app" "https://ais-pre-wchgur6747xxdop4tgptsu-645177094277.asia-east1.run.app")'
    );

    // Legacy Feature-Policy for older Chromium/Android WebView clients
    res.setHeader(
      "Feature-Policy",
      "microphone 'self' https://meyra-ai-804674901589.asia-southeast1.run.app https://ais-dev-wchgur6747xxdop4tgptsu-645177094277.asia-east1.run.app https://ais-pre-wchgur6747xxdop4tgptsu-645177094277.asia-east1.run.app; camera 'self' https://meyra-ai-804674901589.asia-southeast1.run.app https://ais-dev-wchgur6747xxdop4tgptsu-645177094277.asia-east1.run.app https://ais-pre-wchgur6747xxdop4tgptsu-645177094277.asia-east1.run.app"
    );

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // API Routes
  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/memory", memoryRouter);
  app.use("/api/image", imageRouter);
  app.use("/api", resourcesRouter);
  app.use("/api", voiceRouter);
  app.use("/api", chatRouter);

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Global error handler: prevent stack trace and internals leakage
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled API Error:", err?.message || err);
    if (res.headersSent) return;
    res.status(err?.status || 500).json({
      error: "An unexpected server error occurred. Please try again later.",
      status: "error",
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 MEYRA AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start MEYRA AI server:", err);
  process.exit(1);
});
