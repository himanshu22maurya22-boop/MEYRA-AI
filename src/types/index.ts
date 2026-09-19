export type Role = "user" | "assistant" | "system";

export type MessageStatus = "idle" | "sending" | "streaming" | "completed" | "error";

export interface MessageAttachment {
  id: string;
  type: "image" | "document";
  name: string;
  mimeType: string;
  size: number;
  dataUrl?: string; // base64 or blob preview
  extractedText?: string; // For text-based documents
}

export interface SearchSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface GeneratedImagePayload {
  imageUrl: string;
  prompt: string;
  aspectRatio?: string;
  style?: string;
  createdAt?: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  status?: MessageStatus;
  errorMessage?: string;
  model?: string;
  attachments?: MessageAttachment[];
  searchUsed?: boolean;
  searchSources?: SearchSource[];
  persona?: AIPersona;
  agent?: AIAgentType;
  generatedImage?: GeneratedImagePayload;
  isImageGenerating?: boolean;
}

export interface UserProfile {
  id: string; // Unique authenticated User ID
  name: string; // Display name
  username?: string; // Unique username (e.g., alex_99)
  email: string;
  photoUrl?: string;
  provider: "google" | "email_otp";
  createdAt?: number;
  lastLoginAt: number;
  role?: "user" | "admin";
  authToken?: string; // Authenticated session token
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  userId?: string;
  systemPrompt?: string;
  temperature?: number;
  isPinned?: boolean;
  projectId?: string;
  persona?: AIPersona;
}

export type ThemeMode = "dark" | "light" | "system";
export type FontSize = "sm" | "md" | "lg";

export type AIPersona =
  | "fast"
  | "friendly"
  | "study"
  | "coding"
  | "writing"
  | "deep-think";

export interface PersonaConfig {
  id: AIPersona;
  label: string;
  tagline: string;
  systemInstruction: string;
  temperature: number;
  icon: string;
  color: string;
}

export interface MemoryItem {
  id: string;
  userId: string;
  text: string;
  category: "preference" | "fact" | "instruction" | "general";
  createdAt: number;
  updatedAt: number;
}

export interface ProjectItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  instructions: string;
  fileIds: string[];
  conversationIds: string[];
  createdAt: number;
  updatedAt: number;
  isArchived?: boolean;
}

export interface FileItem {
  id: string;
  userId: string;
  name: string;
  type: "image" | "document" | "code" | "generated";
  mimeType: string;
  size: number;
  content?: string; // Text content for documents/code
  dataUrl?: string; // Data URL for images/binaries
  projectId?: string;
  createdAt: number;
  updatedAt: number;
}

export type AIAgentType = "research" | "coding" | "study" | "writing";

export interface AgentConfig {
  id: AIAgentType;
  title: string;
  description: string;
  icon: string;
  systemPrompt: string;
  tools: string[];
}

export interface UserSettings {
  theme: ThemeMode;
  fontSize: FontSize;
  streamResponse: boolean;
  enterToSend: boolean;
  userDisplayName: string;
  userAvatarColor: string;
  systemPrompt: string;
  temperature: number;
  defaultPersona: AIPersona;
  memoryEnabled: boolean;
  voiceTtsEnabled: boolean;
  speechLanguage: "en-IN" | "hi-IN";
  webSearchEnabled: boolean;
}

export interface SuggestionItem {
  id: string;
  title: string;
  category: "explain" | "write" | "code" | "ideas";
  description: string;
  prompt: string;
  iconName: "HelpCircle" | "PenTool" | "Code2" | "Lightbulb";
}

export interface ApiStatus {
  status: "ok" | "error";
  appName: string;
  version: string;
  isConfigured: boolean;
  model: string;
  message: string;
}

