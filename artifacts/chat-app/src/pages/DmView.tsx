import { useState, useEffect, useRef, useCallback } from "react";
import {
  useListDmMessages,
  useSendDmMessage,
  getListDmMessagesQueryKey,
} from "@workspace/api-client-react";
import type { DmConversation } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { UserIdentity } from "@/lib/identity";
import { cn } from "@/lib/utils";

interface DmViewProps {
  conversation: DmConversation;
  identity: UserIdentity;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function DmView({ conversation, identity }: DmViewProps) {
  const { userId, userName, userColor } = identity;
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const otherUser =
    conversation.userAId === userId
      ? { id: conversation.userBId, name: conversation.userBName, color: conversation.userBColor }
      : { id: conversation.userAId, name: conversation.userAName, color: conversation.userAColor };

  const { data: messages = [] } = useListDmMessages(conversation.id, undefined, {
    query: {
      enabled: !!conversation.id,
      refetchInterval: 2500,
      queryKey: getListDmMessagesQueryKey(conversation.id),
    },
  });

  const sendMsg = useSendDmMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendMsg.mutateAsync({
      conversationId: conversation.id,
      data: {
        senderId: userId,
        senderName: userName,
        senderColor: userColor ?? undefined,
        content: text,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListDmMessagesQueryKey(conversation.id) });
  }, [draft, userId, userName, userColor, conversation.id, sendMsg, queryClient]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border flex-shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: otherUser.color ?? "#6366f1" }}
        >
          {otherUser.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm leading-tight">{otherUser.name}</p>
          <p className="text-xs text-muted-foreground">Direct Message</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4"
              style={{ backgroundColor: otherUser.color ?? "#6366f1" }}
            >
              {otherUser.name.charAt(0).toUpperCase()}
            </div>
            <p className="text-foreground font-semibold mb-1">{otherUser.name}</p>
            <p className="text-muted-foreground text-sm">
              This is the beginning of your DM conversation.
            </p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMine = msg.senderId === userId;
          const prev = messages[idx - 1];
          const grouped = prev && prev.senderId === msg.senderId;
          return (
            <div
              key={msg.id}
              className={cn(
                "flex items-end gap-2 message-animate",
                isMine ? "flex-row-reverse" : "flex-row",
                grouped ? "mt-0.5" : "mt-3"
              )}
            >
              {!grouped && !isMine && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-0.5"
                  style={{ backgroundColor: msg.senderColor ?? "#6366f1" }}
                >
                  {msg.senderName.charAt(0).toUpperCase()}
                </div>
              )}
              {grouped && !isMine && <div className="w-7 flex-shrink-0" />}
              <div
                className={cn(
                  "max-w-[70%] px-3 py-2 rounded-2xl text-sm",
                  isMine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card text-card-foreground border border-card-border rounded-bl-sm"
                )}
              >
                <p className="break-words leading-relaxed">{msg.content}</p>
                <p className={cn("text-[10px] mt-0.5 text-right", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <div className="flex items-end gap-2 bg-input rounded-2xl border border-border px-4 py-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherUser.name}…`}
            className="flex-1 bg-transparent resize-none text-foreground placeholder:text-muted-foreground text-sm focus:outline-none max-h-36 overflow-y-auto"
            style={{ lineHeight: "1.5" }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
