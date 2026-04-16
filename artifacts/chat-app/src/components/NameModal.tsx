import { useState } from "react";
import { setUserName } from "@/lib/identity";

interface NameModalProps {
  onComplete: (name: string) => void;
}

export function NameModal({ onComplete }: NameModalProps) {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalName = name.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    setUserName(finalName);
    onComplete(finalName);
  }

  function handleSkip() {
    const guestName = `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    setUserName(guestName);
    onComplete(guestName);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Welcome to Chat</h2>
          <p className="text-muted-foreground mt-2 text-sm">Choose a display name to get started. No account needed.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your display name..."
              maxLength={32}
              autoFocus
              className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 px-4 py-3 rounded-lg border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-sm font-medium"
            >
              Skip (Guest)
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Start Chatting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
