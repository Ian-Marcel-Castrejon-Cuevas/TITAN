import fs from "node:fs";
import path from "node:path";

export interface TicketLock {
  ticketId: string;
  ownerCh: string;
  ownerName: string;
  acquiredAt: string;
  expiresAt: number;
}

const LOCK_FILE = path.join(process.cwd(), "data", "ticket-locks.json");
const LOCK_TTL_MS = 2 * 60 * 1000;

function readLocks(): Record<string, TicketLock> {
  try {
    const content = fs.readFileSync(LOCK_FILE, "utf8");
    return JSON.parse(content) as Record<string, TicketLock>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    console.error("Error leyendo locks de tickets:", error);
    return {};
  }
}

function writeLocks(locks: Record<string, TicketLock>) {
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  const temporaryFile = `${LOCK_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(locks, null, 2), "utf8");
  fs.renameSync(temporaryFile, LOCK_FILE);
}

function removeExpiredLocks(locks: Record<string, TicketLock>) {
  const now = Date.now();
  let changed = false;
  for (const [ticketId, lock] of Object.entries(locks)) {
    if (lock.expiresAt <= now) {
      delete locks[ticketId];
      changed = true;
    }
  }
  return changed;
}

export function acquireTicketLock(
  ticketId: string,
  ownerCh: string,
  ownerName: string,
) {
  const locks = readLocks();
  const changed = removeExpiredLocks(locks);
  const current = locks[ticketId];

  if (current && current.ownerCh !== ownerCh) {
    if (changed) writeLocks(locks);
    return { acquired: false, lock: current };
  }

  const lock: TicketLock = {
    ticketId,
    ownerCh,
    ownerName,
    acquiredAt: current?.acquiredAt || new Date().toISOString(),
    expiresAt: Date.now() + LOCK_TTL_MS,
  };
  locks[ticketId] = lock;
  writeLocks(locks);
  return { acquired: true, lock };
}

export function releaseTicketLock(ticketId: string, ownerCh: string) {
  const locks = readLocks();
  const current = locks[ticketId];
  if (!current || current.ownerCh !== ownerCh) return false;
  delete locks[ticketId];
  writeLocks(locks);
  return true;
}

export function hasTicketLock(ticketId: string, ownerCh: string) {
  const locks = readLocks();
  const changed = removeExpiredLocks(locks);
  if (changed) writeLocks(locks);
  return locks[ticketId]?.ownerCh === ownerCh;
}