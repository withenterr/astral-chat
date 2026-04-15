import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const DEFAULT_MAX_USERNAME_LENGTH = 24;
const DEFAULT_MAX_PASSWORD_LENGTH = 72;

function normalizeUsername(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DEFAULT_MAX_USERNAME_LENGTH);
}

function normalizeUsernameKey(value) {
  return normalizeUsername(value).toLocaleLowerCase();
}

function validatePassword(value) {
  const password = String(value || "");

  if (!password.trim()) {
    throw new Error("Please enter a password.");
  }

  if (password.length > DEFAULT_MAX_PASSWORD_LENGTH) {
    throw new Error(`Password must be ${DEFAULT_MAX_PASSWORD_LENGTH} characters or fewer.`);
  }

  return password;
}

function hashPassword(password) {
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${digest.toString("hex")}`;
}

function verifyPassword(password, passwordHash) {
  const [saltHex, digestHex] = String(passwordHash || "").split(":");

  if (!saltHex || !digestHex) {
    return false;
  }

  const expected = Buffer.from(digestHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(expected, actual);
}

function serializeAccount(account) {
  return {
    id: account.id,
    username: account.username,
    passwordHash: account.passwordHash,
  };
}

function serializePublicAccount(account) {
  return {
    id: account.id,
    username: account.username,
  };
}

export function createAccountStore({
  accounts = [],
  idGenerator = () => crypto.randomUUID(),
  passwordHasher = hashPassword,
  passwordVerifier = verifyPassword,
} = {}) {
  const accountsById = new Map();
  const accountIdsByUsername = new Map();

  for (const account of accounts) {
    if (!account?.id || !account?.username || !account?.passwordHash) {
      continue;
    }

    const username = normalizeUsername(account.username);

    if (!username) {
      continue;
    }

    const normalizedAccount = {
      id: String(account.id),
      username,
      passwordHash: String(account.passwordHash),
    };

    accountsById.set(normalizedAccount.id, normalizedAccount);
    accountIdsByUsername.set(normalizeUsernameKey(username), normalizedAccount.id);
  }

  function getAvailability(username) {
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername) {
      return {
        username: "",
        available: false,
        reason: "Please enter a username.",
      };
    }

    const used = accountIdsByUsername.has(normalizeUsernameKey(normalizedUsername));

    return {
      username: normalizedUsername,
      available: !used,
      reason: used ? "Used" : "",
    };
  }

  function signUp(username, password) {
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername) {
      throw new Error("Please enter a username.");
    }

    if (!getAvailability(normalizedUsername).available) {
      throw new Error("Used");
    }

    const account = {
      id: idGenerator(),
      username: normalizedUsername,
      passwordHash: passwordHasher(validatePassword(password)),
    };

    accountsById.set(account.id, account);
    accountIdsByUsername.set(normalizeUsernameKey(account.username), account.id);

    return serializePublicAccount(account);
  }

  function signIn(username, password) {
    const normalizedUsername = normalizeUsername(username);
    const normalizedPassword = String(password || "");
    const accountId = accountIdsByUsername.get(normalizeUsernameKey(normalizedUsername));

    if (!normalizedUsername || !normalizedPassword || !accountId) {
      throw new Error("No such account.");
    }

    const account = accountsById.get(accountId);

    if (!account || !passwordVerifier(normalizedPassword, account.passwordHash)) {
      throw new Error("No such account.");
    }

    return serializePublicAccount(account);
  }

  function serializeAccounts() {
    return [...accountsById.values()]
      .sort((first, second) => first.username.localeCompare(second.username))
      .map(serializeAccount);
  }

  return {
    getAvailability,
    serializeAccounts,
    signIn,
    signUp,
  };
}
