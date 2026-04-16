import { useState, useEffect, useCallback } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useListServers,
  useCreateServer,
  useJoinServer,
  useFindServerByCode,
  useListDmConversations,
  useGetOrCreateDm,
  getListServersQueryKey,
  getListDmConversationsQueryKey,
} from "@workspace/api-client-react";
import type { Server, DmConversation } from "@workspace/api-client-react";
import { NameModal } from "@/components/NameModal";
import { ServerSidebar } from "@/components/ServerSidebar";
import { CreateServerModal } from "@/components/CreateServerModal";
import { JoinServerModal } from "@/components/JoinServerModal";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { ChatView } from "@/pages/ChatView";
import { DmView } from "@/pages/DmView";
import {
  getUserName,
  getOrCreateUserId,
  getUserColor,
  getJoinedServers,
  addJoinedServer,
  ensureIdentity,
  isAdmin,
  getTheme,
  setTheme as persistTheme,
  applyTheme,
} from "@/lib/identity";
import type { UserIdentity, Theme } from "@/lib/identity";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 0 },
  },
});

function ChatApp() {
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeDm, setActiveDm] = useState<DmConversation | null>(null);
  const [joinedServerIds, setJoinedServerIds] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [adminState, setAdminState] = useState(isAdmin());
  const [theme, setThemeState] = useState<Theme>(getTheme());

  const qc = useQueryClient();

  useEffect(() => {
    const t = getTheme();
    applyTheme(t);
    setThemeState(t);
    const userId = getOrCreateUserId();
    const userName = getUserName();
    if (!userName) {
      setShowNameModal(true);
    } else {
      const color = getUserColor(userId);
      setIdentity({ userId, userName, userColor: color });
    }
    setJoinedServerIds(getJoinedServers());
    setAdminState(isAdmin());
  }, []);

  const { data: servers = [] } = useListServers({
    query: {
      queryKey: ["servers"],
      enabled: !!identity,
      refetchInterval: 10000,
    },
  });

  const { data: dmConversations = [] } = useListDmConversations(
    identity?.userId ?? "",
    {
      query: {
        queryKey: ["servers"],
        enabled: !!identity,
        refetchInterval: 5000,
      },
    },
  );

  const createServer = useCreateServer();
  const joinServer = useJoinServer();
  const findByCode = useFindServerByCode();
  const getOrCreateDm = useGetOrCreateDm();

  const handleNameComplete = useCallback((name: string) => {
    const id = getOrCreateUserId();
    const color = getUserColor(id);
    setIdentity({ userId: id, userName: name, userColor: color });
    setShowNameModal(false);
  }, []);
  const handleThemeChange = useCallback((t: Theme) => {
    persistTheme(t);
    setThemeState(t);
  }, []);

  const handleAdminChanged = useCallback(() => {
    setAdminState(isAdmin());
  }, []);

  const handleCreateServer = useCallback(
    async (name: string) => {
      if (!identity) return;

      if (!isAdmin()) {
        throw new Error("Only admins can create group chats");
      }
      const newServer = await createServer.mutateAsync({
        data: {
          name,
          ownerId: identity.userId,
          ownerName: identity.userName,
          ownerColor: identity.userColor,
        },
      });
      addJoinedServer(newServer.id);
      setJoinedServerIds(getJoinedServers());
      setActiveServerId(newServer.id);
      setActiveDm(null);
      qc.invalidateQueries({ queryKey: getListServersQueryKey() });
    },
    [identity, createServer, qc],
  );

  const handleJoinServer = useCallback(
    async (codeOrId: string) => {
      if (!identity) return;

      let foundServer: Server | null = null;

      if (codeOrId.length <= 12 && /^[A-Z0-9]+$/i.test(codeOrId)) {
        try {
          foundServer = await findByCode.mutateAsync({
            data: { inviteCode: codeOrId.toUpperCase() },
          });
        } catch {
          foundServer = null;
        }
      }

      if (!foundServer) {
        const joinResult = await joinServer.mutateAsync({
          serverId: codeOrId,
          data: {
            userId: identity.userId,
            userName: identity.userName,
            userColor: identity.userColor,
          },
        });
        foundServer = joinResult;
      } else {
        const joinResult = await joinServer.mutateAsync({
          serverId: foundServer.id,
          data: {
            userId: identity.userId,
            userName: identity.userName,
            userColor: identity.userColor,
            inviteCode: codeOrId.toUpperCase(),
          },
        });
        foundServer = joinResult;
      }

      addJoinedServer(foundServer.id);
      setJoinedServerIds(getJoinedServers());
      setActiveServerId(foundServer.id);
      setActiveDm(null);
      qc.invalidateQueries({ queryKey: getListServersQueryKey() });
    },
    [identity, findByCode, joinServer, qc],
  );

  const handleServerDeleted = useCallback(() => {
    setActiveServerId(null);
    setJoinedServerIds(getJoinedServers());
    qc.invalidateQueries({ queryKey: getListServersQueryKey() });
  }, [qc]);

  const handleUserNameChanged = useCallback(
    (name: string) => {
      if (!identity) return;
      setIdentity({ ...identity, userName: name });
    },
    [identity],
  );

  const handleSelectDm = useCallback(async (conv: DmConversation) => {
    setActiveDm(conv);
    setActiveServerId(null);
  }, []);

  const handleOpenDmWith = useCallback(
    async (
      targetUserId: string,
      targetUserName: string,
      targetUserColor: string,
    ) => {
      if (!identity) return;
      const conv = await getOrCreateDm.mutateAsync({
        data: {
          userAId: identity.userId,
          userAName: identity.userName,
          userAColor: identity.userColor,
          userBId: targetUserId,
          userBName: targetUserName,
          userBColor: targetUserColor,
        },
      });
      setActiveDm(conv);
      setActiveServerId(null);
      qc.invalidateQueries({
        queryKey: getListDmConversationsQueryKey(identity.userId),
      });
    },
    [identity, getOrCreateDm, qc],
  );

  const handleLogout = useCallback(() => {
    window.location.reload();
  }, []);

  const handleSelectServer = useCallback((id: string) => {
    setActiveServerId(id);
    setActiveDm(null);
  }, []);

  const activeServer = servers.find((s) => s.id === activeServerId) ?? null;

  if (showNameModal) {
    return <NameModal onComplete={handleNameComplete} />;
  }

  if (!identity) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background overflow-hidden">
      <ServerSidebar
        servers={servers}
        joinedServerIds={joinedServerIds}
        activeServerId={activeServerId}
        activeDmId={activeDm?.id ?? null}
        dmConversations={dmConversations}
        currentUserId={identity.userId}
        onSelectServer={handleSelectServer}
        onSelectDm={handleSelectDm}
        onCreateServer={() => setShowCreate(true)}
        onJoinServer={() => setShowJoin(true)}
        onOpenMenu={() => setShowMenu(true)}
        isAdmin={adminState}
      />

      {activeDm ? (
        <DmView key={activeDm.id} conversation={activeDm} identity={identity} />
      ) : activeServer ? (
        <ChatView
          key={activeServer.id}
          server={activeServer}
          identity={identity}
          onServerDeleted={handleServerDeleted}
          onUserNameChanged={handleUserNameChanged}
          onOpenDmWith={handleOpenDmWith}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-background text-center px-8">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <svg
              className="w-10 h-10 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {joinedServerIds.length === 0 ? "Welcome!" : "Select a chat"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            {joinedServerIds.length === 0
              ? adminState
                ? "Create a server or join one with an invite code."
                : "Join a server with an invite code to start chatting."
              : "Pick a server or DM from the left sidebar."}
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            {adminState && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              >
                Create Server
              </button>
            )}
            <button
              onClick={() => setShowJoin(true)}
              className="px-5 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors font-medium"
            >
              Join Server
            </button>
            {!adminState && (
              <button
                onClick={() => setShowMenu(true)}
                className="px-5 py-2.5 rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
              >
                Redeem Admin Code
              </button>
            )}
          </div>
        </div>
      )}

      {showCreate && adminState && (
        <CreateServerModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateServer}
        />
      )}

      {showJoin && (
        <JoinServerModal
          onClose={() => setShowJoin(false)}
          onJoin={handleJoinServer}
        />
      )}

      {showMenu && (
        <HamburgerMenu
          open={showMenu}
          onClose={() => setShowMenu(false)}
          userName={identity.userName}
          theme={theme}
          onThemeChange={handleThemeChange}
          onNameChanged={handleUserNameChanged}
          onLogout={handleLogout}
          onAdminChanged={handleAdminChanged}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatApp />
    </QueryClientProvider>
  );
}
