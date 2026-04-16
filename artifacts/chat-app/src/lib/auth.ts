import { useEffect, useState } from "react";

export type ChatUser = {
  id: string;
  name: string;
  color: string;
};

// Simple hash to generate a vibrant HSL color for dark mode
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 80%, 65%)`;
}

function generateId(): string {
  return crypto.randomUUID();
}

export function getUserIdentity(): ChatUser | null {
  const id = localStorage.getItem("chat_user_id");
  const name = localStorage.getItem("chat_user_name");
  const color = localStorage.getItem("chat_user_color");

  if (!id || !name || !color) {
    return null;
  }

  return { id, name, color };
}

export function setUserIdentity(name: string): ChatUser {
  let id = localStorage.getItem("chat_user_id");
  if (!id) {
    id = generateId();
    localStorage.setItem("chat_user_id", id);
  }

  const color = stringToColor(id);
  
  localStorage.setItem("chat_user_name", name);
  localStorage.setItem("chat_user_color", color);

  return { id, name, color };
}

export function useAuth() {
  const [user, setUser] = useState<ChatUser | null>(getUserIdentity());

  useEffect(() => {
    // If no user exists, we don't automatically create one here.
    // The welcome modal will handle it.
  }, []);

  const login = (name: string) => {
    const newUser = setUserIdentity(name);
    setUser(newUser);
  };

  return { user, login };
}

export function getJoinedServers(): string[] {
  const stored = localStorage.getItem("chat_joined_servers");
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function joinServerLocal(serverId: string) {
  const joined = getJoinedServers();
  if (!joined.includes(serverId)) {
    joined.push(serverId);
    localStorage.setItem("chat_joined_servers", JSON.stringify(joined));
  }
}

export function leaveServerLocal(serverId: string) {
  const joined = getJoinedServers();
  const filtered = joined.filter(id => id !== serverId);
  localStorage.setItem("chat_joined_servers", JSON.stringify(filtered));
}
