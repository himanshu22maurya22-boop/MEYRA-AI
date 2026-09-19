import { Router, Request, Response } from "express";
import crypto from "crypto";
import path from "path";
import { requireAuth } from "../middleware/auth";
import { logSecurityEvent } from "../services/securityLogger";
import { getClientIp, fileUploadLimiter, generalApiLimiter } from "../middleware/rateLimiter";

export const resourcesRouter = Router();

// Require authenticated session for all resource endpoints
resourcesRouter.use(requireAuth);

// Data structures for user-isolated server storage
interface StoredConversation {
  id: string;
  userId: string;
  title: string;
  projectId?: string;
  messages: any[];
  createdAt: number;
  updatedAt: number;
}

interface StoredFile {
  id: string;
  userId: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  projectId?: string;
  contentSnippet?: string;
  dataBase64?: string;
  createdAt: number;
}

interface StoredProject {
  id: string;
  userId: string;
  name: string;
  description: string;
  instructions: string;
  icon: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

// User-isolated in-memory stores
const conversationsByUser = new Map<string, Map<string, StoredConversation>>();
const filesByUser = new Map<string, Map<string, StoredFile>>();
const projectsByUser = new Map<string, Map<string, StoredProject>>();

// Allowed safe file extensions (Strictly no executables or server-side scripts)
const ALLOWED_EXTENSIONS = new Set([
  "txt", "md", "csv", "json", "pdf", "xml", "yaml", "yml", "log",
  "jpg", "jpeg", "png", "gif", "webp", "svg",
  "ts", "tsx", "js", "jsx", "html", "css", "py", "java", "c", "cpp", "go", "rs", "sql"
]);

const DANGEROUS_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "bash", "ps1", "vbs", "jar", "war", "ear",
  "phtml", "php", "phar", "asp", "aspx", "jsp", "cgi", "pl", "com", "msi", "scr", "dll", "so"
]);

function sanitizeFilename(filename: string): string {
  // Strip null bytes, path traversal sequences, and normalize
  const clean = path.basename(filename).replace(/\0/g, "").replace(/\.\./g, "").trim();
  return clean.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

// ==========================================
// 1. CONVERSATIONS ENDPOINTS
// ==========================================

resourcesRouter.get("/conversations", generalApiLimiter, (req: Request, res: Response) => {
  const user = (req as any).user;
  const userConvs = conversationsByUser.get(user.id);
  const list = userConvs ? Array.from(userConvs.values()) : [];
  res.json({ conversations: list });
});

resourcesRouter.get("/conversations/:id", generalApiLimiter, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  if (!id || !/^[a-zA-Z0-9_\-]{1,64}$/.test(id)) {
    res.status(400).json({ error: "Invalid conversation ID format." });
    return;
  }

  const userConvs = conversationsByUser.get(user.id);
  const conversation = userConvs?.get(id);

  if (!conversation) {
    logSecurityEvent("IDOR_ATTEMPT_BLOCKED", {
      ip: getClientIp(req),
      userId: user.id,
      resource: "conversation",
      action: "read",
      reason: `Conversation ${id} not found in authenticated user's workspace`,
    });
    res.status(404).json({ error: "Conversation not found or access denied." });
    return;
  }

  res.json({ conversation });
});

resourcesRouter.post("/conversations", generalApiLimiter, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id, title, messages = [], projectId } = req.body;

  const convId = id && /^[a-zA-Z0-9_\-]{1,64}$/.test(id) ? id : `conv_${crypto.randomUUID()}`;
  const cleanTitle = (typeof title === "string" ? title : "New Conversation")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 100);

  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "Messages must be an array." });
    return;
  }

  if (messages.length > 200) {
    res.status(400).json({ error: "Conversation exceeds maximum message limit (200)." });
    return;
  }

  let userConvs = conversationsByUser.get(user.id);
  if (!userConvs) {
    userConvs = new Map();
    conversationsByUser.set(user.id, userConvs);
  }

  const existing = userConvs.get(convId);
  const conversation: StoredConversation = {
    id: convId,
    userId: user.id, // Strictly server-assigned
    title: cleanTitle,
    projectId: projectId && /^[a-zA-Z0-9_\-]{1,64}$/.test(projectId) ? projectId : undefined,
    messages: messages.slice(0, 200),
    createdAt: existing ? existing.createdAt : Date.now(),
    updatedAt: Date.now(),
  };

  userConvs.set(convId, conversation);
  res.json({ status: "ok", conversation });
});

resourcesRouter.delete("/conversations/:id", generalApiLimiter, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  if (!id || !/^[a-zA-Z0-9_\-]{1,64}$/.test(id)) {
    res.status(400).json({ error: "Invalid conversation ID format." });
    return;
  }

  const userConvs = conversationsByUser.get(user.id);
  if (!userConvs || !userConvs.has(id)) {
    logSecurityEvent("IDOR_ATTEMPT_BLOCKED", {
      ip: getClientIp(req),
      userId: user.id,
      resource: "conversation",
      action: "delete",
      reason: `Conversation ${id} does not belong to user`,
    });
    res.status(404).json({ error: "Conversation not found or access denied." });
    return;
  }

  userConvs.delete(id);
  res.json({ status: "ok", deletedId: id });
});

// ==========================================
// 2. FILES ENDPOINTS
// ==========================================

resourcesRouter.get("/files", generalApiLimiter, (req: Request, res: Response) => {
  const user = (req as any).user;
  const userFiles = filesByUser.get(user.id);
  const list = userFiles ? Array.from(userFiles.values()) : [];
  res.json({ files: list });
});

resourcesRouter.get("/files/:id", generalApiLimiter, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  if (!id || !/^[a-zA-Z0-9_\-]{1,64}$/.test(id)) {
    res.status(400).json({ error: "Invalid file ID format." });
    return;
  }

  const userFiles = filesByUser.get(user.id);
  const file = userFiles?.get(id);

  if (!file) {
    logSecurityEvent("IDOR_ATTEMPT_BLOCKED", {
      ip: getClientIp(req),
      userId: user.id,
      resource: "file",
      action: "read",
      reason: `File ${id} not found in authenticated user's repository`,
    });
    res.status(404).json({ error: "File not found or access denied." });
    return;
  }

  res.json({ file });
});

resourcesRouter.post("/files/upload", fileUploadLimiter, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { name, size, type, dataBase64, projectId } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Filename is required." });
    return;
  }

  // Security: Prevent path traversal in filename
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    logSecurityEvent("PATH_TRAVERSAL_BLOCKED", {
      ip: getClientIp(req),
      userId: user.id,
      resource: "file",
      action: "upload",
      reason: `Attempted path traversal in filename: ${name}`,
    });
    res.status(400).json({ error: "Invalid filename: path traversal sequences are prohibited." });
    return;
  }

  const safeName = sanitizeFilename(name);
  const ext = safeName.split(".").pop()?.toLowerCase() || "";

  // Check dangerous extensions
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    logSecurityEvent("MALICIOUS_PAYLOAD_BLOCKED", {
      ip: getClientIp(req),
      userId: user.id,
      resource: "file",
      action: "upload",
      reason: `Disallowed executable extension: .${ext}`,
    });
    res.status(400).json({ error: `File type .${ext} is prohibited for security reasons.` });
    return;
  }

  // Enforce server-side file size limit: 10MB max
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (typeof size === "number" && size > MAX_FILE_SIZE) {
    res.status(413).json({ error: "File exceeds maximum allowed size of 10MB." });
    return;
  }

  if (dataBase64 && typeof dataBase64 === "string") {
    const approximateSize = (dataBase64.length * 3) / 4;
    if (approximateSize > MAX_FILE_SIZE) {
      res.status(413).json({ error: "Payload exceeds maximum allowed size of 10MB." });
      return;
    }
  }

  let userFiles = filesByUser.get(user.id);
  if (!userFiles) {
    userFiles = new Map();
    filesByUser.set(user.id, userFiles);
  }

  const fileId = `file_${crypto.randomUUID()}`;
  const storedFile: StoredFile = {
    id: fileId,
    userId: user.id,
    name: safeName,
    size: Number(size) || 0,
    type: typeof type === "string" ? type.slice(0, 50) : "application/octet-stream",
    extension: ext,
    projectId: projectId && /^[a-zA-Z0-9_\-]{1,64}$/.test(projectId) ? projectId : undefined,
    dataBase64: typeof dataBase64 === "string" ? dataBase64 : undefined,
    createdAt: Date.now(),
  };

  userFiles.set(fileId, storedFile);
  res.json({ status: "ok", file: storedFile });
});

resourcesRouter.delete("/files/:id", generalApiLimiter, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  if (!id || !/^[a-zA-Z0-9_\-]{1,64}$/.test(id)) {
    res.status(400).json({ error: "Invalid file ID format." });
    return;
  }

  const userFiles = filesByUser.get(user.id);
  if (!userFiles || !userFiles.has(id)) {
    logSecurityEvent("IDOR_ATTEMPT_BLOCKED", {
      ip: getClientIp(req),
      userId: user.id,
      resource: "file",
      action: "delete",
      reason: `File ${id} not found or unauthorized`,
    });
    res.status(404).json({ error: "File not found or access denied." });
    return;
  }

  userFiles.delete(id);
  res.json({ status: "ok", deletedId: id });
});

// ==========================================
// 3. PROJECTS ENDPOINTS
// ==========================================

resourcesRouter.get("/projects", generalApiLimiter, (req: Request, res: Response) => {
  const user = (req as any).user;
  const userProjects = projectsByUser.get(user.id);
  const list = userProjects ? Array.from(userProjects.values()) : [];
  res.json({ projects: list });
});

resourcesRouter.get("/projects/:id", generalApiLimiter, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  if (!id || !/^[a-zA-Z0-9_\-]{1,64}$/.test(id)) {
    res.status(400).json({ error: "Invalid project ID format." });
    return;
  }

  const userProjects = projectsByUser.get(user.id);
  const project = userProjects?.get(id);

  if (!project) {
    logSecurityEvent("IDOR_ATTEMPT_BLOCKED", {
      ip: getClientIp(req),
      userId: user.id,
      resource: "project",
      action: "read",
      reason: `Project ${id} not found in user's workspace`,
    });
    res.status(404).json({ error: "Project not found or access denied." });
    return;
  }

  res.json({ project });
});

resourcesRouter.post("/projects", generalApiLimiter, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id, name, description = "", instructions = "", icon = "folder", color = "#6366f1" } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Project name is required." });
    return;
  }

  const cleanName = name.replace(/[<>]/g, "").trim().slice(0, 100);
  const cleanDesc = (typeof description === "string" ? description : "").replace(/[<>]/g, "").trim().slice(0, 500);
  const cleanInst = (typeof instructions === "string" ? instructions : "").trim().slice(0, 5000);

  const projId = id && /^[a-zA-Z0-9_\-]{1,64}$/.test(id) ? id : `proj_${crypto.randomUUID()}`;

  let userProjects = projectsByUser.get(user.id);
  if (!userProjects) {
    userProjects = new Map();
    projectsByUser.set(user.id, userProjects);
  }

  const existing = userProjects.get(projId);
  const project: StoredProject = {
    id: projId,
    userId: user.id,
    name: cleanName,
    description: cleanDesc,
    instructions: cleanInst,
    icon: typeof icon === "string" ? icon.slice(0, 30) : "folder",
    color: typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#6366f1",
    createdAt: existing ? existing.createdAt : Date.now(),
    updatedAt: Date.now(),
  };

  userProjects.set(projId, project);
  res.json({ status: "ok", project });
});

resourcesRouter.delete("/projects/:id", generalApiLimiter, (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;

  if (!id || !/^[a-zA-Z0-9_\-]{1,64}$/.test(id)) {
    res.status(400).json({ error: "Invalid project ID format." });
    return;
  }

  const userProjects = projectsByUser.get(user.id);
  if (!userProjects || !userProjects.has(id)) {
    logSecurityEvent("IDOR_ATTEMPT_BLOCKED", {
      ip: getClientIp(req),
      userId: user.id,
      resource: "project",
      action: "delete",
      reason: `Project ${id} does not belong to user`,
    });
    res.status(404).json({ error: "Project not found or access denied." });
    return;
  }

  userProjects.delete(id);
  res.json({ status: "ok", deletedId: id });
});

// ==========================================
// 4. USER PROFILE (SERVER-DERIVED)
// ==========================================

resourcesRouter.get("/profile", generalApiLimiter, (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    photoUrl: user.photoUrl,
    role: user.role,
    provider: user.provider,
  });
});
