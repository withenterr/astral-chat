const STORAGE_KEY = "world-chat-name";
const THEME_KEY = "world-chat-theme";
const PING_MS = 15_000;

const rootElement = document.documentElement;
const bodyElement = document.body;
const menuToggle = document.querySelector("#menu-toggle");
const optionsMenu = document.querySelector("#options-menu");
const joinView = document.querySelector("#join-view");
const chatView = document.querySelector("#chat-view");
const joinForm = document.querySelector("#join-form");
const nameInput = document.querySelector("#name-input");
const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const messageList = document.querySelector("#message-list");
const participantList = document.querySelector("#participant-list");
const roomName = document.querySelector("#room-name");
const onlineCount = document.querySelector("#online-count");
const connectionStatus = document.querySelector("#connection-status");
const themeToggle = document.querySelector("#theme-toggle");
const menuLeaveButton = document.querySelector("#menu-leave-button");

let session = null;
let eventSource = null;
let pingTimer = null;

nameInput.value = localStorage.getItem(STORAGE_KEY) || "";

function getPreferredTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme, persist = true) {
  rootElement.dataset.theme = theme;
  rootElement.style.colorScheme = theme;
  themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));

  if (persist) {
    localStorage.setItem(THEME_KEY, theme);
  }
}

function setConnectedState(isConnected) {
  connectionStatus.textContent = isConnected ? "Live connection" : "Reconnecting...";
}

function setMenuOpen(isOpen) {
  bodyElement.classList.toggle("menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
}

function syncOptionState() {
  menuLeaveButton.disabled = !session;
}

function toggleViews(isInChat) {
  joinView.classList.toggle("is-hidden", isInChat);
  chatView.classList.toggle("is-hidden", !isInChat);
  syncOptionState();
}

function renderParticipants(participants) {
  participantList.innerHTML = "";

  for (const participant of participants) {
    const item = document.createElement("li");
    item.className = "participant-item";
    item.textContent = participant.name;
    participantList.append(item);
  }
}

function renderMessages(messages) {
  messageList.innerHTML = "";

  for (const message of messages) {
    const item = document.createElement("article");
    item.className = `message-card message-card--${message.type}`;

    if (message.type === "system") {
      item.innerHTML = `<p>${message.text}</p>`;
    } else {
      item.innerHTML = `<p class="message-author">${message.name}</p><p>${message.text}</p>`;
    }

    messageList.append(item);
  }

  messageList.scrollTop = messageList.scrollHeight;
}

function renderSnapshot(payload) {
  roomName.textContent = payload.roomName;
  onlineCount.textContent = `${payload.snapshot.onlineCount} online`;
  renderParticipants(payload.snapshot.participants);
  renderMessages(payload.snapshot.messages);
}

async function postJson(url, payload, keepalive = false) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive,
  });
  const raw = await response.text();
  const contentType = response.headers.get("content-type") || "";
  let data = {};

  if (raw && contentType.includes("application/json")) {
    data = JSON.parse(raw);
  } else if (raw) {
    data = { error: raw };
  }

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function clearRealtime() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  if (pingTimer) {
    window.clearInterval(pingTimer);
    pingTimer = null;
  }
}

function openRealtimeChannel() {
  clearRealtime();
  eventSource = new EventSource(`/events?sessionId=${encodeURIComponent(session.id)}`);

  eventSource.onopen = () => {
    setConnectedState(true);
  };

  eventSource.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    renderSnapshot(payload);
    setConnectedState(true);
  };

  eventSource.onerror = () => {
    setConnectedState(false);
  };

  pingTimer = window.setInterval(async () => {
    if (!session) {
      return;
    }

    try {
      await postJson("/api/ping", { sessionId: session.id });
    } catch {
      setConnectedState(false);
    }
  }, PING_MS);
}

async function joinChat(name) {
  const payload = await postJson("/api/join", { name });
  session = payload.session;
  localStorage.setItem(STORAGE_KEY, session.name);
  toggleViews(true);
  setMenuOpen(false);
  renderSnapshot(payload);
  openRealtimeChannel();
  messageInput.focus();
}

async function leaveChat() {
  if (!session) {
    return;
  }

  const sessionId = session.id;
  clearRealtime();
  session = null;
  toggleViews(false);
  participantList.innerHTML = "";
  messageList.innerHTML = "";
  onlineCount.textContent = "0 online";
  connectionStatus.textContent = "Disconnected";
  setMenuOpen(false);

  try {
    await postJson("/api/leave", { sessionId }, true);
  } catch {
    // Ignore unload or network errors on leave.
  }
}

joinForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await joinChat(nameInput.value);
  } catch (error) {
    window.alert(error.message);
  }
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!session) {
    return;
  }

  try {
    await postJson("/api/messages", {
      sessionId: session.id,
      text: messageInput.value,
    });
    messageInput.value = "";
    messageInput.focus();
  } catch (error) {
    window.alert(error.message);
  }
});

themeToggle.addEventListener("click", () => {
  const nextTheme = rootElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

menuToggle.addEventListener("click", () => {
  setMenuOpen(!bodyElement.classList.contains("menu-open"));
});

menuLeaveButton.addEventListener("click", () => {
  leaveChat();
});

document.addEventListener("click", (event) => {
  if (
    bodyElement.classList.contains("menu-open") &&
    !optionsMenu.contains(event.target) &&
    !menuToggle.contains(event.target)
  ) {
    setMenuOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenuOpen(false);
  }
});

applyTheme(getPreferredTheme(), false);
syncOptionState();

window.addEventListener("beforeunload", () => {
  if (!session) {
    return;
  }

  navigator.sendBeacon(
    "/api/leave",
    new Blob([JSON.stringify({ sessionId: session.id })], {
      type: "application/json",
    }),
  );
});
