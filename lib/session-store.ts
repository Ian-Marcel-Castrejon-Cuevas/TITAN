import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const SESSION_FILE = path.join(process.cwd(), "data", "sessions.json");
const CONFIRMATION_INTERVAL_MS = 60 * 60 * 1000;
const CONFIRMATION_TIMEOUT_MS = 10 * 60 * 1000;

export interface SessionUser {
  ch: string;
  nombre: string;
  departamento?: number;
  es_admin?: boolean;
}

interface StoredSession {
  sessionId: string;
  user: SessionUser;
  createdAt: number;
  lastConfirmedAt: number;
  confirmationRequestedAt?: number;
}

export interface SessionStatus {
  user: SessionUser;
  needsConfirmation: boolean;
  confirmationDeadline?: number;
}

function readSessions(): StoredSession[] {
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, "utf8")) as StoredSession[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function writeSessions(sessions: StoredSession[]) {
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  const temporaryFile = `${SESSION_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(sessions, null, 2), "utf8");
  fs.renameSync(temporaryFile, SESSION_FILE);
}

function findSession(sessionId: string) {
  return readSessions().find((session) => session.sessionId === sessionId);
}

export function createSession(user: SessionUser): string {
  const now = Date.now();
  const sessions = readSessions().filter(
    (session) => session.user.ch.toUpperCase() !== user.ch.toUpperCase(),
  );
  const sessionId = randomUUID();

  sessions.push({
    sessionId,
    user,
    createdAt: now,
    lastConfirmedAt: now,
  });
  writeSessions(sessions);

  return sessionId;
}

export function getSessionStatus(sessionId: string): SessionStatus | null {
  const sessions = readSessions();
  const session = sessions.find((item) => item.sessionId === sessionId);
  if (!session) return null;

  const now = Date.now();
  if (
    session.confirmationRequestedAt &&
    now - session.confirmationRequestedAt > CONFIRMATION_TIMEOUT_MS
  ) {
    writeSessions(sessions.filter((item) => item.sessionId !== sessionId));
    return null;
  }

  let changed = false;
  if (
    !session.confirmationRequestedAt &&
    now - session.lastConfirmedAt >= CONFIRMATION_INTERVAL_MS
  ) {
    session.confirmationRequestedAt = now;
    changed = true;
  }

  if (changed) writeSessions(sessions);

  return {
    user: session.user,
    needsConfirmation: Boolean(session.confirmationRequestedAt),
    confirmationDeadline: session.confirmationRequestedAt
      ? session.confirmationRequestedAt + CONFIRMATION_TIMEOUT_MS
      : undefined,
  };
}

export function confirmSession(sessionId: string): SessionStatus | null {
  const sessions = readSessions();
  const session = sessions.find((item) => item.sessionId === sessionId);
  if (!session) return null;

  session.lastConfirmedAt = Date.now();
  delete session.confirmationRequestedAt;
  writeSessions(sessions);

  return {
    user: session.user,
    needsConfirmation: false,
  };
}

export function destroySession(sessionId: string) {
  const sessions = readSessions();
  writeSessions(sessions.filter((session) => session.sessionId !== sessionId));
}

export function hasSession(sessionId: string): boolean {
  return Boolean(findSession(sessionId));
}
