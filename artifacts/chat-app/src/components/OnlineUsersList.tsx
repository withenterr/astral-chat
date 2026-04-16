import type { OnlineUser } from "@workspace/api-client-react";

interface OnlineUsersListProps {
  users: OnlineUser[];
  serverOwnerId: string;
  currentUserId: string;
}

export function OnlineUsersList({ users, serverOwnerId, currentUserId }: OnlineUsersListProps) {
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
            {users.map((user) => (
              <div
                key={user.userId}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
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
                <div className="min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user.userName}
                    {user.userId === currentUserId && (
                      <span className="text-muted-foreground font-normal text-xs ml-1">(you)</span>
                    )}
                  </p>
                  {user.userId === serverOwnerId && (
                    <p className="text-xs text-yellow-500/80">Owner</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
