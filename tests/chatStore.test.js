import assert from "node:assert/strict";
import test from "node:test";

import { createChatStore } from "../src/chatStore.js";

function createDeterministicStore() {
  let id = 0;
  let time = 0;

  return createChatStore({
    idGenerator: () => `id-${++id}`,
    clock: () => ++time,
    maxMessages: 3,
  });
}

test("join adds a participant and emits a system message", () => {
  const store = createDeterministicStore();
  const { session, event } = store.join("  Alice   ");
  const snapshot = store.getSnapshot();

  assert.equal(session.name, "Alice");
  assert.equal(session.role, "member");
  assert.equal(event.type, "system");
  assert.equal(snapshot.onlineCount, 1);
  assert.deepEqual(snapshot.participants, [
    { id: session.id, name: "Alice", role: "member", isMuted: false },
  ]);
});

test("addMessage stores a trimmed chat message for the joined user", () => {
  const store = createDeterministicStore();
  const { session } = store.join("Bob");
  const message = store.addMessage(session.id, "   Hello     world   ");

  assert.equal(message.type, "chat");
  assert.equal(message.name, "Bob");
  assert.equal(message.text, "Hello world");
});

test("join rejects duplicate names even with different casing", () => {
  const store = createDeterministicStore();

  store.join("john");

  assert.throws(() => {
    store.join("John");
  }, /already in use/i);
});

test("grantRole upgrades a member to admin", () => {
  const store = createDeterministicStore();
  const { session } = store.join("Mia");
  const promoted = store.grantRole(session.id, "admin");

  assert.equal(promoted.session.role, "admin");
  assert.equal(store.getSnapshot().participants[0].role, "admin");
});

test("admins can mute and kick other people", () => {
  const store = createDeterministicStore();
  const { session: admin } = store.join("Admin");
  const { session: target } = store.join("Target");

  store.grantRole(admin.id, "admin");
  store.setMuted(admin.id, target.id, true);

  assert.throws(() => {
    store.addMessage(target.id, "hello");
  }, /muted/i);

  const result = store.kick(admin.id, target.id);

  assert.equal(result.target.name, "Target");
  assert.equal(store.hasSession(target.id), false);
});

test("non-admins cannot mute other people", () => {
  const store = createDeterministicStore();
  const { session: first } = store.join("One");
  const { session: second } = store.join("Two");

  assert.throws(() => {
    store.setMuted(first.id, second.id, true);
  }, /only admins/i);
});

test("leave removes the participant and appends a system event", () => {
  const store = createDeterministicStore();
  const { session } = store.join("Cara");
  const event = store.leave(session.id);
  const snapshot = store.getSnapshot();

  assert.equal(event.type, "system");
  assert.equal(snapshot.onlineCount, 0);
});

test("removeInactiveSessions drops idle users", () => {
  const store = createDeterministicStore();
  const { session } = store.join("Dee");

  store.removeInactiveSessions(0);

  assert.equal(store.hasSession(session.id), false);
});

test("message history respects the configured cap", () => {
  const store = createDeterministicStore();
  const { session } = store.join("Eli");

  store.addMessage(session.id, "one");
  store.addMessage(session.id, "two");
  store.addMessage(session.id, "three");

  const snapshot = store.getSnapshot();

  assert.equal(snapshot.messages.length, 3);
  assert.equal(snapshot.messages[0].text, "one");
  assert.equal(snapshot.messages[2].text, "three");
});
