import React, { useRef, useEffect, useState } from "react";
import { Message } from "../../types";
import { MessageItem } from "./MessageItem";
import { WelcomeScreen } from "./WelcomeScreen";
import { MessageComposer } from "./MessageComposer";
import { TypingIndicator } from "./TypingIndicator";
import { ArrowDown } from "lucide-react";

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  isApiConfigured: boolean;
  onSendMessage: (text: string) => void;
  onStopGeneration: () => void;
  onRegenerate: (messageId?: string) => void;
  onClearChat: () => void;
  onOpenSettings: () => void;
  userDisplayName?: string;
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
  userDisplayName = "User",
  userAvatarColor = "cyan",
  enterToSend = true,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
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
      {/* Scrollable Message List */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
      >
        {!hasMessages ? (
          <WelcomeScreen
            onSelectPrompt={onSendMessage}
            isApiConfigured={isApiConfigured}
            onOpenSettings={onOpenSettings}
          />
        ) : (
          <div className="flex-1 pb-4">
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
                  userAvatarColor={userAvatarColor}
                />
              );
            })}

            {/* Live Typing / Thinking wave if last message is still starting */}
            {isStreaming &&
              messages.length > 0 &&
              messages[messages.length - 1].role === "assistant" &&
              !messages[messages.length - 1].content && (
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2">
                  <TypingIndicator />
                </div>
              )}

            <div ref={bottomAnchorRef} className="h-4" />
          </div>
        )}
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

      {/* Message Composer Area */}
      <MessageComposer
        onSendMessage={onSendMessage}
        onStopGeneration={onStopGeneration}
        onClearChat={onClearChat}
        isStreaming={isStreaming}
        enterToSend={enterToSend}
        hasMessages={hasMessages}
      />
    </main>
  );
};
