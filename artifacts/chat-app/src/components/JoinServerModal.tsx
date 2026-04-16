import { useState } from "react";

interface JoinServerModalProps {
  onClose: () => void;
  onJoin: (codeOrId: string) => Promise<void>;
}

export function JoinServerModal({ onClose, onJoin }: JoinServerModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onJoin(code.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || "Server not found or invalid code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md mx-4 bg-card border border-border rounded-xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Join a Server</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1.5">Invite Code or Server ID</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter invite code or server ID..."
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1.5">Ask the server owner for their invite code.</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors font-medium">
              Cancel
            </button>
            <button type="submit" disabled={!code.trim() || loading} className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? "Joining..." : "Join Server"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
