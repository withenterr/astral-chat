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
const redeemToggle = document.querySelector("#redeem-toggle");
const redeemForm = document.querySelector("#redeem-form");
const redeemInput = document.querySelector("#redeem-input");
const redeemStatus = document.querySelector("#redeem-status");
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

function setRedeemStatus(message, isError = false) {
  if (!message) {
    redeemStatus.textContent = "";
    redeemStatus.classList.add("is-hidden");
    redeemStatus.classList.remove("is-error");
    return;
  }

  redeemStatus.textContent = message;
  redeemStatus.classList.remove("is-hidden");
  redeemStatus.classList.toggle("is-error", isError);
}

function setConnectedState(isConnected) {
  connectionStatus.textContent = isConnected ? "Live connection" : "Reconnecting...";
}

function setMenuOpen(isOpen) {
  bodyElement.classList.toggle("menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
}

function isCurrentUserAdmin() {
  return session?.role === "admin";
}

function syncOptionState() {
  menuLeaveButton.disabled = !session;
  redeemToggle.disabled = !session;
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
    if (participant.role === "admin") {
      item.classList.add("participant-item--admin");
    }

    const details = document.createElement("div");
    details.className = "participant-details";

    const nameRow = document.createElement("div");
    nameRow.className = "participant-name-row";

    const name = document.createElement("span");
    name.className = "participant-name";
    name.textContent = participant.id === session?.id ? `${participant.name} (You)` : participant.name;
    nameRow.append(name);

    if (participant.role === "admin") {
      const roleBadge = document.createElement("span");
      roleBadge.className = "participant-badge participant-badge--admin";
      roleBadge.textContent = "Admin";
      nameRow.append(roleBadge);
    }

    if (participant.isMuted) {
      const mutedBadge = document.createElement("span");
      mutedBadge.className = "participant-badge";
      mutedBadge.textContent = "Muted";
      nameRow.append(mutedBadge);
    }

    details.append(nameRow);
    item.append(details);

    if (isCurrentUserAdmin() && participant.id !== session?.id) {
      const actions = document.createElement("div");
      actions.className = "participant-actions";

      const muteButton = document.createElement("button");
      muteButton.className = "secondary-button participant-action";
      muteButton.type = "button";
      muteButton.dataset.action = "mute";
      muteButton.dataset.participantId = participant.id;
      muteButton.dataset.muted = String(Boolean(participant.isMuted));
      muteButton.textContent = participant.isMuted ? "Unmute" : "Mute";

      const kickButton = document.createElement("button");
      kickButton.className = "secondary-button participant-action participant-action--danger";
      kickButton.type = "button";
      kickButton.dataset.action = "kick";
      kickButton.dataset.participantId = participant.id;
      kickButton.textContent = "Kick";

      actions.append(muteButton, kickButton);
      item.append(actions);
    }

    participantList.append(item);
  }
}

function renderMessages(messages) {
  messageList.innerHTML = "";

  for (const message of messages) {
    const item = document.createElement("article");
    item.className = `message-card message-card--${message.type}`;

    if (message.type === "system") {
      const text = document.createElement("p");
      text.textContent = message.text;
      item.append(text);
    } else {
      if (message.role === "admin") {
        item.classList.add("message-card--admin");
      }

      const author = document.createElement("p");
      author.className = "message-author";
      author.textContent = message.name;
      item.append(author);

      const text = document.createElement("p");
      text.textContent = message.text;
      item.append(text);
    }

    messageList.append(item);
  }

  messageList.scrollTop = messageList.scrollHeight;
}

function renderSnapshot(payload) {
  roomName.textContent = payload.roomName;
  onlineCount.textContent = `${payload.snapshot.onlineCount} online`;

  if (session) {
    const me = payload.snapshot.participants.find((participant) => participant.id === session.id);

    if (me) {
      session = {
        ...session,
        role: me.role,
        isMuted: me.isMuted,
      };
    }
  }

  renderParticipants(payload.snapshot.participants);
  renderMessages(payload.snapshot.messages);
  syncOptionState();
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

function handleForcedLogout(message) {
  clearRealtime();
  session = null;
  toggleViews(false);
  participantList.innerHTML = "";
  messageList.innerHTML = "";
  onlineCount.textContent = "0 online";
  connectionStatus.textContent = "Disconnected";
  setMenuOpen(false);
  setRedeemStatus("");
  window.alert(message);
}

function openRealtimeChannel() {
  clearRealtime();
  eventSource = new EventSource(`/events?sessionId=${encodeURIComponent(session.id)}`);

  eventSource.onopen = () => {
    setConnectedState(true);
  };

  eventSource.onmessage = (event) => {
    const payload = JSON.parse(event.data);

    if (payload.type === "forced-logout") {
      handleForcedLogout(payload.message || "You were removed from the room.");
      return;
    }

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
  setRedeemStatus("");
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
  setRedeemStatus("");

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

redeemToggle.addEventListener("click", () => {
  const shouldShow = redeemForm.classList.contains("is-hidden");
  redeemForm.classList.toggle("is-hidden", !shouldShow);

  if (shouldShow) {
    redeemInput.focus();
  }
});

redeemForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!session) {
    return;
  }

  try {
    const payload = await postJson("/api/redeem", {
      sessionId: session.id,
      code: redeemInput.value,
    });
    redeemInput.value = "";
    redeemForm.classList.add("is-hidden");
    renderSnapshot(payload);
    setRedeemStatus("Code redeemed successfully.");
  } catch (error) {
    setRedeemStatus(error.message, true);
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

participantList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");

  if (!button || !session) {
    return;
  }

  const targetSessionId = button.dataset.participantId;
  const action = button.dataset.action;

  try {
    if (action === "mute") {
      await postJson("/api/admin/mute", {
        sessionId: session.id,
        targetSessionId,
        muted: button.dataset.muted !== "true",
      });
      return;
    }

    if (action === "kick") {
      await postJson("/api/admin/kick", {
        sessionId: session.id,
        targetSessionId,
      });
    }
  } catch (error) {
    window.alert(error.message);
  }
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
