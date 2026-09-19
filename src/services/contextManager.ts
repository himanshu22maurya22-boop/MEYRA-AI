import { Message, MemoryItem, ProjectItem, FileItem } from "../types";
import { chatStorage } from "./storage";

// Standard stop words to ignore when matching memory relevance
const STOP_WORDS = new Set([
  "the", "and", "a", "an", "is", "are", "was", "were", "to", "in", "of", "it",
  "for", "on", "with", "as", "at", "by", "from", "up", "about", "into", "over",
  "after", "can", "could", "would", "should", "will", "what", "how", "why",
  "where", "when", "who", "which", "this", "that", "these", "those", "you",
  "your", "yours", "me", "my", "mine", "we", "us", "our", "ours", "he", "she",
  "they", "them", "their", "please", "tell", "show", "give", "help", "want",
  "need", "make", "create", "write", "code", "explain", "karo", "hai", "batao",
  "kya", "kaise", "mere", "meri", "mera", "mujhe", "tum", "aap", "ho"
]);

function extractKeywords(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9_\u0900-\u097F\s]/g, " ").split(/\s+/);
  const keywords = new Set<string>();
  for (const w of words) {
    if (w.length >= 3 && !STOP_WORDS.has(w)) {
      keywords.add(w);
    }
  }
  return keywords;
}

/**
 * Filter memories to only those directly relevant to the current user query or recent dialogue.
 * Avoids blindly injecting all stored memories into unrelated prompts.
 */
export function filterRelevantMemories(
  memories: MemoryItem[],
  currentQuery: string,
  recentHistoryText: string = ""
): MemoryItem[] {
  if (!memories || memories.length === 0) return [];

  const combinedQuery = `${currentQuery} ${recentHistoryText}`.toLowerCase().trim();

  // If user explicitly asks about their profile, saved preferences, or memory
  const isMemoryInquiry =
    /who am i|what do you remember|what is my name|my preferences?|my details?|about me|do you know me|meri memory|kya yaad hai|mere baare mein/i.test(
      combinedQuery
    );

  if (isMemoryInquiry) {
    return memories.slice(0, 10);
  }

  const queryKeywords = extractKeywords(combinedQuery);
  if (queryKeywords.size === 0) return [];

  const scored: Array<{ memory: MemoryItem; score: number }> = [];

  for (const mem of memories) {
    if (!mem.text || !mem.text.trim()) continue;
    const memKeywords = extractKeywords(mem.text);
    let matchCount = 0;

    for (const kw of memKeywords) {
      if (queryKeywords.has(kw)) {
        matchCount++;
      } else {
        // Partial/substring match for technical terms (e.g. typescript -> ts, react -> reactjs)
        for (const qk of queryKeywords) {
          if (qk.length >= 4 && (kw.includes(qk) || qk.includes(kw))) {
            matchCount += 0.5;
            break;
          }
        }
      }
    }

    // Always slightly prioritize core user instructions or developer preferences if relevant
    if (matchCount > 0) {
      if (mem.category === "instruction" || mem.category === "preference") {
        matchCount += 0.5;
      }
      scored.push({ memory: mem, score: matchCount });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  // Cap at top 4 most relevant memories to keep the prompt clean and focused
  return scored.slice(0, 4).map((s) => s.memory);
}

/**
 * Constructs authoritative project context when the conversation belongs to or is inside a Project.
 * Strictly isolates project instructions and attached project files from unrelated chats.
 */
export function buildProjectContext(
  projectId: string | null | undefined,
  userId?: string
): string | null {
  if (!projectId) return null;

  try {
    const project: ProjectItem | null = chatStorage.getProject(projectId, userId);
    if (!project) return null;

    const sections: string[] = [
      `[ACTIVE PROJECT: "${project.title}"]`,
      `Project Goal & Description: ${project.description || "No description provided."}`,
      `Project Directives & Guidelines: ${project.instructions || "Follow standard best practices."}`,
    ];

    // Include project files if attached to the project
    if (project.fileIds && project.fileIds.length > 0) {
      const fileExcerpts: string[] = [];
      for (const fileId of project.fileIds) {
        const file = chatStorage.getFile(fileId, userId);
        if (file) {
          if (file.content && file.content.trim()) {
            const preview = file.content.slice(0, 1200);
            fileExcerpts.push(
              `-- Project Document "${file.name}" --\n${preview}${
                file.content.length > 1200 ? "\n...[file truncated]" : ""
              }`
            );
          } else {
            fileExcerpts.push(`-- Project Asset "${file.name}" (${file.type}, ${file.mimeType}) --`);
          }
        }
      }

      if (fileExcerpts.length > 0) {
        sections.push(`[Attached Project Files]:\n${fileExcerpts.join("\n\n")}`);
      }
    }

    sections.push(
      "Keep all responses strictly aligned with this project's directives and scope."
    );

    return sections.join("\n\n");
  } catch (err) {
    console.error("Failed to build project context:", err);
    return null;
  }
}

/**
 * Intelligently preserves important context for long conversations:
 * - Always preserves Turn 1 (initial request & foundational response).
 * - Always preserves ANY message with attachments (documents, files, images) so follow-ups never lose source files.
 * - Always preserves messages with code blocks if the user is asking technical follow-ups.
 * - Retains the most recent 10-12 conversation turns for seamless coreference resolution ("this", "that", "it", "previous code").
 */
export function optimizeConversationForContext(messages: Message[]): Message[] {
  if (!messages || messages.length <= 14) {
    return messages || [];
  }

  const total = messages.length;
  const recentWindowCount = 10;
  const recentMessages = messages.slice(total - recentWindowCount);
  const olderMessages = messages.slice(0, total - recentWindowCount);

  // Always keep Turn 1 (first user message and first assistant message)
  const mustKeepIds = new Set<string>();
  if (messages[0]) mustKeepIds.add(messages[0].id);
  if (messages[1] && messages[1].role === "assistant") mustKeepIds.add(messages[1].id);

  // Always keep messages with attachments (uploaded files, documents, images)
  for (const m of olderMessages) {
    if (m.attachments && m.attachments.length > 0) {
      mustKeepIds.add(m.id);
    }
  }

  // Check if latest user message refers to previous code or files
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const refersToCode =
    lastUserMsg &&
    /(code|function|class|component|error|bug|fix|refactor|script|snippet|implementation|previous|earlier)/i.test(
      lastUserMsg.content
    );

  if (refersToCode) {
    // Keep older messages containing code blocks
    for (const m of olderMessages) {
      if (m.content.includes("```")) {
        mustKeepIds.add(m.id);
      }
    }
  }

  // Gather preserved older messages
  const preservedOlder = olderMessages.filter((m) => mustKeepIds.has(m.id));

  // If some intermediate messages were skipped, add a concise context summary bridge
  const skippedCount = olderMessages.length - preservedOlder.length;
  const bridgeMessages: Message[] = [];

  if (skippedCount > 0) {
    // Extract brief topic phrases from skipped messages
    const topicSnippets = olderMessages
      .filter((m) => !mustKeepIds.has(m.id) && m.role === "user")
      .slice(0, 3)
      .map((m) => `"${m.content.slice(0, 60)}..."`)
      .join(", ");

    bridgeMessages.push({
      id: "context_bridge_" + Date.now(),
      role: "system",
      content: `[Context Note: ${skippedCount} earlier intermediate turns summarized. Topics touched upon earlier: ${
        topicSnippets || "various follow-ups"
      }. Core instructions, attached files, and recent dialogue remain fully preserved.]`,
      timestamp: Date.now(),
    });
  }

  // Combine and sort by original index
  const idToOriginalIndex = new Map<string, number>();
  messages.forEach((m, idx) => idToOriginalIndex.set(m.id, idx));

  const result: Message[] = [...preservedOlder, ...bridgeMessages, ...recentMessages];
  result.sort((a, b) => {
    const idxA = idToOriginalIndex.get(a.id) ?? 9999;
    const idxB = idToOriginalIndex.get(b.id) ?? 9999;
    return idxA - idxB;
  });

  return result;
}
