import { useState, useEffect, useRef, useCallback } from "react";
import { Conversation, Message, UserSettings } from "../types";
import { chatStorage } from "../services/storage";
import { streamChatCompletion, generateAutoTitle, fetchApiStatus } from "../services/api";

export function useChat(settings: UserSettings) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [apiStatus, setApiStatus] = useState({
    isConfigured: true,
    model: "gemini-3.1-flash-lite",
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial conversations & check backend status
  useEffect(() => {
    const loaded = chatStorage.getConversations();
    setConversations(loaded);
    if (loaded.length > 0) {
      setActiveId(loaded[0].id);
    }

    // Check API status
    fetchApiStatus().then((status) => {
      setApiStatus({
        isConfigured: status.isConfigured,
        model: status.model || "gemini-3.1-flash-lite",
      });
    });
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  // Create New Conversation
  const createNewChat = useCallback(() => {
    const newConv: Conversation = {
      id: "conv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      title: "New Conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    chatStorage.saveConversation(newConv);
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    return newConv.id;
  }, []);

  // Switch Conversation
  const selectConversation = useCallback((id: string) => {
    if (isStreaming) {
      stopGeneration();
    }
    setActiveId(id);
  }, [isStreaming]);

  // Rename Conversation
  const renameConversation = useCallback((id: string, newTitle: string) => {
    chatStorage.renameConversation(id, newTitle);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  }, []);

  // Delete Conversation
  const deleteConversation = useCallback((id: string) => {
    chatStorage.deleteConversation(id);
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id);
      if (activeId === id) {
        setActiveId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  }, [activeId]);

  // Clear current conversation messages
  const clearCurrentChat = useCallback(() => {
    if (!activeId) return;
    const updated: Conversation = {
      ...activeConversation!,
      messages: [],
      updatedAt: Date.now(),
    };
    chatStorage.saveConversation(updated);
    setConversations((prev) => prev.map((c) => (c.id === activeId ? updated : c)));
  }, [activeId, activeConversation]);

  // Clear all conversations
  const clearAllHistory = useCallback(() => {
    chatStorage.clearAllConversations();
    setConversations([]);
    setActiveId(null);
  }, []);

  // Stop Generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Send Message
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      let currentConvId = activeId;
      let currentConv = activeConversation;

      // If no active conversation, create one
      if (!currentConvId || !currentConv) {
        const newId = createNewChat();
        currentConvId = newId;
        currentConv = {
          id: newId,
          title: "New Conversation",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        };
      }

      const userMsg: Message = {
        id: "msg_" + Date.now() + "_user",
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
        status: "completed",
      };

      const assistantMsgId = "msg_" + (Date.now() + 1) + "_assistant";
      const assistantMsgPlaceholder: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: Date.now() + 1,
        status: "streaming",
      };

      const isFirstMessage = currentConv.messages.length === 0;
      const updatedMessages = [...currentConv.messages, userMsg, assistantMsgPlaceholder];

      // Optimistically update conversation state
      const updatedConv: Conversation = {
        ...currentConv,
        messages: updatedMessages,
        updatedAt: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) => (c.id === currentConvId ? updatedConv : c))
      );
      setIsStreaming(true);

      // Trigger auto-title if first message
      if (isFirstMessage) {
        const generatedTitle = generateAutoTitle(trimmed);
        renameConversation(currentConvId!, generatedTitle);
      }

      // Prepare context for backend
      const messagePayload = updatedMessages
        .slice(0, -1) // Exclude the empty assistant placeholder
        .map((m) => ({ role: m.role, content: m.content }));

      abortControllerRef.current = new AbortController();

      let accumulatedContent = "";

      try {
        await streamChatCompletion({
          messages: messagePayload,
          systemPrompt: settings.systemPrompt,
          temperature: settings.temperature,
          model: apiStatus.model || "gemini-3.1-flash-lite",
          signal: abortControllerRef.current.signal,
          onChunk: (chunk: string) => {
            accumulatedContent += chunk;
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id !== currentConvId) return conv;
                return {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: accumulatedContent, status: "streaming" }
                      : m
                  ),
                };
              })
            );
          },
          onComplete: () => {
            setIsStreaming(false);
            abortControllerRef.current = null;
            // Save to persistence
            setConversations((prev) => {
              const final = prev.map((conv) => {
                if (conv.id !== currentConvId) return conv;
                const savedConv: Conversation = {
                  ...conv,
                  updatedAt: Date.now(),
                  messages: conv.messages.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: accumulatedContent, status: "completed" }
                      : m
                  ),
                };
                chatStorage.saveConversation(savedConv);
                return savedConv;
              });
              return final;
            });
          },
          onError: (error: Error) => {
            setIsStreaming(false);
            abortControllerRef.current = null;
            const errorText = error.message || "Failed to generate response.";
            setConversations((prev) => {
              const final = prev.map((conv) => {
                if (conv.id !== currentConvId) return conv;
                const savedConv: Conversation = {
                  ...conv,
                  updatedAt: Date.now(),
                  messages: conv.messages.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content: accumulatedContent || "Sorry, an error occurred while connecting to the AI provider.",
                          status: "error",
                          errorMessage: errorText,
                        }
                      : m
                  ),
                };
                chatStorage.saveConversation(savedConv);
                return savedConv;
              });
              return final;
            });
          },
        });
      } catch (unexpectedError: any) {
        setIsStreaming(false);
        abortControllerRef.current = null;
        const errorText =
          unexpectedError?.message || "An unexpected error occurred during message generation.";
        setConversations((prev) => {
          const final = prev.map((conv) => {
            if (conv.id !== currentConvId) return conv;
            const savedConv: Conversation = {
              ...conv,
              updatedAt: Date.now(),
              messages: conv.messages.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: accumulatedContent || "Sorry, an error occurred while connecting to the AI provider.",
                      status: "error",
                      errorMessage: errorText,
                    }
                  : m
              ),
            };
            chatStorage.saveConversation(savedConv);
            return savedConv;
          });
          return final;
        });
      }
    },
    [
      activeId,
      activeConversation,
      isStreaming,
      createNewChat,
      renameConversation,
      settings.systemPrompt,
      settings.temperature,
    ]
  );

  // Regenerate Response
  const regenerateResponse = useCallback(
    async (messageId?: string) => {
      if (!activeConversation || isStreaming) return;
      const msgs = activeConversation.messages;
      if (msgs.length === 0) return;

      // Find the user message to retry
      let userPrompt = "";
      let cutoffIndex = msgs.length;

      if (messageId) {
        const targetIdx = msgs.findIndex((m) => m.id === messageId);
        if (targetIdx >= 0) {
          if (msgs[targetIdx].role === "user") {
            userPrompt = msgs[targetIdx].content;
            cutoffIndex = targetIdx;
          } else {
            // Target is assistant message, look for prior user message
            const priorIdx = targetIdx - 1;
            if (priorIdx >= 0 && msgs[priorIdx].role === "user") {
              userPrompt = msgs[priorIdx].content;
              cutoffIndex = priorIdx;
            }
          }
        }
      } else {
        // Find last user message
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === "user") {
            userPrompt = msgs[i].content;
            cutoffIndex = i;
            break;
          }
        }
      }

      if (!userPrompt) return;

      // Slice conversation up to cutoffIndex
      const trimmedHistory = msgs.slice(0, cutoffIndex);
      const updatedConv: Conversation = {
        ...activeConversation,
        messages: trimmedHistory,
      };

      chatStorage.saveConversation(updatedConv);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? updatedConv : c))
      );

      // Send prompt again
      setTimeout(() => {
        sendMessage(userPrompt);
      }, 50);
    },
    [activeConversation, isStreaming, sendMessage]
  );

  return {
    conversations,
    activeConversation,
    activeId,
    isStreaming,
    apiStatus,
    createNewChat,
    selectConversation,
    renameConversation,
    deleteConversation,
    clearCurrentChat,
    clearAllHistory,
    sendMessage,
    stopGeneration,
    regenerateResponse,
    setConversations,
  };
}
