import { Conversation, UserSettings } from "../types";

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  fontSize: "md",
  streamResponse: true,
  enterToSend: true,
  userDisplayName: "User",
  userAvatarColor: "cyan",
  systemPrompt:
    "You are MEYRA AI, a highly capable, knowledgeable, and helpful AI assistant. You provide thoughtful, articulate, and well-structured answers with markdown formatting and clean code blocks when helpful.",
  temperature: 0.7,
};

export interface IChatStorage {
  getConversations(): Conversation[];
  getConversation(id: string): Conversation | null;
  saveConversation(conv: Conversation): void;
  deleteConversation(id: string): void;
  renameConversation(id: string, newTitle: string): void;
  clearAllConversations(): void;
  getSettings(): UserSettings;
  saveSettings(settings: UserSettings): void;
  exportAllData(): string;
  importAllData(jsonString: string): { success: boolean; count: number; error?: string };
}

class LocalStorageChatStorage implements IChatStorage {
  private CONVERSATIONS_KEY = "meyra_conversations_v1";
  private SETTINGS_KEY = "meyra_settings_v1";

  public getConversations(): Conversation[] {
    try {
      const raw = localStorage.getItem(this.CONVERSATIONS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Sort newest updated first
      return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (err) {
      console.error("Failed to load conversations from local storage:", err);
      return [];
    }
  }

  public getConversation(id: string): Conversation | null {
    const list = this.getConversations();
    return list.find((c) => c.id === id) || null;
  }

  public saveConversation(conv: Conversation): void {
    try {
      const list = this.getConversations();
      const index = list.findIndex((c) => c.id === conv.id);
      if (index >= 0) {
        list[index] = { ...conv, updatedAt: Date.now() };
      } else {
        list.unshift({ ...conv, updatedAt: Date.now() });
      }
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(list));
    } catch (err) {
      console.error("Failed to save conversation to local storage:", err);
    }
  }

  public deleteConversation(id: string): void {
    try {
      const list = this.getConversations().filter((c) => c.id !== id);
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(list));
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }

  public renameConversation(id: string, newTitle: string): void {
    try {
      const list = this.getConversations();
      const target = list.find((c) => c.id === id);
      if (target) {
        target.title = newTitle.trim() || "Untitled Conversation";
        target.updatedAt = Date.now();
        localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(list));
      }
    } catch (err) {
      console.error("Failed to rename conversation:", err);
    }
  }

  public clearAllConversations(): void {
    try {
      localStorage.removeItem(this.CONVERSATIONS_KEY);
    } catch (err) {
      console.error("Failed to clear conversations:", err);
    }
  }

  public getSettings(): UserSettings {
    try {
      const raw = localStorage.getItem(this.SETTINGS_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (err) {
      return DEFAULT_SETTINGS;
    }
  }

  public saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  }

  public exportAllData(): string {
    const data = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      conversations: this.getConversations(),
      settings: this.getSettings(),
    };
    return JSON.stringify(data, null, 2);
  }

  public importAllData(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.conversations)) {
        return {
          success: false,
          count: 0,
          error: "Invalid file format. Expected a JSON file with 'conversations' array.",
        };
      }

      const existing = this.getConversations();
      const existingIds = new Set(existing.map((c) => c.id));
      let addedCount = 0;

      for (const conv of parsed.conversations) {
        if (conv && conv.id && Array.isArray(conv.messages)) {
          if (!existingIds.has(conv.id)) {
            existing.push(conv);
            addedCount++;
          }
        }
      }

      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(existing));

      if (parsed.settings) {
        this.saveSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
      }

      return { success: true, count: addedCount };
    } catch (err: any) {
      return {
        success: false,
        count: 0,
        error: err?.message || "Failed to parse JSON backup file.",
      };
    }
  }
}

// Export singleton instance of storage provider
export const chatStorage: IChatStorage = new LocalStorageChatStorage();
