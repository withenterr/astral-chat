import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Server } from "@workspace/api-client-react";

interface ServerSidebarProps {
  servers: Server[];
  joinedServerIds: string[];
  activeServerId: string | null;
  onSelectServer: (id: string) => void;
  onCreateServer: () => void;
  onJoinServer: () => void;
}

export function ServerSidebar({
  servers,
  joinedServerIds,
  activeServerId,
  onSelectServer,
  onCreateServer,
  onJoinServer,
}: ServerSidebarProps) {
  const joinedServers = servers.filter((s) => joinedServerIds.includes(s.id));

  function getInitials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }

  function getServerColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hues = [252, 180, 142, 35, 290, 320, 200, 160];
    const hue = hues[Math.abs(hash) % hues.length];
    return `hsl(${hue}, 70%, 45%)`;
  }

  return (
    <div className="w-[72px] flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-3 gap-2 overflow-y-auto">
      {joinedServers.map((server) => (
        <button
          key={server.id}
          onClick={() => onSelectServer(server.id)}
          title={server.name}
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-150 relative group",
            activeServerId === server.id
              ? "rounded-xl text-white shadow-lg shadow-primary/30"
              : "text-white/80 hover:rounded-xl"
          )}
          style={{
            backgroundColor: getServerColor(server.name),
          }}
        >
          {getInitials(server.name)}
          {activeServerId === server.id && (
            <span className="absolute -left-[3px] w-1 h-8 bg-white rounded-r-full" />
          )}
          <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg transition-opacity">
            {server.name}
          </span>
        </button>
      ))}

      <div className="w-8 h-px bg-sidebar-border my-1" />

      <button
        onClick={onCreateServer}
        title="Create Server"
        className="w-12 h-12 rounded-2xl bg-sidebar-accent text-green-400 hover:rounded-xl hover:bg-green-500 hover:text-white transition-all duration-150 flex items-center justify-center group relative"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
          Create Server
        </span>
      </button>

      <button
        onClick={onJoinServer}
        title="Join Server"
        className="w-12 h-12 rounded-2xl bg-sidebar-accent text-blue-400 hover:rounded-xl hover:bg-blue-500 hover:text-white transition-all duration-150 flex items-center justify-center group relative"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
          Join Server
        </span>
      </button>
    </div>
  );
}
