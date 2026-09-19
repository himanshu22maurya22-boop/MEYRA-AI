import React, { useState } from "react";
import { Conversation } from "../../types";
import { MessageSquare, Edit2, Trash2, Check, X, Pin, PinOff } from "lucide-react";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onTogglePin?: (id: string) => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
  onTogglePin,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);

  const handleSaveRename = (e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRename(conversation.id, editTitle.trim());
      setIsEditing(false);
    }
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(conversation.title);
    setIsEditing(false);
  };

  return (
    <div
      id={`sidebar-chat-item-${conversation.id}`}
      onClick={() => {
        if (!isEditing) onSelect();
      }}
      className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer select-none ${
        isActive
          ? "bg-indigo-500/15 border border-indigo-500/30 text-indigo-100 shadow-sm"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
      }`}
    >
      {isEditing ? (
        <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRename(e);
              if (e.key === "Escape") handleCancelRename(e as any);
            }}
            className="flex-1 px-2 py-1 rounded-lg bg-[#1a1a1f] text-white text-xs border border-indigo-500/50 outline-none"
          />
          <button
            onClick={handleSaveRename}
            className="p-1 hover:text-emerald-400 text-slate-300 cursor-pointer"
            title="Save"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCancelRename}
            className="p-1 hover:text-rose-400 text-slate-300 cursor-pointer"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <MessageSquare
              className={`w-3.5 h-3.5 shrink-0 ${
                isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"
              }`}
            />
            <span className="truncate text-xs">{conversation.title || "New Chat"}</span>
            {conversation.isPinned && (
              <Pin className="w-3 h-3 text-amber-400 shrink-0 fill-amber-400/20" />
            )}
          </div>

          {/* Action buttons (Pin / Rename / Delete) */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
            {onTogglePin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(conversation.id);
                }}
                className="p-1 text-slate-400 hover:text-amber-300 hover:bg-white/10 rounded transition-colors cursor-pointer"
                title={conversation.isPinned ? "Unpin chat" : "Pin chat to top"}
              >
                {conversation.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Rename conversation"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conversation.id);
              }}
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Delete conversation"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
