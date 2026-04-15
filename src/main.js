const STORAGE_KEY = "world-chat-username";
const THEME_KEY = "world-chat-theme";
const PING_MS = 15_000;

const rootElement = document.documentElement;
const bodyElement = document.body;
const menuToggle = document.querySelector("#menu-toggle");
const optionsMenu = document.querySelector("#options-menu");
const authView = document.querySelector("#auth-view");
const chatView = document.querySelector("#chat-view");
const peopleButton = document.querySelector("#people-button");
const backToChat = document.querySelector("#back-to-chat");
const peopleView = document.querySelector("#people-view");
const peopleOnlineCount = document.querySelector("#people-online-count");
const peopleParticipantList = document.querySelector("#people-participant-list");
const chatPager = document.querySelector("#chat-pager");
const logInTab = document.querySelector("#log-in-tab");
const signUpTab = document.querySelector("#sign-up-tab");
const logInForm = document.querySelector("#log-in-form");
const signUpForm = document.querySelector("#sign-up-form");
const logInUsernameInput = document.querySelector("#log-in-username");
const logInPasswordInput = document.querySelector("#log-in-password");
const signUpUsernameInput = document.querySelector("#sign-up-username");
const signUpPasswordInput = document.querySelector("#sign-up-password");
const createAccountButton = document.querySelector("#create-account-button");
const signUpUsernameStatus = document.querySelector("#sign-up-username-status");
const authStatus = document.querySelector("#auth-status");
const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const messageList = document.querySelector("#message-list");
const participantList = document.querySelector("#participant-list");
const typingIndicator = document.querySelector("#typing-indicator");
const roomName = document.querySelector("#room-name");
const onlineCount = document.querySelector("#online-count");
const connectionStatus = document.querySelector("#connection-status");
const cameraInput = document.querySelector("#camera-input");
const galleryInput = document.querySelector("#gallery-input");
const cameraButton = document.querySelector("#camera-button");
const galleryButton = document.querySelector("#gallery-button");
const emojiButton = document.querySelector("#emoji-button");
const voiceButton = document.querySelector("#voice-button");
const composerStatus = document.querySelector("#composer-status");
const redeemToggle = document.querySelector("#redeem-toggle");
const redeemForm = document.querySelector("#redeem-form");
const redeemInput = document.querySelector("#redeem-input");
const redeemStatus = document.querySelector("#redeem-status");
const themeToggle = document.querySelector("#theme-toggle");
const menuLeaveButton = document.querySelector("#menu-leave-button");

let session = null;
let eventSource = null;
let pingTimer = null;
let authMode = "log-in";
let signUpUsernameAvailable = false;
let availabilityRequestId = 0;
let activePane = "chat";
let composerStatusTimer = null;
let localTyping = false;
let lastSnapshot = null;
let swipeStartX = 0;
let swipeTracking = false;
let typingResetTimer = null;
let typingSent = false;
let voiceHoldActive = false;

const storedUsername = localStorage.getItem(STORAGE_KEY) || "";
logInUsernameInput.value = storedUsername;
signUpUsernameInput.value = storedUsername;

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

function setAuthStatus(message, isError = false) {
  if (!message) {
    authStatus.textContent = "";
    authStatus.classList.add("is-hidden");
    authStatus.classList.remove("is-error");
    authStatus.classList.remove("is-success");
    return;
  }

  authStatus.textContent = message;
  authStatus.classList.remove("is-hidden");
  authStatus.classList.toggle("is-error", isError);
  authStatus.classList.toggle("is-success", !isError);
}

function setUsernameStatus(message, state = "neutral") {
  if (!message) {
    signUpUsernameStatus.textContent = "";
    signUpUsernameStatus.classList.add("is-hidden");
    signUpUsernameStatus.classList.remove("is-error");
    signUpUsernameStatus.classList.remove("is-success");
    return;
  }

  signUpUsernameStatus.textContent = message;
  signUpUsernameStatus.classList.remove("is-hidden");
  signUpUsernameStatus.classList.toggle("is-error", state === "error");
  signUpUsernameStatus.classList.toggle("is-success", state === "success");
}

function setConnectedState(isConnected) {
  connectionStatus.textContent = isConnected ? "Live connection" : "Reconnecting...";
}

function setMenuOpen(isOpen) {
  bodyElement.classList.toggle("menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
}

function setActivePane(pane) {
  activePane = pane;
  if (pane === "chat") {
    chatView.classList.remove("is-hidden");
    peopleView.classList.add("is-hidden");
  } else if (pane === "people") {
    chatView.classList.add("is-hidden");
    peopleView.classList.remove("is-hidden");
  }
}

function isCurrentUserAdmin() {
  return session?.role === "admin";
}

function syncOptionState() {
  menuLeaveButton.disabled = !session;
  redeemToggle.disabled = !session;
}

function toggleViews(isInChat) {
  authView.classList.toggle("is-hidden", isInChat);
  chatView.classList.toggle("is-hidden", !isInChat);
  syncOptionState();
}

function setComposerStatus(message) {
  if (composerStatusTimer) {
    window.clearTimeout(composerStatusTimer);
    composerStatusTimer = null;
  }

  if (!message) {
    composerStatus.textContent = "";
    composerStatus.classList.add("is-hidden");
    return;
  }

  composerStatus.textContent = message;
  composerStatus.classList.remove("is-hidden");
  composerStatusTimer = window.setTimeout(() => {
    composerStatus.textContent = "";
    composerStatus.classList.add("is-hidden");
    composerStatusTimer = null;
  }, 1800);
}

function setAuthMode(mode) {
  authMode = mode;
  const isLogIn = mode === "log-in";

  logInForm.classList.toggle("is-hidden", !isLogIn);
  signUpForm.classList.toggle("is-hidden", isLogIn);
  logInTab.classList.toggle("auth-tab--active", isLogIn);
  signUpTab.classList.toggle("auth-tab--active", !isLogIn);
  logInTab.setAttribute("aria-selected", String(isLogIn));
  signUpTab.setAttribute("aria-selected", String(!isLogIn));
  setAuthStatus("");

  if (isLogIn) {
    logInUsernameInput.focus();
    return;
  }

  syncCreateAccountState();
  signUpUsernameInput.focus();
}

function syncCreateAccountState() {
  createAccountButton.disabled =
    !signUpUsernameInput.value.trim() ||
    !signUpPasswordInput.value ||
    !signUpUsernameAvailable;
}

function renderParticipants(participants) {
  // Render in both chat and people views
  renderParticipantsInList(participantList, participants);
  renderParticipantsInList(peopleParticipantList, participants);
}

function renderParticipantsInList(listElement, participants) {
  listElement.innerHTML = "";

  if (participants.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "participant-item";
    emptyItem.innerHTML = `<div class="participant-details"><div class="participant-name-row"><span class="participant-name">No users online</span></div></div>`;
    listElement.append(emptyItem);
    return;
  }

  for (const participant of participants) {
    const item = document.createElement("li");
    item.className = "participant-item";
    if (participant.id === session?.id) {
      item.classList.add("participant-item--self");
    }
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

    listElement.append(item);
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
      const isOutgoing = message.name === session?.name;

      item.classList.add(isOutgoing ? "message-card--outgoing" : "message-card--incoming");

      if (message.role === "admin") {
        item.classList.add("message-card--admin");
      }

      const author = document.createElement("p");
      author.className = "message-author";
      author.textContent = isOutgoing ? "You" : message.name;
      item.append(author);

      const text = document.createElement("p");
      text.className = "message-text";
      text.textContent = message.text;
      item.append(text);
    }

    messageList.append(item);
  }

  messageList.scrollTop = messageList.scrollHeight;
}

function renderTypingIndicator(snapshot = lastSnapshot) {
  const typingParticipants = snapshot?.typingParticipants || [];
  const otherTypingNames = typingParticipants
    .filter((participant) => participant.id !== session?.id)
    .map((participant) => participant.name);

  let message = "";

  if (otherTypingNames.length === 1) {
    message = `${otherTypingNames[0]} is typing...`;
  } else if (otherTypingNames.length > 1) {
    message = `${otherTypingNames.slice(0, 2).join(" and ")} are typing...`;
  } else if (localTyping) {
    message = "typing...";
  }

  typingIndicator.textContent = message;
  typingIndicator.classList.toggle("is-hidden", !message);
}

function renderSnapshot(payload) {
  lastSnapshot = payload.snapshot;
  roomName.textContent = payload.roomName;
  onlineCount.textContent = `${payload.snapshot.onlineCount} online`;
  peopleOnlineCount.textContent = `${payload.snapshot.onlineCount} online`;

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
  renderTypingIndicator(payload.snapshot);
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

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

async function postTypingState(typing) {
  if (!session) {
    return;
  }

  try {
    await postJson("/api/typing", {
      sessionId: session.id,
      typing,
    });
  } catch {
    // Best effort only.
  }
}

function syncComposerState() {
  const hasText = messageInput.value.trim().length > 0;
  localTyping = hasText;
  renderTypingIndicator();

  if (!session) {
    return;
  }

  if (typingResetTimer) {
    window.clearTimeout(typingResetTimer);
    typingResetTimer = null;
  }

  if (hasText) {
    if (!typingSent) {
      typingSent = true;
      postTypingState(true);
    }

    typingResetTimer = window.setTimeout(() => {
      localTyping = false;
      renderTypingIndicator();

      if (typingSent) {
        typingSent = false;
        postTypingState(false);
      }
    }, 1400);

    return;
  }

  if (typingSent) {
    typingSent = false;
    postTypingState(false);
  }
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

  if (typingResetTimer) {
    window.clearTimeout(typingResetTimer);
    typingResetTimer = null;
  }
}

function resetAuthForms() {
  logInPasswordInput.value = "";
  signUpPasswordInput.value = "";
  signUpUsernameAvailable = false;
  setUsernameStatus("");
  syncCreateAccountState();
}

function resetChatView() {
  participantList.innerHTML = "";
  peopleParticipantList.innerHTML = "";
  messageList.innerHTML = "";
  onlineCount.textContent = "0 online";
  peopleOnlineCount.textContent = "0 online";
  connectionStatus.textContent = "Disconnected";
  lastSnapshot = null;
  localTyping = false;
  typingSent = false;
  voiceHoldActive = false;
  renderTypingIndicator(null);
  setComposerStatus("");
  setActivePane("chat");
}

function handleForcedLogout(message) {
  clearRealtime();
  session = null;
  toggleViews(false);
  resetChatView();
  resetAuthForms();
  setMenuOpen(false);
  setRedeemStatus("");
  setAuthStatus(message, true);
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

async function joinChat(username) {
  const payload = await postJson("/api/join", { name: username });
  session = payload.session;
  localStorage.setItem(STORAGE_KEY, session.name);
  logInUsernameInput.value = session.name;
  signUpUsernameInput.value = session.name;
  toggleViews(true);
  setActivePane("chat");
  setMenuOpen(false);
  setAuthStatus("");
  setRedeemStatus("");
  renderSnapshot(payload);
  syncComposerState();
  openRealtimeChannel();
  messageInput.focus();
}

async function authenticateAndJoin(endpoint, username, password) {
  const payload = await postJson(endpoint, { username, password });
  await joinChat(payload.account.username);
}

async function leaveChat() {
  if (!session) {
    return;
  }

  const sessionId = session.id;
  const shouldClearTyping = typingSent;

  if (shouldClearTyping) {
    postTypingState(false);
  }

  clearRealtime();
  session = null;
  toggleViews(false);
  resetChatView();
  resetAuthForms();
  setMenuOpen(false);
  setRedeemStatus("");
  setAuthStatus("");
  setAuthMode("log-in");

  try {
    await postJson("/api/leave", { sessionId }, true);
  } catch {
    // Ignore unload or network errors on leave.
  }

  try {
    await postJson("/api/auth/sign-out", {}, true);
  } catch {
    // Best effort only.
  }
}

async function checkUsernameAvailability(username) {
  const normalizedUsername = username.trim();
  const requestId = ++availabilityRequestId;

  if (!normalizedUsername) {
    signUpUsernameAvailable = false;
    setUsernameStatus("");
    syncCreateAccountState();
    return;
  }

  try {
    const url = new URL("/api/auth/availability", window.location.origin);
    url.searchParams.set("username", normalizedUsername);
    const payload = await fetchJson(url);

    if (requestId !== availabilityRequestId) {
      return;
    }

    signUpUsernameAvailable = Boolean(payload.available);

    if (payload.available) {
      setUsernameStatus("Available", "success");
    } else {
      setUsernameStatus("Used", "error");
    }

    syncCreateAccountState();
  } catch {
    if (requestId !== availabilityRequestId) {
      return;
    }

    signUpUsernameAvailable = false;
    setUsernameStatus("Unable to check right now.", "error");
    syncCreateAccountState();
  }
}

logInTab.addEventListener("click", () => {
  setAuthMode("log-in");
});

signUpTab.addEventListener("click", () => {
  setAuthMode("sign-up");
});

peopleButton.addEventListener("click", () => {
  setActivePane("people");
});

backToChat.addEventListener("click", () => {
  setActivePane("chat");
});

logInForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthStatus("");

  try {
    await authenticateAndJoin("/api/auth/sign-in", logInUsernameInput.value, logInPasswordInput.value);
  } catch (error) {
    setAuthStatus(error.message || "No such account.", true);
  }
});

signUpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthStatus("");

  if (createAccountButton.disabled) {
    return;
  }

  try {
    await authenticateAndJoin("/api/auth/sign-up", signUpUsernameInput.value, signUpPasswordInput.value);
  } catch (error) {
    if ((error.message || "").toLowerCase() === "used") {
      signUpUsernameAvailable = false;
      setUsernameStatus("Used", "error");
      syncCreateAccountState();
      return;
    }

    setAuthStatus(error.message || "Unable to create account.", true);
  }
});

signUpUsernameInput.addEventListener("input", () => {
  setAuthStatus("");
  checkUsernameAvailability(signUpUsernameInput.value);
});

signUpPasswordInput.addEventListener("input", () => {
  syncCreateAccountState();
});

logInUsernameInput.addEventListener("input", () => {
  setAuthStatus("");
});

messageInput.addEventListener("input", () => {
  syncComposerState();
});

cameraButton.addEventListener("click", () => {
  cameraInput.click();
});

galleryButton.addEventListener("click", () => {
  galleryInput.click();
});

cameraInput.addEventListener("change", () => {
  if (cameraInput.files?.length) {
    setComposerStatus("Camera picked. Media sending is coming next.");
  }
});

galleryInput.addEventListener("change", () => {
  if (galleryInput.files?.length) {
    setComposerStatus("Gallery picked. Media sending is coming next.");
  }
});

emojiButton.addEventListener("click", () => {
  const nextValue = `${messageInput.value}${messageInput.value ? " " : ""}😊`;
  messageInput.value = nextValue.slice(0, Number(messageInput.maxLength || 280));
  syncComposerState();
  messageInput.focus();
});

function startVoiceHold() {
  voiceHoldActive = true;
  voiceButton.classList.add("composer-icon--recording");
  composerStatus.textContent = "Recording voice... release when ready.";
  composerStatus.classList.remove("is-hidden");
}

function stopVoiceHold() {
  if (!voiceHoldActive) {
    return;
  }

  voiceHoldActive = false;
  voiceButton.classList.remove("composer-icon--recording");
  setComposerStatus("Voice hold ready. Voice sending can be wired next.");
}

voiceButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  startVoiceHold();
});

voiceButton.addEventListener("pointerup", stopVoiceHold);
voiceButton.addEventListener("pointerleave", stopVoiceHold);
voiceButton.addEventListener("pointercancel", stopVoiceHold);

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
    localTyping = false;
    renderTypingIndicator();

    if (typingSent) {
      typingSent = false;
      postTypingState(false);
    }

    if (typingResetTimer) {
      window.clearTimeout(typingResetTimer);
      typingResetTimer = null;
    }

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

function handleParticipantAction(event) {
  const button = event.target.closest("[data-action]");

  if (!button || !session) {
    return;
  }

  const targetSessionId = button.dataset.participantId;
  const action = button.dataset.action;

  try {
    if (action === "mute") {
      postJson("/api/admin/mute", {
        sessionId: session.id,
        targetSessionId,
        muted: button.dataset.muted !== "true",
      });
      return;
    }

    if (action === "kick") {
      postJson("/api/admin/kick", {
        sessionId: session.id,
        targetSessionId,
      });
    }
  } catch (error) {
    window.alert(error.message);
  }
}

participantList.addEventListener("click", handleParticipantAction);
peopleParticipantList.addEventListener("click", handleParticipantAction);

chatView.addEventListener(
  "touchstart",
  (event) => {
    if (!session || event.touches.length !== 1) {
      return;
    }

    swipeTracking = true;
    swipeStartX = event.touches[0].clientX;
  },
  { passive: true },
);

chatView.addEventListener(
  "touchend",
  (event) => {
    if (!swipeTracking || !session || event.changedTouches.length !== 1) {
      swipeTracking = false;
      return;
    }

    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    swipeTracking = false;

    if (Math.abs(deltaX) < 56) {
      return;
    }

    if (deltaX < 0) {
      setActivePane("people");
      return;
    }

    setActivePane("chat");
  },
  { passive: true },
);

peopleView.addEventListener(
  "touchstart",
  (event) => {
    if (!session || event.touches.length !== 1) {
      return;
    }

    swipeTracking = true;
    swipeStartX = event.touches[0].clientX;
  },
  { passive: true },
);

peopleView.addEventListener(
  "touchend",
  (event) => {
    if (!swipeTracking || !session || event.changedTouches.length !== 1) {
      swipeTracking = false;
      return;
    }

    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    swipeTracking = false;

    if (Math.abs(deltaX) < 56) {
      return;
    }

    if (deltaX > 0) {
      setActivePane("chat");
      return;
    }

    setActivePane("people");
  },
  { passive: true },
);

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
setAuthMode("log-in");
toggleViews(false);
setActivePane("chat");
syncOptionState();
resetAuthForms();
syncComposerState();

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
