import crypto from "crypto";
import type { Config } from "./config.js";
import type { UserSession } from "./types.js";

const sessions = new Map<string, UserSession>();

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function createSession(config: Config, username: string): UserSession | null {
  const userConfig = config.users[username];
  if (!userConfig) return null;

  const token = generateToken();
  const now = Date.now();

  const session: UserSession = {
    token,
    user: {
      username,
      displayName: userConfig.displayName,
    },
    createdAt: now,
    expiresAt: now + config.sessionTTL,
  };

  sessions.set(token, session);
  return session;
}

export function validateSession(token: string): UserSession | null {
  const session = sessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return session;
}

export function destroySession(token: string): boolean {
  return sessions.delete(token);
}

export function validateLogin(config: Config, username: string, password: string): boolean {
  const userConfig = config.users[username];
  if (!userConfig) return false;
  return userConfig.password === password;
}

export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [token, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(token);
      cleaned++;
    }
  }

  return cleaned;
}
