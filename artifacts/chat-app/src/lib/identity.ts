const USER_ID_KEY = "chat_user_id";
const USER_NAME_KEY = "chat_user_name";
const USER_COLOR_KEY = "chat_user_color";
const JOINED_SERVERS_KEY = "chat_joined_servers";
const ADMIN_KEY = "chat_is_admin";
const THEME_KEY = "chat_theme";

const ADMIN_CODE = "Ananiadis@2011";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateGuestName(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Guest_${num}`;
}

function generateColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 65%)`;
}

export interface UserIdentity {
  userId: string;
  userName: string;
  userColor: string;
}

export function getOrCreateUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function getUserName(): string | null {
  return localStorage.getItem(USER_NAME_KEY);
}

export function setUserName(name: string): void {
  localStorage.setItem(USER_NAME_KEY, name.trim() || generateGuestName());
}

export function getUserColor(userId: string): string {
  let color = localStorage.getItem(USER_COLOR_KEY);
  if (!color) {
    color = generateColorFromId(userId);
    localStorage.setItem(USER_COLOR_KEY, color);
  }
  return color;
}

export function getIdentity(): UserIdentity {
  const userId = getOrCreateUserId();
  const userName = localStorage.getItem(USER_NAME_KEY) || generateGuestName();
  const userColor = getUserColor(userId);
  return { userId, userName, userColor };
}

export function ensureIdentity(): UserIdentity {
  const userId = getOrCreateUserId();
  let userName = localStorage.getItem(USER_NAME_KEY);
  if (!userName) {
    userName = generateGuestName();
    localStorage.setItem(USER_NAME_KEY, userName);
  }
  const userColor = getUserColor(userId);
  return { userId, userName, userColor };
}

export function getJoinedServers(): string[] {
  try {
    const raw = localStorage.getItem(JOINED_SERVERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addJoinedServer(serverId: string): void {
  const servers = getJoinedServers();
  if (!servers.includes(serverId)) {
    servers.push(serverId);
    localStorage.setItem(JOINED_SERVERS_KEY, JSON.stringify(servers));
  }
}

export function removeJoinedServer(serverId: string): void {
  const servers = getJoinedServers().filter((id) => id !== serverId);
  localStorage.setItem(JOINED_SERVERS_KEY, JSON.stringify(servers));
}

export function isAdmin(): boolean {
  return localStorage.getItem(ADMIN_KEY) === "true";
}

export function redeemAdminCode(code: string): boolean {
  if (code.trim() === ADMIN_CODE) {
    localStorage.setItem(ADMIN_KEY, "true");
    return true;
  }
  return false;
}

export function revokeAdmin(): void {
  localStorage.removeItem(ADMIN_KEY);
}

export type Theme = "dark" | "light";

export function getTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
    root.classList.remove("light");
  }
}

export function resetIdentity(): void {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  localStorage.removeItem(USER_COLOR_KEY);
  localStorage.removeItem(JOINED_SERVERS_KEY);
  localStorage.removeItem(ADMIN_KEY);
}
