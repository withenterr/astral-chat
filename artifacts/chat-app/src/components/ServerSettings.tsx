import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateServer,
  useDeleteServer,
  useGenerateInviteCode,
  useGenerateTransferCode,
  useRedeemTransferCode,
  getListServersQueryKey,
  getGetServerQueryKey,
} from "@workspace/api-client-react";
import type { Server } from "@workspace/api-client-react";
import { getUserName, setUserName } from "@/lib/identity";
import { removeJoinedServer } from "@/lib/identity";

interface ServerSettingsProps {
  server: Server;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onServerDeleted: () => void;
  onUserNameChanged: (name: string) => void;
}

export function ServerSettings({
  server,
  currentUserId,
  currentUserName,
  onClose,
  onServerDeleted,
  onUserNameChanged,
}: ServerSettingsProps) {
  const queryClient = useQueryClient();
  const isOwner = server.ownerId === currentUserId;

  const [newName, setNewName] = useState(server.name);
  const [renamingServer, setRenamingServer] = useState(false);

  const [displayName, setDisplayName] = useState(currentUserName);
  const [savingName, setSavingName] = useState(false);

  const [inviteCode, setInviteCode] = useState(server.inviteCode);
  const [transferCode, setTransferCode] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemError, setRedeemError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const updateServer = useUpdateServer();
  const deleteServer = useDeleteServer();
  const generateInvite = useGenerateInviteCode();
  const generateTransfer = useGenerateTransferCode();
  const redeemTransfer = useRedeemTransferCode();

  function invalidateServers() {
    queryClient.invalidateQueries({ queryKey: getListServersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetServerQueryKey(server.id) });
  }

  async function handleRenameServer() {
    if (!newName.trim() || newName.trim() === server.name) return;
    setRenamingServer(true);
    try {
      await updateServer.mutateAsync({
        serverId: server.id,
        data: { name: newName.trim(), requesterId: currentUserId },
      });
      invalidateServers();
    } finally {
      setRenamingServer(false);
    }
  }

  async function handleDeleteServer() {
    if (!confirm(`Delete server "${server.name}"? This cannot be undone.`)) return;
    await deleteServer.mutateAsync({
      serverId: server.id,
      data: { requesterId: currentUserId },
    });
    removeJoinedServer(server.id);
    invalidateServers();
    onServerDeleted();
    onClose();
  }

  async function handleGenerateInvite() {
    const res = await generateInvite.mutateAsync({
      serverId: server.id,
      data: { requesterId: currentUserId },
    });
    setInviteCode(res.inviteCode);
    invalidateServers();
  }

  async function handleGenerateTransfer() {
    const res = await generateTransfer.mutateAsync({
      serverId: server.id,
      data: { requesterId: currentUserId },
    });
    setTransferCode(res.transferCode);
  }

  async function handleRedeemTransfer() {
    setRedeemError("");
    try {
      await redeemTransfer.mutateAsync({
        serverId: server.id,
        data: { userId: currentUserId, userName: currentUserName, transferCode: redeemCode },
      });
      invalidateServers();
      onClose();
    } catch (err: any) {
      setRedeemError(err?.message ?? "Invalid or expired transfer code.");
    }
  }

  function handleSaveDisplayName() {
    if (!displayName.trim()) return;
    setSavingName(true);
    setUserName(displayName.trim());
    onUserNameChanged(displayName.trim());
    setTimeout(() => setSavingName(false), 500);
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">{server.name} — Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Your Profile</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={32}
                className="flex-1 px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSaveDisplayName}
                disabled={!displayName.trim() || savingName}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {savingName ? "Saved!" : "Save"}
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Invite Code</h3>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-foreground text-sm font-mono tracking-wider border border-border">
                {inviteCode}
              </code>
              <button
                onClick={() => copyToClipboard(inviteCode, "invite")}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors whitespace-nowrap"
              >
                {copied === "invite" ? "Copied!" : "Copy"}
              </button>
            </div>
            {isOwner && (
              <button
                onClick={handleGenerateInvite}
                className="mt-2 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Generate new invite code
              </button>
            )}
          </section>

          {isOwner && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Server Management</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    maxLength={50}
                    className="flex-1 px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleRenameServer}
                    disabled={!newName.trim() || newName.trim() === server.name || renamingServer}
                    className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                  >
                    {renamingServer ? "Saving..." : "Rename"}
                  </button>
                </div>

                <div>
                  <button
                    onClick={handleGenerateTransfer}
                    className="text-sm text-muted-foreground hover:text-yellow-400 transition-colors"
                  >
                    Generate ownership transfer code
                  </button>
                  {transferCode && (
                    <div className="mt-2 flex gap-2">
                      <code className="flex-1 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-mono tracking-wider">
                        {transferCode}
                      </code>
                      <button
                        onClick={() => copyToClipboard(transferCode, "transfer")}
                        className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors whitespace-nowrap"
                      >
                        {copied === "transfer" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleDeleteServer}
                  className="text-sm text-destructive hover:text-destructive/80 transition-colors"
                >
                  Delete this server
                </button>
              </div>
            </section>
          )}

          {!isOwner && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Redeem Transfer Code</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  placeholder="Enter transfer code..."
                  className="flex-1 px-3 py-2 rounded-lg bg-input border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleRedeemTransfer}
                  disabled={!redeemCode.trim()}
                  className="px-4 py-2 rounded-lg bg-yellow-500 text-black text-sm font-medium hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                >
                  Redeem
                </button>
              </div>
              {redeemError && <p className="text-xs text-destructive mt-1">{redeemError}</p>}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
