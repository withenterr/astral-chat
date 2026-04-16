import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMessages,
  useCreateMessage,
  useDeleteMessage,
  useGetOnlineUsers,
  useGetTypingUsers,
  useUpdatePresence,
  useSendTypingIndicator,
  useGetServer,
  getListMessagesQueryKey,
  getGetOnlineUsersQueryKey,
  getGetTypingUsersQueryKey,
} from "@workspace/api-client-react";
import type { Server } from "@workspace/api-client-react";
import { MessageList } from "@/components/MessageList";
import { MessageInput } from "@/components/MessageInput";
import { OnlineUsersList } from "@/components/OnlineUsersList";
import { ServerSettings } from "@/components/ServerSettings";
import type { UserIdentity } from "@/lib/identity";

interface ChatViewProps {
  server: Server;
  identity: UserIdentity;
  onServerDeleted: () => void;
  onUserNameChanged: (name: string) => void;
  onOpenDmWith?: (userId: string, userName: string, userColor: string) => void;
}

export function ChatView({
  server,
  identity,
  onServerDeleted,
  onUserNameChanged,
  onOpenDmWith,
}: ChatViewProps) {
  const { userId, userName, userColor } = identity;
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const presenceInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: serverData } = useGetServer(server.id, {
    query: {
      queryKey: ["server", server.id],
      refetchInterval: 30000,
      initialData: server,
    },
  });
  const currentServer = serverData ?? server;

  const { data: messages = [] } = useListMessages(server.id, undefined, {
    query: {
      enabled: !!server.id,
      refetchInterval: 3000,
      queryKey: getListMessagesQueryKey(server.id),
    },
  });

  const { data: onlineUsers = [] } = useGetOnlineUsers(server.id, {
    query: {
      enabled: !!server.id,
      refetchInterval: 10000,
      queryKey: getGetOnlineUsersQueryKey(server.id),
    },
  });

  const { data: typingUsers = [] } = useGetTypingUsers(server.id, {
    query: {
      enabled: !!server.id,
      refetchInterval: 2000,
      queryKey: getGetTypingUsersQueryKey(server.id),
    },
  });

  const createMessage = useCreateMessage();
  const deleteMessage = useDeleteMessage();
  const updatePresence = useUpdatePresence();
  const sendTyping = useSendTypingIndicator();

  useEffect(() => {
    async function heartbeat() {
      await updatePresence.mutateAsync({
        serverId: server.id,
        data: { userId, userName, userColor },
      });
      queryClient.invalidateQueries({
        queryKey: getGetOnlineUsersQueryKey(server.id),
      });
    }

    heartbeat();
    presenceInterval.current = setInterval(heartbeat, 15000);
    return () => {
      if (presenceInterval.current) clearInterval(presenceInterval.current);
    };
  }, [server.id, userId, userName, userColor]);

  const handleSend = useCallback(
    async (content: string) => {
      await createMessage.mutateAsync({
        serverId: server.id,
        data: { userId, userName, userColor, content },
      });
      queryClient.invalidateQueries({
        queryKey: getListMessagesQueryKey(server.id),
      });
    },
    [server.id, userId, userName, userColor, createMessage, queryClient],
  );

  const handleDelete = useCallback(
    async (messageId: string) => {
      await deleteMessage.mutateAsync({
        serverId: server.id,
        messageId,
        data: { requesterId: userId },
      });
      queryClient.invalidateQueries({
        queryKey: getListMessagesQueryKey(server.id),
      });
    },
    [server.id, userId, deleteMessage, queryClient],
  );

  const handleTypingChange = useCallback(
    (isTyping: boolean) => {
      sendTyping
        .mutateAsync({
          serverId: server.id,
          data: { userId, userName, isTyping },
        })
        .catch(() => {});
    },
    [server.id, userId, userName, sendTyping],
  );

  const filteredTypingUsers = typingUsers.filter((u) => u.userId !== userId);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0 bg-card/50">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
            />
          </svg>
          <h2 className="font-semibold text-foreground">
            {currentServer.name}
          </h2>
          <span className="text-xs text-muted-foreground">
            {currentServer.memberCount} members
          </span>
        </div>
        <div className="flex items-center gap-2">
          {currentServer.ownerId === userId && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
              Owner
            </span>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
            title="Server Settings"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col flex-1 min-w-0">
          <MessageList
            messages={messages}
            currentUserId={userId}
            serverOwnerId={currentServer.ownerId}
            onDeleteMessage={handleDelete}
          />
          <MessageInput
            serverName={currentServer.name}
            onSend={handleSend}
            onTypingChange={handleTypingChange}
            typingUsers={filteredTypingUsers}
          />
        </div>

        <OnlineUsersList
          users={onlineUsers}
          serverOwnerId={currentServer.ownerId}
          currentUserId={userId}
          onOpenDm={onOpenDmWith}
        />
      </div>

      {showSettings && (
        <ServerSettings
          server={currentServer}
          currentUserId={userId}
          currentUserName={userName}
          onClose={() => setShowSettings(false)}
          onServerDeleted={onServerDeleted}
          onUserNameChanged={onUserNameChanged}
        />
      )}
    </div>
  );
}
