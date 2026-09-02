import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { chatRouter } from "./server/routes/chat";

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
  console.warn("⚠️ Warning: GEMINI_API_KEY is not currently set in environment variables");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic security & parsing middleware
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use("/api", chatRouter);

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
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
