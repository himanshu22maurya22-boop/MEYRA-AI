import { Router, Request, Response } from "express";
import { authenticateUser } from "../middleware/auth";
import { logSecurityEvent } from "../services/securityLogger";
import { getClientIp, generalApiLimiter } from "../middleware/rateLimiter";

export const memoryRouter = Router();

memoryRouter.use(generalApiLimiter);

export interface ServerMemoryItem {
  id: string;
  userId: string;
  userEmail: string;
  text: string;
  category: "preference" | "fact" | "instruction" | "general";
  createdAt: number;
  updatedAt: number;
}

// In-memory user-isolated memory store for server persistence
const userMemoriesMap = new Map<string, ServerMemoryItem[]>();

/**
 * Checks if input text contains potential credentials or secrets.
 * Strictly prevents storing passwords, tokens, or API keys in memory.
 */
export function containsSensitiveCredentials(text: string): { sensitive: boolean; reason?: string } {
  if (!text) return { sensitive: false };

  const patterns = [
    { regex: /AIzaSy[A-Za-z0-9_-]{30,}/i, reason: "Google API Key detected" },
    { regex: /gh[pousr]_[A-Za-z0-9_]{30,}/i, reason: "GitHub Personal Access Token detected" },
    { regex: /sk-[a-zA-Z0-9]{20,}/i, reason: "API Secret Key detected" },
    { regex: /-----BEGIN[A-Z\s]+PRIVATE\s+KEY-----/i, reason: "Private Key block detected" },
    {
      regex: /(password|client_secret|api_key|secret_key)\s*[:=]\s*['"]?[^\s'"]{4,}['"]?/i,
      reason: "Password or Secret assignment detected",
    },
  ];

  for (const { regex, reason } of patterns) {
    if (regex.test(text)) {
      return { sensitive: true, reason };
    }
  }

  return { sensitive: false };
}

/**
 * Derives authenticated user ID or isolates guest requests.
 * Strictly ignores client-supplied userId in query or body.
 */
function resolveUserId(req: Request, user: any): string {
  if (user && user.id) {
    return user.id;
  }
  // For unauthenticated/guest sessions, bind to remote IP/guest fingerprint
  const clientIp = getClientIp(req);
  return `guest_${Buffer.from(clientIp).toString("base64url").slice(0, 16)}`;
}

/**
 * GET /api/memory
 * Retrieves memories strictly isolated for the authenticated user.
 */
memoryRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  const user = await authenticateUser(req);
  const userId = resolveUserId(req, user);

  // Security check: If caller attempted to inject an unauthorized userId, log and block
  if (req.query.userId && req.query.userId !== userId) {
    logSecurityEvent("IDOR_ATTEMPT_BLOCKED", {
      ip: getClientIp(req),
      userId,
      resource: "memory",
      action: "read",
      reason: `Client attempted to query foreign userId: ${String(req.query.userId).slice(0, 20)}`,
    });
  }

  const list = userMemoriesMap.get(userId) || [];
  res.json({
    status: "ok",
    userId: user ? "authenticated_user" : "guest",
    count: list.length,
    memories: list,
  });
});

/**
 * POST /api/memory
 * Saves a memory item with strict credential scrubbing and per-user isolation.
 */
memoryRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  const user = await authenticateUser(req);
  const userId = resolveUserId(req, user);
  const { text, category = "preference", id } = req.body;

  if (!text || typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "Memory text is required." });
    return;
  }

  if (text.length > 2000) {
    res.status(400).json({ error: "Memory text exceeds maximum allowed length (2,000 characters)." });
    return;
  }

  const validCategories = ["preference", "fact", "instruction", "general"];
  const safeCategory = validCategories.includes(category) ? category : "preference";

  // Validate ID format if provided
  if (id && (typeof id !== "string" || !/^[a-zA-Z0-9_\-]{1,64}$/.test(id))) {
    res.status(400).json({ error: "Invalid memory identifier format." });
    return;
  }

  // Security check: Scrub sensitive credentials
  const check = containsSensitiveCredentials(text);
  if (check.sensitive) {
    logSecurityEvent("INPUT_VALIDATION_FAILURE", {
      ip: getClientIp(req),
      userId,
      resource: "memory",
      action: "write",
      reason: check.reason,
    });
    res.status(400).json({
      error: `Security Policy Violation: For your protection, MEYRA AI strictly refuses to store passwords, API keys, or authentication secrets in memory (${check.reason}).`,
    });
    return;
  }

  // Check for IDOR spoofing attempt in request body
  if (req.body.userId && req.body.userId !== userId) {
    logSecurityEvent("IDOR_ATTEMPT_BLOCKED", {
      ip: getClientIp(req),
      userId,
      resource: "memory",
      action: "create",
      reason: `Client attempted to assign memory to foreign userId: ${String(req.body.userId).slice(0, 20)}`,
    });
  }

  const userEmail = user ? user.email : "guest";
  const memoryId = id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const cleanText = text.replace(/<[^>]+>/g, "").trim().slice(0, 2000);

  const item: ServerMemoryItem = {
    id: memoryId,
    userId,
    userEmail,
    text: cleanText,
    category: safeCategory as any,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const userList = userMemoriesMap.get(userId) || [];
  const existingIdx = userList.findIndex((m) => m.id === memoryId);

  if (existingIdx >= 0) {
    userList[existingIdx] = { ...userList[existingIdx], ...item, updatedAt: Date.now() };
  } else {
    userList.unshift(item);
  }

  // Limit per user to 100 memories
  if (userList.length > 100) userList.pop();
  userMemoriesMap.set(userId, userList);

  res.json({
    status: "ok",
    memory: item,
  });
});

/**
 * DELETE /api/memory/:id
 * Deletes a single memory owned by the user. Prevents IDOR.
 */
memoryRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const user = await authenticateUser(req);
  const userId = resolveUserId(req, user);
  const { id } = req.params;

  if (!id || !/^[a-zA-Z0-9_\-]{1,64}$/.test(id)) {
    res.status(400).json({ error: "Invalid memory identifier format." });
    return;
  }

  const userList = userMemoriesMap.get(userId) || [];
  const existingIdx = userList.findIndex((m) => m.id === id);

  if (existingIdx === -1) {
    logSecurityEvent("IDOR_ATTEMPT_BLOCKED", {
      ip: getClientIp(req),
      userId,
      resource: "memory",
      action: "delete",
      reason: `Memory ID ${id} not found in user's isolated collection`,
    });
    res.status(404).json({ error: "Memory item not found or unauthorized." });
    return;
  }

  userList.splice(existingIdx, 1);
  userMemoriesMap.set(userId, userList);

  res.json({ status: "ok", deletedId: id });
});

/**
 * DELETE /api/memory
 * Clears all memories for the authenticated user.
 */
memoryRouter.delete("/", async (req: Request, res: Response): Promise<void> => {
  const user = await authenticateUser(req);
  const userId = resolveUserId(req, user);

  userMemoriesMap.set(userId, []);
  res.json({ status: "ok", message: "All memories cleared." });
});
