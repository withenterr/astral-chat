import type { OnlineUser } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface OnlineUsersListProps {
  users: OnlineUser[];
  serverOwnerId: string;
  currentUserId: string;
  onOpenDm?: (userId: string, userName: string, userColor: string) => void;
}

export function OnlineUsersList({ users, serverOwnerId, currentUserId, onOpenDm }: OnlineUsersListProps) {
  return (
    <div className="w-56 flex-shrink-0 bg-sidebar border-l border-sidebar-border flex flex-col">
      <div className="px-4 py-3 border-b border-sidebar-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Online — {users.length}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {users.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-2">No one online</p>
        ) : (
          <div className="space-y-0.5">
            {users.map((user) => {
              const isSelf = user.userId === currentUserId;
              return (
                <div
                  key={user.userId}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors group",
                    !isSelf && onOpenDm ? "hover:bg-sidebar-accent cursor-pointer" : "hover:bg-sidebar-accent/50"
                  )}
                  onClick={() => {
                    if (!isSelf && onOpenDm) {
                      onOpenDm(user.userId, user.userName, user.userColor ?? "");
                    }
                  }}
                  title={!isSelf && onOpenDm ? `Send DM to ${user.userName}` : undefined}
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: user.userColor ?? "#6366f1" }}
                    >
                      {user.userName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-sidebar rounded-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {user.userName}
                      {isSelf && (
                        <span className="text-muted-foreground font-normal text-xs ml-1">(you)</span>
                      )}
                    </p>
                    {user.userId === serverOwnerId && (
                      <p className="text-xs text-yellow-500/80">Owner</p>
                    )}
                  </div>
                  {!isSelf && onOpenDm && (
                    <svg className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
