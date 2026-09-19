import { useState, useEffect, useRef, useCallback } from "react";
import {
  Conversation,
  Message,
  UserSettings,
  MessageAttachment,
  SearchSource,
  AIPersona,
} from "../types";
import { chatStorage } from "../services/storage";
import { streamChatCompletion, generateAutoTitle, fetchApiStatus } from "../services/api";
import { getPersonaConfig } from "../services/personas";
import { detectImageIntent } from "../services/imageIntent";
import {
  detectFounderIntent,
  isTimeSensitiveQuery,
  resolveFounderInquiry,
  sanitizeExternalEntityResponse,
} from "../services/founderIntent";
import {
  filterRelevantMemories,
  buildProjectContext,
  optimizeConversationForContext,
} from "../services/contextManager";
import { ttsService } from "../services/tts";

export function useChat(settings: UserSettings) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePersona, setActivePersonaState] = useState<AIPersona>(() =>
    chatStorage.getActivePersona()
  );
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    const user = chatStorage.getUser();
    return chatStorage.getActiveProjectId(user?.id);
  });
  const [isWebSearchActive, setIsWebSearchActive] = useState(false);

  const [apiStatus, setApiStatus] = useState({
    isConfigured: true,
    model: "gemini-3.1-flash-lite",
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial conversations & check backend status
  useEffect(() => {
    const user = chatStorage.getUser();
    const loaded = chatStorage.getConversations(user?.id);
    setConversations(loaded);
    if (loaded.length > 0) {
      setActiveId(loaded[0].id);
    }

    fetchApiStatus().then((status) => {
      setApiStatus({
        isConfigured: status.isConfigured,
        model: status.model || "gemini-3.1-flash-lite",
      });
    });
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  const setPersona = useCallback((persona: AIPersona) => {
    setActivePersonaState(persona);
    chatStorage.setActivePersona(persona);
  }, []);

  const setActiveProject = useCallback((projectId: string | null) => {
    const user = chatStorage.getUser();
    setActiveProjectIdState(projectId);
    chatStorage.setActiveProjectId(projectId, user?.id);
  }, []);

  // Create New Conversation
  const createNewChat = useCallback(() => {
    ttsService.stop();
    const currentUser = chatStorage.getUser();
    const newConv: Conversation = {
      id: "conv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      title: "New Conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      userId: currentUser?.id,
      persona: activePersona,
      projectId: activeProjectId || undefined,
    };
    chatStorage.saveConversation(newConv);
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    return newConv.id;
  }, [activePersona, activeProjectId]);

  // Switch Conversation
  const selectConversation = useCallback(
    (id: string) => {
      ttsService.stop();
      if (isStreaming) {
        stopGeneration();
      }
      setActiveId(id);
    },
    [isStreaming]
  );

  // Rename Conversation
  const renameConversation = useCallback((id: string, newTitle: string) => {
    chatStorage.renameConversation(id, newTitle);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  }, []);

  // Toggle Pin Conversation
  const togglePinConversation = useCallback((id: string) => {
    chatStorage.togglePinConversation(id);
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c));
      return updated.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
    });
  }, []);

  // Delete Conversation
  const deleteConversation = useCallback(
    (id: string) => {
      ttsService.stop();
      chatStorage.deleteConversation(id);
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (activeId === id) {
          setActiveId(filtered.length > 0 ? filtered[0].id : null);
        }
        return filtered;
      });
    },
    [activeId]
  );

  // Clear current conversation messages
  const clearCurrentChat = useCallback(() => {
    ttsService.stop();
    if (!activeId || !activeConversation) return;
    const updated: Conversation = {
      ...activeConversation,
      messages: [],
      updatedAt: Date.now(),
    };
    chatStorage.saveConversation(updated);
    setConversations((prev) => prev.map((c) => (c.id === activeId ? updated : c)));
  }, [activeId, activeConversation]);

  // Clear all conversations
  const clearAllHistory = useCallback(() => {
    ttsService.stop();
    const user = chatStorage.getUser();
    chatStorage.clearAllConversations(user?.id);
    setConversations([]);
    setActiveId(null);
  }, []);

  // Stop Generation
  const stopGeneration = useCallback(() => {
    ttsService.stop();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Helper to compose system prompt including Persona, relevant Memory, and Project instructions
  const buildFullSystemPrompt = useCallback(
    (currentQuery: string = "", recentHistory: string = "", targetProjectId?: string) => {
      const parts: string[] = [];

      // Base user system prompt
      if (settings.systemPrompt) {
        parts.push(settings.systemPrompt);
      }

      // Persona instruction
      const personaConfig = getPersonaConfig(activePersona);
      if (personaConfig.systemInstruction) {
        parts.push(personaConfig.systemInstruction);
      }

      // Memory injection (isolated by user ID, strictly filtered for relevance)
      if (settings.memoryEnabled) {
        const currentUser = chatStorage.getUser();
        const memories = chatStorage.getMemories(currentUser?.id);
        const relevantMemories = filterRelevantMemories(memories, currentQuery, recentHistory);
        if (relevantMemories.length > 0) {
          const memoryBulletPoints = relevantMemories.map((m) => `- ${m.text}`).join("\n");
          parts.push(
            `[MEYRA MEMORY: Authenticated user facts and instructions relevant to this conversation]:\n${memoryBulletPoints}`
          );
        }
      }

      // Project context injection (authoritative, isolated per project)
      const effectiveProjectId = targetProjectId || activeProjectId;
      if (effectiveProjectId) {
        const user = chatStorage.getUser();
        const projectCtx = buildProjectContext(effectiveProjectId, user?.id);
        if (projectCtx) {
          parts.push(projectCtx);
        }
      }

      return parts.join("\n\n");
    },
    [settings.systemPrompt, settings.memoryEnabled, activePersona, activeProjectId]
  );

  // Send Message with support for attachments, web search, and persona
  const sendMessage = useCallback(
    async (text: string, attachments?: MessageAttachment[], enableSearchOverride?: boolean) => {
      const trimmed = text.trim();
      const hasAttachments = attachments && attachments.length > 0;
      if ((!trimmed && !hasAttachments) || isStreaming) return;

      ttsService.stop();

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
          persona: activePersona,
          projectId: activeProjectId || undefined,
        };
      }

      const isFirstUserMessage = currentConv.messages.length === 0;

      const userMsg: Message = {
        id: "msg_" + Date.now() + "_user",
        role: "user",
        content: trimmed || (hasAttachments ? `[Sent ${attachments.length} attachment(s)]` : ""),
        timestamp: Date.now(),
        status: "completed",
        attachments: hasAttachments ? attachments : undefined,
      };

      const assistantMsgId = "msg_" + (Date.now() + 1) + "_assistant";
      const founderResolution =
        !hasAttachments && trimmed ? resolveFounderInquiry(trimmed, currentConv.messages) : null;
      const isFounderQuery = Boolean(
        founderResolution?.isFounderInquiry && founderResolution.targetEntity === "meyra"
      );
      const isExternalCompanyQuery = Boolean(
        founderResolution?.isFounderInquiry && founderResolution.targetEntity === "other"
      );
      const parsedImage = !hasAttachments && trimmed && !isFounderQuery ? detectImageIntent(trimmed) : null;
      const isTimeSensitive = !hasAttachments && trimmed ? isTimeSensitiveQuery(trimmed) : false;
      const effectiveSearchUsed =
        !parsedImage &&
        !isFounderQuery &&
        (enableSearchOverride ?? (isWebSearchActive || isTimeSensitive || isExternalCompanyQuery));

      const assistantMsgPlaceholder: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: parsedImage ? "MEYRA AI is creating your image..." : "",
        timestamp: Date.now() + 1,
        status: "streaming",
        persona: activePersona,
        searchUsed: effectiveSearchUsed,
        isImageGenerating: Boolean(parsedImage),
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

      // Auto-title if first message
      if (isFirstMessage) {
        const titleSource = trimmed || (hasAttachments ? attachments[0].name : "New Chat");
        const generatedTitle = generateAutoTitle(titleSource);
        renameConversation(currentConvId!, generatedTitle);
      }

      // Permanent Rule: Founder / Creator / Core Team Inquiries
      if (isFounderQuery) {
        const chunks = [
          "![MEYRA AI — Core Team](/meyra_core_team.png)\n\n",
          "### MEYRA AI — Core Team\n\n",
          "👑 **Himanshu Maurya**\n**Founder / CEO / CTO**\nFounder — MEYRA AI ke founder aur creator\nCEO — Company ki vision, leadership aur major decisions\nCTO — Technology, AI systems aur product development\n\n",
          "⚡ **Aditya Maurya**\n**Co-Founder / COO**\nCo-Founder — MEYRA AI ke co-founder\nCOO — Operations, execution, team coordination aur day-to-day business activities\n\n",
          "💜 **Meethi Yadav**\n**Inspiration Behind MEYRA AI / Brand Advisor**\nInspiration Behind MEYRA AI — MEYRA naam aur concept ke peeche inspiration\nBrand Advisor — Brand identity aur creative/brand perspective\n",
        ];

        let accumulated = "";
        for (let i = 0; i < chunks.length; i++) {
          accumulated += chunks[i];
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== currentConvId) return c;
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: accumulated,
                        status: i === chunks.length - 1 ? "completed" : "streaming",
                      }
                    : m
                ),
                updatedAt: Date.now(),
              };
            })
          );
          if (i < chunks.length - 1) {
            await new Promise((r) => setTimeout(r, 35));
          }
        }

        // Final persistence in storage
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== currentConvId) return c;
            const finalized = {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: accumulated, status: "completed" as const }
                  : m
              ),
              updatedAt: Date.now(),
            };
            chatStorage.saveConversation(finalized);
            return finalized;
          })
        );
        setIsStreaming(false);
        return;
      }

      // If user requested image generation, route directly to /api/image/generate
      if (parsedImage) {
        try {
          const controller = new AbortController();
          abortControllerRef.current = controller;
          const currentUser = chatStorage.getUser();
          const res = await fetch("/api/image/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(currentUser?.authToken ? { Authorization: `Bearer ${currentUser.authToken}` } : {}),
            },
            body: JSON.stringify({
              prompt: parsedImage.prompt,
              aspectRatio: parsedImage.aspectRatio,
              style: parsedImage.style,
              userId: currentUser?.id,
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const userErr =
              errData.error || "Image generation is temporarily unavailable. Please try again.";
            const finalImageErr: Message = {
              ...assistantMsgPlaceholder,
              content: userErr,
              status: "error",
              errorMessage: userErr,
              isImageGenerating: false,
              generatedImage: undefined,
            };
            setConversations((prev) =>
              prev.map((c) =>
                c.id === currentConvId
                  ? {
                      ...c,
                      messages: c.messages.map((m) => (m.id === assistantMsgId ? finalImageErr : m)),
                      updatedAt: Date.now(),
                    }
                  : c
              )
            );
            setIsStreaming(false);
            return;
          }

          const data = await res.json();
          const finalImageUrl = data.imageUrl || data.image?.imageUrl;

          if (!finalImageUrl) {
            throw new Error("No image was returned from the generator.");
          }

          const completedImageMsg: Message = {
            ...assistantMsgPlaceholder,
            content: `Here is the artwork generated for: "${parsedImage.prompt}".`,
            status: "completed",
            isImageGenerating: false,
            generatedImage: {
              imageUrl: finalImageUrl,
              prompt: parsedImage.prompt,
              aspectRatio: parsedImage.aspectRatio,
              style: parsedImage.style,
              createdAt: Date.now(),
            },
          };

          // Save to user's isolated Saved Artwork Library
          chatStorage.saveArtwork({
            id: "art_" + Date.now(),
            prompt: parsedImage.prompt,
            imageUrl: finalImageUrl,
            aspectRatio: parsedImage.aspectRatio,
            style: parsedImage.style,
            createdAt: Date.now(),
            userId: currentUser?.id,
          });

          // Save conversation
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== currentConvId) return c;
              const updated = {
                ...c,
                messages: c.messages.map((m) => (m.id === assistantMsgId ? completedImageMsg : m)),
                updatedAt: Date.now(),
              };
              chatStorage.saveConversation(updated);
              return updated;
            })
          );

          // Update conversation title if first user turn
          if (isFirstUserMessage) {
            const shortTitle = parsedImage.prompt.slice(0, 36).trim();
            if (shortTitle) {
              renameConversation(currentConvId, shortTitle);
            }
          }
        } catch (genErr: any) {
          if (abortControllerRef.current?.signal.aborted) {
            return;
          }
          const userErr =
            genErr?.message || "Image generation is temporarily unavailable. Please try again.";
          const finalImageErr: Message = {
            ...assistantMsgPlaceholder,
            content: userErr,
            status: "error",
            errorMessage: userErr,
            isImageGenerating: false,
            generatedImage: undefined,
          };
          setConversations((prev) =>
            prev.map((c) =>
              c.id === currentConvId
                ? {
                    ...c,
                    messages: c.messages.map((m) => (m.id === assistantMsgId ? finalImageErr : m)),
                    updatedAt: Date.now(),
                  }
                : c
            )
          );
        } finally {
          setIsStreaming(false);
        }
        return;
      }

      // Prepare context for backend using intelligent history preservation
      const priorHistory = updatedMessages.slice(0, -1);
      const optimizedHistory = optimizeConversationForContext(priorHistory);

      const messagePayload = optimizedHistory.map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
      }));

      abortControllerRef.current = new AbortController();

      let accumulatedContent = "";
      let capturedSources: SearchSource[] = [];

      const personaCfg = getPersonaConfig(activePersona);
      const effectiveTemp = personaCfg.temperature ?? settings.temperature ?? 0.7;
      const recentHistoryText = priorHistory
        .slice(-3)
        .map((m) => m.content)
        .join(" ");
      const effectiveProjectId = currentConv.projectId || activeProjectId;
      let fullSystemPrompt = buildFullSystemPrompt(
        trimmed,
        recentHistoryText,
        effectiveProjectId || undefined
      );

      if (isExternalCompanyQuery) {
        fullSystemPrompt = `${fullSystemPrompt}\n\nCRITICAL ENTITY-RESOLUTION & FOUNDER DIRECTIVE:
- The user is asking about the founder, leadership, or history of an external entity (${founderResolution?.entityName || "company/organization"}).
- You MUST answer specifically, factually, and accurately about THAT entity (e.g. Google was founded by Larry Page and Sergey Brin; Microsoft by Bill Gates and Paul Allen; OpenAI by Sam Altman, etc.).
- NEVER mention or show Himanshu Maurya, Aditya Maurya, Meethi Yadav, or MEYRA AI's core team.
- NEVER display /meyra_core_team.png or any MEYRA founder disclaimers.
- If asked about 'my company' or an unknown company, state clearly that you do not have access to private user records and ask for the company name to look up its public information.`.trim();
      }

      const currentUser = chatStorage.getUser();

      try {
        await streamChatCompletion({
          messages: messagePayload,
          systemPrompt: fullSystemPrompt,
          temperature: effectiveTemp,
          model: apiStatus.model || "gemini-3.1-flash-lite",
          userId: currentUser?.id,
          enableSearch: enableSearchOverride ?? (isWebSearchActive || isTimeSensitive || isExternalCompanyQuery),
          persona: activePersona,
          signal: abortControllerRef.current.signal,
          onSources: (sources) => {
            capturedSources = sources;
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id !== currentConvId) return conv;
                return {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, searchSources: capturedSources, searchUsed: true }
                      : m
                  ),
                };
              })
            );
          },
          onChunk: (chunk: string) => {
            accumulatedContent += chunk;

            // Never expose raw internal tool JSON to user while streaming
            let displayContent = accumulatedContent;
            if (
              displayContent.includes('"action"') &&
              (displayContent.includes("dalle") || displayContent.includes("text2im"))
            ) {
              displayContent = displayContent.replace(/\{[\s\S]*"action"[\s\S]*/, "").trim();
              if (!displayContent) {
                displayContent = "Generating image...";
              }
            }

            if (isExternalCompanyQuery) {
              displayContent = sanitizeExternalEntityResponse(displayContent);
            }

            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id !== currentConvId) return conv;
                return {
                  ...conv,
                  messages: conv.messages.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content: displayContent,
                          status: "streaming",
                          searchSources: capturedSources.length > 0 ? capturedSources : undefined,
                        }
                      : m
                  ),
                };
              })
            );
          },
          onComplete: async () => {
            setIsStreaming(false);
            abortControllerRef.current = null;

            // Check if model emitted an internal dalle/image tool action payload
            if (
              accumulatedContent.includes("dalle") ||
              (accumulatedContent.includes('"action"') &&
                (accumulatedContent.includes("text2im") || accumulatedContent.includes("dalle2im")))
            ) {
              let extractedPrompt = "";
              try {
                const jsonMatch = accumulatedContent.match(/\{[\s\S]*"action"[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (typeof parsed.action_input === "string") {
                    try {
                      const inner = JSON.parse(parsed.action_input);
                      extractedPrompt = inner.prompt || inner.text || parsed.action_input;
                    } catch {
                      extractedPrompt = parsed.action_input;
                    }
                  } else if (parsed.action_input?.prompt) {
                    extractedPrompt = parsed.action_input.prompt;
                  }
                }
              } catch {
                // Fallback to user message
              }

              const cleanIntro = accumulatedContent.replace(/\{[\s\S]*"action"[\s\S]*\}/, "").trim();
              const finalPrompt = extractedPrompt || trimmed;
              const isLogo = /logo|brand|emblem|monogram/i.test(finalPrompt);

              // Set assistant message to generating state
              setConversations((prev) =>
                prev.map((conv) => {
                  if (conv.id !== currentConvId) return conv;
                  return {
                    ...conv,
                    messages: conv.messages.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            content: cleanIntro || `Generating artwork for: "${finalPrompt}"...`,
                            status: "streaming",
                            isImageGenerating: true,
                          }
                        : m
                    ),
                  };
                })
              );

              // Execute real image generation
              try {
                const currentUser = chatStorage.getUser();
                const res = await fetch("/api/image/generate", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(currentUser?.authToken ? { Authorization: `Bearer ${currentUser.authToken}` } : {}),
                  },
                  body: JSON.stringify({
                    prompt: finalPrompt,
                    aspectRatio: "1:1",
                    style: isLogo ? "Minimalist" : "Photorealistic",
                    userId: currentUser?.id,
                  }),
                });

                if (res.ok) {
                  const data = await res.json();
                  const finalImageUrl = data.imageUrl || data.image?.imageUrl;
                  if (finalImageUrl) {
                    const completedImageMsg: Message = {
                      ...assistantMsgPlaceholder,
                      content: cleanIntro
                        ? `${cleanIntro}\n\nHere is your generated image:`
                        : `Here is the artwork generated for: "${finalPrompt}".`,
                      status: "completed",
                      isImageGenerating: false,
                      generatedImage: {
                        imageUrl: finalImageUrl,
                        prompt: finalPrompt,
                        aspectRatio: "1:1",
                        style: isLogo ? "Minimalist" : "Photorealistic",
                        createdAt: Date.now(),
                      },
                    };

                    chatStorage.saveArtwork({
                      id: "art_" + Date.now(),
                      prompt: finalPrompt,
                      imageUrl: finalImageUrl,
                      aspectRatio: "1:1",
                      style: isLogo ? "Minimalist" : "Photorealistic",
                      createdAt: Date.now(),
                      userId: currentUser?.id,
                    });

                    setConversations((prev) => {
                      const final = prev.map((conv) => {
                        if (conv.id !== currentConvId) return conv;
                        const savedConv: Conversation = {
                          ...conv,
                          updatedAt: Date.now(),
                          messages: conv.messages.map((m) =>
                            m.id === assistantMsgId ? completedImageMsg : m
                          ),
                        };
                        chatStorage.saveConversation(savedConv);
                        return savedConv;
                      });
                      return final;
                    });
                    return;
                  }
                }
              } catch (imgErr) {
                console.error("Auto image generation error:", imgErr);
              }
            }

            // Normal conversational persistence
            const finalSavedContent = isExternalCompanyQuery
              ? sanitizeExternalEntityResponse(accumulatedContent)
              : accumulatedContent;

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
                          content: finalSavedContent,
                          status: "completed",
                          searchSources:
                            capturedSources.length > 0 ? capturedSources : undefined,
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
                          content:
                            accumulatedContent ||
                            "Sorry, an error occurred while connecting to MEYRA AI backend.",
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
                      content:
                        accumulatedContent ||
                        "Sorry, an error occurred while connecting to MEYRA AI backend.",
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
      buildFullSystemPrompt,
      activePersona,
      activeProjectId,
      isWebSearchActive,
      settings.temperature,
      apiStatus.model,
    ]
  );

  // Regenerate Response
  const regenerateResponse = useCallback(
    async (messageId?: string) => {
      if (!activeConversation || isStreaming) return;
      const msgs = activeConversation.messages;
      if (msgs.length === 0) return;

      let userPrompt = "";
      let userAttachments: MessageAttachment[] | undefined;
      let cutoffIndex = msgs.length;

      if (messageId) {
        const targetIdx = msgs.findIndex((m) => m.id === messageId);
        if (targetIdx >= 0) {
          if (msgs[targetIdx].role === "user") {
            userPrompt = msgs[targetIdx].content;
            userAttachments = msgs[targetIdx].attachments;
            cutoffIndex = targetIdx;
          } else {
            const priorIdx = targetIdx - 1;
            if (priorIdx >= 0 && msgs[priorIdx].role === "user") {
              userPrompt = msgs[priorIdx].content;
              userAttachments = msgs[priorIdx].attachments;
              cutoffIndex = priorIdx;
            }
          }
        }
      } else {
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === "user") {
            userPrompt = msgs[i].content;
            userAttachments = msgs[i].attachments;
            cutoffIndex = i;
            break;
          }
        }
      }

      if (!userPrompt && (!userAttachments || userAttachments.length === 0)) return;

      const trimmedHistory = msgs.slice(0, cutoffIndex);
      const updatedConv: Conversation = {
        ...activeConversation,
        messages: trimmedHistory,
      };

      chatStorage.saveConversation(updatedConv);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? updatedConv : c))
      );

      setTimeout(() => {
        sendMessage(userPrompt, userAttachments);
      }, 50);
    },
    [activeConversation, isStreaming, sendMessage]
  );

  // Filtered conversations based on search
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  return {
    conversations: filteredConversations,
    allConversations: conversations,
    activeConversation,
    activeId,
    isStreaming,
    apiStatus,
    searchQuery,
    setSearchQuery,
    activePersona,
    setPersona,
    activeProjectId,
    setActiveProject,
    isWebSearchActive,
    setIsWebSearchActive,
    createNewChat,
    selectConversation,
    renameConversation,
    togglePinConversation,
    deleteConversation,
    clearCurrentChat,
    clearAllHistory,
    sendMessage,
    stopGeneration,
    regenerateResponse,
    setConversations,
  };
}
