import { useState, useEffect, useCallback } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  useListServers,
  useCreateServer,
  useJoinServer,
  useFindServerByCode,
  getListServersQueryKey,
} from "@workspace/api-client-react";
import type { Server } from "@workspace/api-client-react";
import { NameModal } from "@/components/NameModal";
import { ServerSidebar } from "@/components/ServerSidebar";
import { CreateServerModal } from "@/components/CreateServerModal";
import { JoinServerModal } from "@/components/JoinServerModal";
import { ChatView } from "@/pages/ChatView";
import {
  getUserName,
  getOrCreateUserId,
  getUserColor,
  getJoinedServers,
  addJoinedServer,
  ensureIdentity,
} from "@/lib/identity";
import type { UserIdentity } from "@/lib/identity";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 0 },
  },
});

function ChatApp() {
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [joinedServerIds, setJoinedServerIds] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [noServersHint, setNoServersHint] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const userId = getOrCreateUserId();
    const userName = getUserName();
    if (!userName) {
      setShowNameModal(true);
    } else {
      const color = getUserColor(userId);
      setIdentity({ userId, userName, userColor: color });
    }
    setJoinedServerIds(getJoinedServers());
  }, []);

  const { data: servers = [] } = useListServers({
    query: {
      enabled: !!identity,
      refetchInterval: 10000,
    },
  });

  const createServer = useCreateServer();
  const joinServer = useJoinServer();
  const findByCode = useFindServerByCode();

  const handleNameComplete = useCallback((name: string) => {
    const id = getOrCreateUserId();
    const color = getUserColor(id);
    setIdentity({ userId: id, userName: name, userColor: color });
    setShowNameModal(false);
  }, []);

  const handleCreateServer = useCallback(async (name: string) => {
    if (!identity) return;
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
    queryClient.invalidateQueries({ queryKey: getListServersQueryKey() });
  }, [identity, createServer, queryClient]);

  const handleJoinServer = useCallback(async (codeOrId: string) => {
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
    queryClient.invalidateQueries({ queryKey: getListServersQueryKey() });
  }, [identity, findByCode, joinServer, queryClient]);

  const handleServerDeleted = useCallback(() => {
    setActiveServerId(null);
    setJoinedServerIds(getJoinedServers());
    queryClient.invalidateQueries({ queryKey: getListServersQueryKey() });
  }, [queryClient]);

  const handleUserNameChanged = useCallback((name: string) => {
    if (!identity) return;
    setIdentity({ ...identity, userName: name });
  }, [identity]);

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
        onSelectServer={setActiveServerId}
        onCreateServer={() => setShowCreate(true)}
        onJoinServer={() => setShowJoin(true)}
      />

      {activeServer ? (
        <ChatView
          key={activeServer.id}
          server={activeServer}
          identity={identity}
          onServerDeleted={handleServerDeleted}
          onUserNameChanged={handleUserNameChanged}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-background text-center px-8">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {joinedServerIds.length === 0 ? "No servers yet" : "Select a server"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs">
            {joinedServerIds.length === 0
              ? "Create a new server or join one with an invite code to start chatting."
              : "Pick a server from the left sidebar to start chatting."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Create Server
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="px-5 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors font-medium"
            >
              Join Server
            </button>
          </div>
        </div>
      )}

      {showCreate && (
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
