import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Theme } from "@/lib/identity";
import { redeemAdminCode, isAdmin, revokeAdmin, resetIdentity, setUserName } from "@/lib/identity";

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  onNameChanged: (name: string) => void;
  onLogout: () => void;
  onAdminChanged: () => void;
}

export function HamburgerMenu({
  open,
  onClose,
  userName,
  theme,
  onThemeChange,
  onNameChanged,
  onLogout,
  onAdminChanged,
}: HamburgerMenuProps) {
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState(false);
  const [nameInput, setNameInput] = useState(userName);
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemMsg, setRedeemMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [adminStatus, setAdminStatus] = useState(isAdmin());
  const [editingName, setEditingName] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setAnimating(false);
      setNameInput(userName);
      setAdminStatus(isAdmin());
    }
  }, [open, userName]);

  function handleClose() {
    setAnimating(true);
    setTimeout(() => {
      setVisible(false);
      setAnimating(false);
      onClose();
    }, 200);
  }

  function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setUserName(trimmed);
    onNameChanged(trimmed);
    setEditingName(false);
  }

  function handleRedeem() {
    const ok = redeemAdminCode(redeemInput.trim());
    if (ok) {
      setRedeemMsg({ text: "Admin privileges granted!", ok: true });
      setAdminStatus(true);
      onAdminChanged();
    } else {
      setRedeemMsg({ text: "Invalid code. Try again.", ok: false });
    }
    setRedeemInput("");
    setTimeout(() => setRedeemMsg(null), 3000);
  }

  function handleRevokeAdmin() {
    revokeAdmin();
    setAdminStatus(false);
    onAdminChanged();
  }

  function handleLogout() {
    resetIdentity();
    onLogout();
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/50 menu-overlay-in"
        onClick={handleClose}
      />
      <div
        ref={menuRef}
        className={cn(
          "relative w-80 max-w-[85vw] h-full bg-popover border-r border-popover-border shadow-2xl flex flex-col overflow-y-auto",
          animating ? "menu-slide-out" : "menu-slide-in"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Menu</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 px-4 py-4 space-y-5">
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Profile</p>
            <div className="bg-card rounded-xl border border-card-border p-3 space-y-2">
              {editingName ? (
                <div className="space-y-2">
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    autoFocus
                    placeholder="Display name"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveName}
                      className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      className="flex-1 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEditingName(true)}
                  className="w-full flex items-center gap-3 text-left hover:bg-secondary rounded-lg px-2 py-1.5 transition-colors"
                >
                  <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="flex-1 text-sm text-foreground truncate">{userName}</span>
                  <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {adminStatus && (
                <div className="flex items-center gap-2 px-2">
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
                </div>
              )}
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Appearance</p>
            <div className="bg-card rounded-xl border border-card-border p-1">
              <button
                onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  {theme === "dark" ? (
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 6.343l-.707-.707m12.728 12.728l-.707-.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  <span className="text-sm text-foreground">{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
                </div>
                <div className={cn(
                  "w-10 h-5 rounded-full transition-colors relative",
                  theme === "dark" ? "bg-primary" : "bg-muted"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all",
                    theme === "dark" ? "left-5" : "left-0.5"
                  )} />
                </div>
              </button>
            </div>
          </section>

          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Admin</p>
            <div className="bg-card rounded-xl border border-card-border p-3 space-y-2">
              {adminStatus ? (
                <div className="space-y-2">
                  <p className="text-sm text-foreground">You have admin privileges.</p>
                  <button
                    onClick={handleRevokeAdmin}
                    className="w-full py-1.5 rounded-lg border border-destructive text-destructive text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    Revoke Admin
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="password"
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={redeemInput}
                    onChange={(e) => setRedeemInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRedeem()}
                    placeholder="Enter admin code…"
                  />
                  {redeemMsg && (
                    <p className={cn("text-xs font-medium", redeemMsg.ok ? "text-green-500" : "text-destructive")}>
                      {redeemMsg.text}
                    </p>
                  )}
                  <button
                    onClick={handleRedeem}
                    className="w-full py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Redeem Code
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="px-4 pb-6 pt-2 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Reset Guest Identity
          </button>
        </div>
      </div>
    </div>
  );
}
