import {
  Conversation,
  UserProfile,
  UserSettings,
  MemoryItem,
  ProjectItem,
  FileItem,
  AIPersona,
} from "../types";

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  fontSize: "md",
  streamResponse: true,
  enterToSend: true,
  userDisplayName: "User",
  userAvatarColor: "cyan",
  systemPrompt:
    "You are MEYRA AI, a highly reliable, knowledgeable, and helpful AI assistant created by Himanshu Maurya. Maintain strict factual accuracy, never hallucinate or invent facts, use verified sources, and clearly communicate uncertainty when information is unavailable.",
  temperature: 0.7,
  defaultPersona: "fast",
  memoryEnabled: true,
  voiceTtsEnabled: true,
  speechLanguage: "en-IN",
  webSearchEnabled: true,
};

export interface SavedArtworkItem {
  id: string;
  userId?: string;
  prompt: string;
  imageUrl: string;
  aspectRatio?: string;
  style?: string;
  createdAt: number;
}

export interface IChatStorage {
  // Authentication & Profile
  getUser(): UserProfile | null;
  saveUser(user: UserProfile): void;
  clearUser(): void;
  getGoogleClientId(): string;
  saveGoogleClientId(clientId: string): void;

  // Saved Artwork Library
  getSavedArtworks(userId?: string): SavedArtworkItem[];
  saveArtwork(item: SavedArtworkItem, userId?: string): void;
  deleteArtwork(id: string, userId?: string): void;

  // Conversations
  getConversations(userId?: string): Conversation[];
  getConversation(id: string): Conversation | null;
  saveConversation(conv: Conversation): void;
  deleteConversation(id: string): void;
  renameConversation(id: string, newTitle: string): void;
  togglePinConversation(id: string): void;
  clearAllConversations(userId?: string): void;

  // Settings & Personas
  getSettings(): UserSettings;
  saveSettings(settings: UserSettings): void;
  getActivePersona(): AIPersona;
  setActivePersona(persona: AIPersona): void;

  // MEYRA Memory
  isMemoryEnabled(): boolean;
  setMemoryEnabled(enabled: boolean): void;
  getMemories(userId?: string): MemoryItem[];
  saveMemory(item: MemoryItem): void;
  deleteMemory(id: string, userId?: string): void;
  clearAllMemories(userId?: string): void;

  // Projects
  getProjects(userId?: string): ProjectItem[];
  getProject(id: string, userId?: string): ProjectItem | null;
  saveProject(project: ProjectItem): void;
  deleteProject(id: string, userId?: string): void;
  getActiveProjectId(userId?: string): string | null;
  setActiveProjectId(id: string | null, userId?: string): void;

  // Files
  getFiles(userId?: string): FileItem[];
  getFile(id: string, userId?: string): FileItem | null;
  saveFile(file: FileItem): void;
  deleteFile(id: string, userId?: string): void;

  // Export / Import
  exportAllData(): string;
  importAllData(jsonString: string): { success: boolean; count: number; error?: string };
}

class LocalStorageChatStorage implements IChatStorage {
  private CONVERSATIONS_KEY = "meyra_conversations_v2";
  private SETTINGS_KEY = "meyra_settings_v2";
  private USER_KEY = "meyra_auth_user_v1";
  private GOOGLE_CLIENT_ID_KEY = "meyra_google_client_id_v1";
  private MEMORIES_KEY = "meyra_memories_v1";
  private PROJECTS_KEY = "meyra_projects_v1";
  private FILES_KEY = "meyra_files_v1";
  private ACTIVE_PROJECT_KEY = "meyra_active_project_id_v1";
  private ACTIVE_PERSONA_KEY = "meyra_active_persona_v1";

  /* ========================================================================= */
  /* User Profile                                                              */
  /* ========================================================================= */
  public getUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw);
      // Ensure admin flag is populated if email matches owner
      if (user && user.email === "himanshu22maurya22@gmail.com") {
        user.role = "admin";
      }
      return user;
    } catch (err) {
      console.error("Failed to load user profile:", err);
      return null;
    }
  }

  public saveUser(user: UserProfile): void {
    try {
      if (user.email === "himanshu22maurya22@gmail.com") {
        user.role = "admin";
      }
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (err) {
      console.error("Failed to save user profile:", err);
    }
  }

  public clearUser(): void {
    try {
      localStorage.removeItem(this.USER_KEY);
    } catch (err) {
      console.error("Failed to clear user profile:", err);
    }
  }

  public getGoogleClientId(): string {
    try {
      const stored = localStorage.getItem(this.GOOGLE_CLIENT_ID_KEY);
      if (stored && stored.trim()) return stored.trim();
      const envVal = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
      return envVal ? String(envVal).trim() : "";
    } catch {
      return "";
    }
  }

  public saveGoogleClientId(clientId: string): void {
    try {
      if (clientId && clientId.trim()) {
        localStorage.setItem(this.GOOGLE_CLIENT_ID_KEY, clientId.trim());
      } else {
        localStorage.removeItem(this.GOOGLE_CLIENT_ID_KEY);
      }
    } catch (err) {
      console.error("Failed to save Google client ID:", err);
    }
  }

  /* ========================================================================= */
  /* Saved Artwork Library (User-Isolated)                                     */
  /* ========================================================================= */
  private getArtworksKey(userId?: string): string {
    return userId ? `meyra_artworks_${userId}_v2` : "meyra_artworks_guest_v2";
  }

  public getSavedArtworks(userId?: string): SavedArtworkItem[] {
    try {
      const activeUser = userId || this.getUser()?.id;
      const key = this.getArtworksKey(activeUser);
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public saveArtwork(item: SavedArtworkItem, userId?: string): void {
    try {
      const activeUser = userId || item.userId || this.getUser()?.id;
      const key = this.getArtworksKey(activeUser);
      const list = this.getSavedArtworks(activeUser);
      const filtered = list.filter((a) => a.id !== item.id && a.imageUrl !== item.imageUrl);
      filtered.unshift({ ...item, userId: activeUser });
      if (filtered.length > 50) filtered.pop();
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (err) {
      console.error("Failed to save artwork:", err);
    }
  }

  public deleteArtwork(id: string, userId?: string): void {
    try {
      const activeUser = userId || this.getUser()?.id;
      const key = this.getArtworksKey(activeUser);
      const list = this.getSavedArtworks(activeUser);
      const filtered = list.filter((a) => a.id !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (err) {
      console.error("Failed to delete artwork:", err);
    }
  }

  /* ========================================================================= */
  /* Conversations & History (Isolated by User)                                */
  /* ========================================================================= */
  public getConversations(userId?: string): Conversation[] {
    try {
      // Check v2 key, then fallback to v1 for backward compatibility
      let raw = localStorage.getItem(this.CONVERSATIONS_KEY);
      if (!raw) {
        raw = localStorage.getItem("meyra_conversations_v1");
        if (raw) {
          localStorage.setItem(this.CONVERSATIONS_KEY, raw);
          localStorage.removeItem("meyra_conversations_v1");
        }
      }
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      let list: Conversation[] = parsed;
      const targetUser = userId || this.getUser()?.id;
      // Strictly isolate by authenticated User ID
      if (targetUser) {
        list = list.filter((c) => c.userId === targetUser);
      } else {
        list = list.filter((c) => !c.userId || c.userId === "local_user");
      }

      // Sort pinned first, then newest updated
      return list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
    } catch (err) {
      console.error("Failed to load conversations from local storage:", err);
      return [];
    }
  }

  public getConversation(id: string, userId?: string): Conversation | null {
    const list = this.getConversations(userId);
    return list.find((c) => c.id === id) || null;
  }

  public saveConversation(conv: Conversation): void {
    try {
      const targetUser = conv.userId || this.getUser()?.id || "local_user";
      const normalizedConv: Conversation = {
        ...conv,
        userId: targetUser,
        updatedAt: Date.now(),
      };

      let raw = localStorage.getItem(this.CONVERSATIONS_KEY) || localStorage.getItem("meyra_conversations_v1");
      let list: Conversation[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed;
        } catch {}
      }

      const index = list.findIndex((c) => c.id === normalizedConv.id);
      if (index >= 0) {
        list[index] = normalizedConv;
      } else {
        list.unshift(normalizedConv);
      }
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(list));
      localStorage.removeItem("meyra_conversations_v1");
    } catch (err) {
      console.error("Failed to save conversation to local storage:", err);
    }
  }

  public deleteConversation(id: string): void {
    try {
      let raw = localStorage.getItem(this.CONVERSATIONS_KEY) || localStorage.getItem("meyra_conversations_v1");
      let list: Conversation[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed;
        } catch {}
      }
      const filtered = list.filter((c) => c.id !== id);
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(filtered));
      // Also purge legacy key to prevent deleted items from reappearing
      localStorage.removeItem("meyra_conversations_v1");
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }

  public renameConversation(id: string, newTitle: string): void {
    try {
      let raw = localStorage.getItem(this.CONVERSATIONS_KEY) || localStorage.getItem("meyra_conversations_v1");
      let list: Conversation[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed;
        } catch {}
      }
      const target = list.find((c) => c.id === id);
      if (target) {
        target.title = newTitle.trim() || "Untitled Conversation";
        target.updatedAt = Date.now();
        localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(list));
        localStorage.removeItem("meyra_conversations_v1");
      }
    } catch (err) {
      console.error("Failed to rename conversation:", err);
    }
  }

  public togglePinConversation(id: string): void {
    try {
      let raw = localStorage.getItem(this.CONVERSATIONS_KEY) || localStorage.getItem("meyra_conversations_v1");
      let list: Conversation[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed;
        } catch {}
      }
      const target = list.find((c) => c.id === id);
      if (target) {
        target.isPinned = !target.isPinned;
        target.updatedAt = Date.now();
        localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(list));
        localStorage.removeItem("meyra_conversations_v1");
      }
    } catch (err) {
      console.error("Failed to pin/unpin conversation:", err);
    }
  }

  public clearAllConversations(userId?: string): void {
    try {
      const activeUser = userId || this.getUser()?.id;
      let raw = localStorage.getItem(this.CONVERSATIONS_KEY) || localStorage.getItem("meyra_conversations_v1");
      let list: Conversation[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed;
        } catch {}
      }

      // Preserve other users' data strictly
      const remaining = activeUser
        ? list.filter((c) => c.userId && c.userId !== activeUser)
        : [];
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(remaining));
      localStorage.removeItem("meyra_conversations_v1");
    } catch (err) {
      console.error("Failed to clear conversations:", err);
    }
  }

  /* ========================================================================= */
  /* Settings & Personas                                                       */
  /* ========================================================================= */
  public getSettings(): UserSettings {
    try {
      let raw = localStorage.getItem(this.SETTINGS_KEY);
      if (!raw) {
        raw = localStorage.getItem("meyra_settings_v1");
      }
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

  public getActivePersona(): AIPersona {
    try {
      const stored = localStorage.getItem(this.ACTIVE_PERSONA_KEY);
      if (stored && ["fast", "friendly", "study", "coding", "writing", "deep-think"].includes(stored)) {
        return stored as AIPersona;
      }
      return this.getSettings().defaultPersona || "fast";
    } catch {
      return "fast";
    }
  }

  public setActivePersona(persona: AIPersona): void {
    try {
      localStorage.setItem(this.ACTIVE_PERSONA_KEY, persona);
    } catch (err) {
      console.error("Failed to save active persona:", err);
    }
  }

  /* ========================================================================= */
  /* MEYRA Memory System                                                       */
  /* ========================================================================= */
  public isMemoryEnabled(): boolean {
    return this.getSettings().memoryEnabled ?? true;
  }

  public setMemoryEnabled(enabled: boolean): void {
    const current = this.getSettings();
    this.saveSettings({ ...current, memoryEnabled: enabled });
  }

  private getMemoriesStorageKey(userId?: string): string {
    return userId ? `${this.MEMORIES_KEY}_${userId}` : `${this.MEMORIES_KEY}_local_user`;
  }

  public getMemories(userId?: string): MemoryItem[] {
    try {
      const activeUser = userId || this.getUser()?.id;
      const storageKey = this.getMemoriesStorageKey(activeUser);
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      // Filter out any obsolete demo/sample memories and enforce strict user ownership
      let list: MemoryItem[] = parsed.filter(
        (m) => m && m.id !== "mem_welcome_1" && m.id !== "mem_welcome_2"
      );
      if (activeUser) {
        list = list.filter((m) => m.userId === activeUser);
      }
      return list.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (err) {
      console.error("Failed to load memories:", err);
      return [];
    }
  }

  public saveMemory(item: MemoryItem): void {
    try {
      const activeUser = item.userId || this.getUser()?.id;
      const normalizedItem = { ...item, userId: activeUser };
      const storageKey = this.getMemoriesStorageKey(activeUser);
      const list = this.getMemories(activeUser);
      const idx = list.findIndex((m) => m.id === normalizedItem.id);
      if (idx >= 0) {
        list[idx] = { ...normalizedItem, updatedAt: Date.now() };
      } else {
        list.unshift({ ...normalizedItem, updatedAt: Date.now() });
      }
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (err) {
      console.error("Failed to save memory:", err);
    }
  }

  public deleteMemory(id: string, userId?: string): void {
    try {
      const activeUser = userId || this.getUser()?.id;
      const storageKey = this.getMemoriesStorageKey(activeUser);
      const list = this.getMemories(activeUser).filter((m) => m.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  }

  public clearAllMemories(userId?: string): void {
    try {
      const activeUser = userId || this.getUser()?.id;
      const storageKey = this.getMemoriesStorageKey(activeUser);
      localStorage.setItem(storageKey, JSON.stringify([]));
    } catch (err) {
      console.error("Failed to clear memories:", err);
    }
  }

  /* ========================================================================= */
  /* Projects System                                                           */
  /* ========================================================================= */
  private getProjectsStorageKey(userId?: string): string {
    return userId ? `${this.PROJECTS_KEY}_${userId}` : `${this.PROJECTS_KEY}_local_user`;
  }

  private getActiveProjectKey(userId?: string): string {
    return userId ? `${this.ACTIVE_PROJECT_KEY}_${userId}` : `${this.ACTIVE_PROJECT_KEY}_local_user`;
  }

  private purgeDemoProjects(): void {
    try {
      // 1. Clean legacy global key of any demo projects
      const legacyRaw = localStorage.getItem(this.PROJECTS_KEY);
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(
              (p) =>
                p &&
                p.id !== "proj_sample_1" &&
                p.id !== "proj_sample_2" &&
                p.title !== "My Website" &&
                p.title !== "My Studies"
            );
            localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(cleaned));
          }
        } catch {
          // ignore parsing error
        }
      }

      // 2. Scan and clean user-specific project keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.PROJECTS_KEY)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const cleaned = list.filter(
                  (p) =>
                    p &&
                    p.id !== "proj_sample_1" &&
                    p.id !== "proj_sample_2" &&
                    p.title !== "My Website" &&
                    p.title !== "My Studies"
                );
                if (cleaned.length !== list.length) {
                  localStorage.setItem(key, JSON.stringify(cleaned));
                }
              }
            } catch {
              // ignore
            }
          }
        }
      }

      // 3. Clear active project if it was pointing to a demo project
      const activeId = localStorage.getItem(this.ACTIVE_PROJECT_KEY);
      if (activeId === "proj_sample_1" || activeId === "proj_sample_2") {
        localStorage.removeItem(this.ACTIVE_PROJECT_KEY);
      }
    } catch {
      // ignore cleanup errors
    }
  }

  public getProjects(userId?: string): ProjectItem[] {
    try {
      this.purgeDemoProjects();
      const storageKey = this.getProjectsStorageKey(userId);
      const raw = localStorage.getItem(storageKey);

      let list: ProjectItem[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            list = parsed;
          }
        } catch {
          list = [];
        }
      } else {
        // Migration check from legacy single key if user had non-sample projects
        const legacyRaw = localStorage.getItem(this.PROJECTS_KEY);
        if (legacyRaw) {
          try {
            const legacyList = JSON.parse(legacyRaw);
            if (Array.isArray(legacyList)) {
              list = legacyList.filter(
                (p) => p && (userId ? p.userId === userId : p.userId === "local_user" || !p.userId)
              );
              if (list.length > 0) {
                localStorage.setItem(storageKey, JSON.stringify(list));
              }
            }
          } catch {
            list = [];
          }
        }
      }

      // Strictly filter out any sample/demo projects and enforce isolated ownership
      const cleaned = list.filter(
        (p) =>
          p &&
          p.id !== "proj_sample_1" &&
          p.id !== "proj_sample_2" &&
          p.title !== "My Website" &&
          p.title !== "My Studies" &&
          (userId ? p.userId === userId : p.userId === "local_user" || !p.userId)
      );

      return cleaned.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (err) {
      console.error("Failed to load projects:", err);
      return [];
    }
  }

  public getProject(id: string, userId?: string): ProjectItem | null {
    const targetUser = userId || this.getUser()?.id;
    const list = this.getProjects(targetUser);
    const found = list.find((p) => p.id === id);
    if (found) return found;

    // Fallback search across local_user if not found and user wasn't specified
    if (!userId) {
      const localList = this.getProjects("local_user");
      return localList.find((p) => p.id === id) || null;
    }
    return null;
  }

  public saveProject(project: ProjectItem): void {
    try {
      this.purgeDemoProjects();
      const storageKey = this.getProjectsStorageKey(project.userId);
      const list = this.getProjects(project.userId);
      const idx = list.findIndex((p) => p.id === project.id);
      if (idx >= 0) {
        list[idx] = { ...project, updatedAt: Date.now() };
      } else {
        list.unshift({ ...project, updatedAt: Date.now() });
      }
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (err) {
      console.error("Failed to save project:", err);
    }
  }

  public deleteProject(id: string, userId?: string): void {
    try {
      this.purgeDemoProjects();
      const targetUser = userId || this.getUser()?.id;
      const storageKey = this.getProjectsStorageKey(targetUser);
      const list = this.getProjects(targetUser).filter((p) => p.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(list));

      if (this.getActiveProjectId(targetUser) === id) {
        this.setActiveProjectId(null, targetUser);
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  }

  public getActiveProjectId(userId?: string): string | null {
    try {
      const targetUser = userId || this.getUser()?.id;
      const key = this.getActiveProjectKey(targetUser);
      const activeId = localStorage.getItem(key) || localStorage.getItem(this.ACTIVE_PROJECT_KEY);
      if (!activeId) return null;

      // Ensure active project still exists and is not a deleted demo project
      const proj = this.getProject(activeId, targetUser);
      if (!proj) {
        localStorage.removeItem(key);
        if (localStorage.getItem(this.ACTIVE_PROJECT_KEY) === activeId) {
          localStorage.removeItem(this.ACTIVE_PROJECT_KEY);
        }
        return null;
      }
      return activeId;
    } catch {
      return null;
    }
  }

  public setActiveProjectId(id: string | null, userId?: string): void {
    try {
      const targetUser = userId || this.getUser()?.id;
      const key = this.getActiveProjectKey(targetUser);
      if (id) {
        localStorage.setItem(key, id);
        localStorage.setItem(this.ACTIVE_PROJECT_KEY, id);
      } else {
        localStorage.removeItem(key);
        localStorage.removeItem(this.ACTIVE_PROJECT_KEY);
      }
    } catch (err) {
      console.error("Failed to set active project:", err);
    }
  }

  /* ========================================================================= */
  /* Files & Documents System                                                 */
  /* ========================================================================= */
  private getFilesStorageKey(userId?: string): string {
    return userId ? `${this.FILES_KEY}_${userId}` : `${this.FILES_KEY}_local_user`;
  }

  public getFiles(userId?: string): FileItem[] {
    try {
      const activeUser = userId || this.getUser()?.id;
      const storageKey = this.getFilesStorageKey(activeUser);
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      let list: FileItem[] = parsed;
      if (activeUser) {
        list = list.filter((f) => f.userId === activeUser);
      }
      return list.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (err) {
      console.error("Failed to load files:", err);
      return [];
    }
  }

  public getFile(id: string, userId?: string): FileItem | null {
    const list = this.getFiles(userId);
    return list.find((f) => f.id === id) || null;
  }

  public saveFile(file: FileItem): void {
    try {
      const activeUser = file.userId || this.getUser()?.id;
      const normalizedFile = { ...file, userId: activeUser };
      const storageKey = this.getFilesStorageKey(activeUser);
      const list = this.getFiles(activeUser);
      const idx = list.findIndex((f) => f.id === normalizedFile.id);
      if (idx >= 0) {
        list[idx] = { ...normalizedFile, updatedAt: Date.now() };
      } else {
        list.unshift({ ...normalizedFile, updatedAt: Date.now() });
      }
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (err) {
      console.error("Failed to save file:", err);
    }
  }

  public deleteFile(id: string, userId?: string): void {
    try {
      const activeUser = userId || this.getUser()?.id;
      const storageKey = this.getFilesStorageKey(activeUser);
      const list = this.getFiles(activeUser).filter((f) => f.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  }

  /* ========================================================================= */
  /* Backup Export & Import                                                    */
  /* ========================================================================= */
  public exportAllData(): string {
    const data = {
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      conversations: this.getConversations(),
      settings: this.getSettings(),
      memories: this.getMemories(),
      projects: this.getProjects(),
      files: this.getFiles(),
    };
    return JSON.stringify(data, null, 2);
  }

  public importAllData(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || (!Array.isArray(parsed.conversations) && !parsed.settings)) {
        return {
          success: false,
          count: 0,
          error: "Invalid file format. Expected a valid MEYRA AI backup JSON file.",
        };
      }

      let addedCount = 0;

      if (Array.isArray(parsed.conversations)) {
        const existing = this.getConversations();
        const existingIds = new Set(existing.map((c) => c.id));
        for (const conv of parsed.conversations) {
          if (conv && conv.id && !existingIds.has(conv.id)) {
            existing.push(conv);
            addedCount++;
          }
        }
        localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(existing));
      }

      if (parsed.settings) {
        this.saveSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
      }

      if (Array.isArray(parsed.memories)) {
        localStorage.setItem(this.MEMORIES_KEY, JSON.stringify(parsed.memories));
      }

      if (Array.isArray(parsed.projects)) {
        localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(parsed.projects));
      }

      if (Array.isArray(parsed.files)) {
        localStorage.setItem(this.FILES_KEY, JSON.stringify(parsed.files));
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

export const chatStorage: IChatStorage = new LocalStorageChatStorage();
