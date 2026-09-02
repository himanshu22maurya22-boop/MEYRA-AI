export type Role = "user" | "assistant" | "system";

export type MessageStatus = "idle" | "sending" | "streaming" | "completed" | "error";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  status?: MessageStatus;
  errorMessage?: string;
  model?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  systemPrompt?: string;
  temperature?: number;
  isPinned?: boolean;
}

export type ThemeMode = "dark" | "light" | "system";
export type FontSize = "sm" | "md" | "lg";

export interface UserSettings {
  theme: ThemeMode;
  fontSize: FontSize;
  streamResponse: boolean;
  enterToSend: boolean;
  userDisplayName: string;
  userAvatarColor: string;
  systemPrompt: string;
  temperature: number;
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
