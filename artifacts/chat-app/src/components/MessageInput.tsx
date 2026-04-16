import { useState, useRef, useCallback } from "react";

interface MessageInputProps {
  serverName: string;
  onSend: (content: string) => Promise<void>;
  onTypingChange: (isTyping: boolean) => void;
  typingUsers: Array<{ userId: string; userName: string }>;
  disabled?: boolean;
}

const EMOJIS = ["😀", "😂", "❤️", "🔥", "👍", "😍", "🎉", "😭", "😎", "🤔", "💯", "🙏", "✨", "🚀", "💀", "😤", "🥹", "😮", "👏", "🫡"];

export function MessageInput({ serverName, onSend, onTypingChange, typingUsers, disabled }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingChange(true);
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingChange(false);
    }, 2000);
  }, [onTypingChange]);

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || sending || disabled) return;

    setSending(true);
    setContent("");
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingChange(false);
    }

    try {
      await onSend(trimmed);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    if (e.target.value.trim()) handleTyping();
  }

  function insertEmoji(emoji: string) {
    setContent((prev) => prev + emoji);
    setShowEmoji(false);
  }

  const typingText =
    typingUsers.length === 0
      ? null
      : typingUsers.length === 1
      ? `${typingUsers[0].userName} is typing...`
      : typingUsers.length === 2
      ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`
      : "Several people are typing...";

  return (
    <div className="px-4 pb-4 pt-2 flex-shrink-0">
      <div className="h-5 mb-1.5">
        {typingText && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex gap-0.5">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
            <span>{typingText}</span>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 bg-input border border-border rounded-xl px-4 py-2 focus-within:border-primary/50 transition-colors">
        <textarea
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${serverName.toLowerCase().replace(/\s+/g, "-")}`}
          disabled={disabled || sending}
          rows={1}
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm resize-none outline-none max-h-32 leading-relaxed py-1"
          style={{ scrollbarWidth: "none" }}
        />

        <div className="flex items-center gap-1 mb-0.5">
          <div className="relative">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
              title="Emoji"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showEmoji && (
              <div className="absolute bottom-full right-0 mb-2 bg-popover border border-popover-border rounded-xl p-3 shadow-xl grid grid-cols-5 gap-1 z-50 w-48">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="text-lg hover:bg-muted rounded p-1 transition-colors leading-none"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!content.trim() || sending || disabled}
            className="p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-40 hover:opacity-90 transition-all active:scale-95"
            title="Send message"
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
