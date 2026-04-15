import assert from "node:assert/strict";
import test from "node:test";

import { createAccountStore } from "../src/accountStore.js";

function createDeterministicAccountStore() {
  let id = 0;

  return createAccountStore({
    idGenerator: () => `account-${++id}`,
    passwordHasher: (password) => `hash:${password}`,
    passwordVerifier: (password, passwordHash) => passwordHash === `hash:${password}`,
  });
}

test("signUp creates an account with a unique username", () => {
  const store = createDeterministicAccountStore();
  const account = store.signUp("  Alice  ", "secret");

  assert.deepEqual(account, {
    id: "account-1",
    username: "Alice",
  });
});

test("getAvailability marks an existing username as used regardless of case", () => {
  const store = createDeterministicAccountStore();

  store.signUp("john", "secret");

  assert.deepEqual(store.getAvailability("John"), {
    username: "John",
    available: false,
    reason: "Used",
  });
});

test("signUp rejects duplicate usernames", () => {
  const store = createDeterministicAccountStore();

  store.signUp("Mia", "secret");

  assert.throws(() => {
    store.signUp("mia", "another-secret");
  }, /used/i);
});

test("signIn returns the account when username and password match", () => {
  const store = createDeterministicAccountStore();

  store.signUp("Niko", "1234");

  assert.deepEqual(store.signIn("niko", "1234"), {
    id: "account-1",
    username: "Niko",
  });
});

test("signIn throws no such account when the username or password is wrong", () => {
  const store = createDeterministicAccountStore();

  store.signUp("Lena", "1234");

  assert.throws(() => {
    store.signIn("Lena", "wrong");
  }, /no such account/i);

  assert.throws(() => {
    store.signIn("Unknown", "1234");
  }, /no such account/i);
});
