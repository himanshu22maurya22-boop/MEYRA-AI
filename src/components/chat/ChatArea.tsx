import React, { useRef, useEffect, useState } from "react";
import { Message, MessageAttachment } from "../../types";
import { MessageItem } from "./MessageItem";
import { WelcomeScreen } from "./WelcomeScreen";
import { MessageComposer } from "./MessageComposer";
import { TypingIndicator } from "./TypingIndicator";
import { ArrowDown } from "lucide-react";

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  isApiConfigured: boolean;
  onSendMessage: (text: string, attachments?: MessageAttachment[], enableSearch?: boolean) => void;
  onStopGeneration: () => void;
  onRegenerate: (messageId?: string) => void;
  onClearChat: () => void;
  onOpenSettings: () => void;
  onOpenVoiceMode?: () => void;
  onOpenImageGen?: () => void;
  onOpenProjects?: () => void;
  isWebSearchActive?: boolean;
  onToggleWebSearch?: () => void;
  userDisplayName?: string;
  userPhotoUrl?: string;
  userAvatarColor?: string;
  enterToSend?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isStreaming,
  isApiConfigured,
  onSendMessage,
  onStopGeneration,
  onRegenerate,
  onClearChat,
  onOpenSettings,
  onOpenVoiceMode,
  onOpenImageGen,
  onOpenProjects,
  isWebSearchActive,
  onToggleWebSearch,
  userDisplayName = "User",
  userPhotoUrl,
  userAvatarColor = "cyan",
  enterToSend = true,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [composerPrefill, setComposerPrefill] = useState<string>("");
  const userHasScrolledUpRef = useRef(false);

  // Auto-scroll when messages update or stream
  useEffect(() => {
    if (!userHasScrolledUpRef.current) {
      bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isStreaming]);

  // Handle scroll listener to detect if user scrolled up
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

    if (distanceFromBottom > 120) {
      userHasScrolledUpRef.current = true;
      setShowScrollBottom(true);
    } else {
      userHasScrolledUpRef.current = false;
      setShowScrollBottom(false);
    }
  };

  const scrollToBottom = () => {
    userHasScrolledUpRef.current = false;
    setShowScrollBottom(false);
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const hasMessages = messages.length > 0;

  return (
    <main
      id="meyra-main-chat-area"
      className="flex-1 flex flex-col h-full min-w-0 bg-[#0A0A0B] relative overflow-hidden"
    >
      {!hasMessages ? (
        /* ========================================================================= */
        /* 1. HOME SCREEN: Centered Circular Hero + Feature Pills + Suggestions + Composer */
        /* ========================================================================= */
        <div
          id="meyra-home-container"
          className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center justify-between px-3 sm:px-6 py-2 sm:py-4 w-full animate-fade-in"
        >
          {/* Centered Minimal Personalized Greeting & Suggestion Chips */}
          <div className="w-full flex-1 flex flex-col items-center justify-center my-auto py-2 sm:py-6">
            <WelcomeScreen
              onSelectPrompt={(text) => setComposerPrefill(text)}
              userDisplayName={userDisplayName}
              isApiConfigured={isApiConfigured}
              onOpenSettings={onOpenSettings}
              onOpenVoiceMode={onOpenVoiceMode}
              onOpenImageGen={onOpenImageGen}
              onOpenProjects={onOpenProjects}
            />
          </div>

          {/* Composer placed cleanly near bottom of the screen */}
          <div className="w-full max-w-3xl pb-2 sm:pb-3 shrink-0">
            <MessageComposer
              onSendMessage={onSendMessage}
              onStopGeneration={onStopGeneration}
              onClearChat={onClearChat}
              onOpenVoiceMode={onOpenVoiceMode}
              isStreaming={isStreaming}
              enterToSend={enterToSend}
              hasMessages={false}
              isWebSearchActive={isWebSearchActive}
              onToggleWebSearch={onToggleWebSearch}
              externalInput={composerPrefill}
              onExternalInputHandled={() => setComposerPrefill("")}
            />
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. CHAT SCREEN: Active Conversation + Scrollable Messages + Sticky Composer */
        /* ========================================================================= */
        <div
          id="meyra-chat-conversation-view"
          className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative animate-fade-in"
        >
          {/* Scrollable Message List */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
          >
            <div className="flex-1 pb-4 pt-2">
              {messages.map((msg, index) => {
                const isLast = index === messages.length - 1;
                return (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreaming && isLast && msg.role === "assistant"}
                    onRegenerate={
                      !isStreaming && msg.role === "assistant"
                        ? () => onRegenerate(msg.id)
                        : undefined
                    }
                    userDisplayName={userDisplayName}
                    userPhotoUrl={userPhotoUrl}
                    userAvatarColor={userAvatarColor}
                  />
                );
              })}

              {/* Live Typing / Thinking wave if last message is still starting */}
              {isStreaming &&
                messages.length > 0 &&
                messages[messages.length - 1].role === "assistant" &&
                !messages[messages.length - 1].content && (
                  <div className="w-full px-4 sm:px-6 py-2 flex justify-start">
                    <div className="flex items-center gap-2">
                      <TypingIndicator />
                    </div>
                  </div>
                )}

              <div ref={bottomAnchorRef} className="h-4" />
            </div>
          </div>

          {/* Floating Scroll-to-Bottom button */}
          {showScrollBottom && (
            <button
              id="scroll-to-bottom-btn"
              type="button"
              onClick={scrollToBottom}
              className="absolute bottom-28 right-6 z-20 p-2.5 rounded-full bg-[#1a1a1f] hover:bg-[#25252b] text-indigo-400 border border-white/10 shadow-xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              title="Scroll to newest message"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          )}

          {/* Fixed / Sticky Composer at bottom */}
          <div className="shrink-0 bg-[#0A0A0B]/95 backdrop-blur-md border-t border-white/5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
            <MessageComposer
              onSendMessage={onSendMessage}
              onStopGeneration={onStopGeneration}
              onClearChat={onClearChat}
              onOpenVoiceMode={onOpenVoiceMode}
              isStreaming={isStreaming}
              enterToSend={enterToSend}
              hasMessages={true}
              isWebSearchActive={isWebSearchActive}
              onToggleWebSearch={onToggleWebSearch}
            />
          </div>
        </div>
      )}
    </main>
  );
};
