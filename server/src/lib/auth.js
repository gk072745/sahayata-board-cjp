import bcrypt from "bcryptjs";
import { getJson, updateJson } from "./jsonStore.js";

const USERS_FILE = "users.json";

/**
 * Simple login-or-register: first time a username is used, the password
 * becomes that account's password. Every later login must match it.
 */
export async function loginOrRegister(username, password) {
  return updateJson(USERS_FILE, {}, async (users) => {
    const existing = users[username];
    if (existing) {
      const valid = await bcrypt.compare(password, existing.passwordHash);
      if (!valid) throw new AuthError("Incorrect password for this username.");
      return users;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    users[username] = { passwordHash, createdAt: new Date().toISOString() };
    return users;
  }).then(() => ({ username }));
}

export async function verifyCredentials(username, password) {
  const users = await getJson(USERS_FILE, {});
  const account = users[username];
  if (!account) return false;
  return bcrypt.compare(password, account.passwordHash);
}

export class AuthError extends Error {}

/** Express middleware: expects `x-username` / `x-password` headers. */
export function requireAuth() {
  return async (req, res, next) => {
    const username = req.header("x-username");
    const password = req.header("x-password");
    if (!username || !password) {
      return res.status(401).json({ error: "Login required." });
    }
    try {
      const valid = await verifyCredentials(username, password);
      if (!valid) return res.status(401).json({ error: "Invalid username or password." });
      req.username = username;
      next();
    } catch (err) {
      next(err);
    }
  };
}
