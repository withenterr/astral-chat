import { useEffect, useRef } from "react";
import { formatTime, formatDate } from "@/lib/utils";
import type { Message } from "@workspace/api-client-react";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  serverOwnerId: string;
  onDeleteMessage: (messageId: string) => void;
}

export function MessageList({ messages, currentUserId, serverOwnerId, onDeleteMessage }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length !== prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      prevLengthRef.current = messages.length;
    }
  }, [messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, []);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-muted-foreground font-medium">No messages yet</p>
          <p className="text-muted-foreground text-sm mt-1">Be the first to say something!</p>
        </div>
      </div>
    );
  }

  let lastDate = "";

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
      {messages.map((msg, idx) => {
        const msgDate = formatDate(msg.createdAt);
        const showDateSep = msgDate !== lastDate;
        if (showDateSep) lastDate = msgDate;

        const prev = messages[idx - 1];
        const isGrouped =
          prev &&
          prev.userId === msg.userId &&
          !showDateSep &&
          new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;

        const canDelete = msg.userId === currentUserId || serverOwnerId === currentUserId;

        return (
          <div key={msg.id}>
            {showDateSep && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium px-2">{msgDate}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <div className={`group flex items-start gap-3 px-2 py-0.5 rounded-lg hover:bg-muted/30 transition-colors message-animate ${isGrouped ? "mt-0.5" : "mt-3"}`}>
              {!isGrouped ? (
                <div
                  className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
                  style={{ backgroundColor: msg.userColor ?? "#6366f1" }}
                >
                  {msg.userName.slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <div className="w-9 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                {!isGrouped && (
                  <div className="flex items-baseline gap-2 mb-1">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: msg.userColor ?? "hsl(var(--primary))" }}
                    >
                      {msg.userName}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
                  </div>
                )}
                <p className="text-sm text-foreground leading-relaxed break-words whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
              {canDelete && (
                <button
                  onClick={() => onDeleteMessage(msg.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-destructive/20 hover:text-destructive text-muted-foreground flex-shrink-0"
                  title="Delete message"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
