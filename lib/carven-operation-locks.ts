import fs from "node:fs";
import path from "node:path";

export type CarvenOperation = "carven1" | "carven2" | "carven3";

interface CarvenOperationLock {
  operation: CarvenOperation;
  ownerCh: string;
  ownerName: string;
  acquiredAt: string;
  expiresAt: number;
}

const LOCK_FILE = path.join(process.cwd(), "data", "carven-operation-locks.json");
const LOCK_TTL_MS = 10 * 60 * 1000;

function readLocks(): Partial<Record<CarvenOperation, CarvenOperationLock>> {
  try {
    return JSON.parse(fs.readFileSync(LOCK_FILE, "utf8")) as Partial<
      Record<CarvenOperation, CarvenOperationLock>
    >;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    console.error("Error leyendo locks de Carven:", error);
    return {};
  }
}

function writeLocks(
  locks: Partial<Record<CarvenOperation, CarvenOperationLock>>,
) {
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  const temporaryFile = `${LOCK_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(locks, null, 2), "utf8");
  fs.renameSync(temporaryFile, LOCK_FILE);
}

function removeExpiredLocks(
  locks: Partial<Record<CarvenOperation, CarvenOperationLock>>,
) {
  const now = Date.now();
  let changed = false;
  for (const operation of Object.keys(locks) as CarvenOperation[]) {
    if (locks[operation] && locks[operation].expiresAt <= now) {
      delete locks[operation];
      changed = true;
    }
  }
  return changed;
}

export function getCarvenOperation(motivo: unknown): CarvenOperation | null {
  if (typeof motivo !== "string") return null;
  const normalized = motivo.toLowerCase().replace(/\s+/g, "");
  if (normalized === "levantarcarven1") return "carven1";
  if (normalized === "levantarcarven2") return "carven2";
  if (normalized === "levantarcarven3") return "carven3";
  return null;
}

export function acquireCarvenOperation(
  operation: CarvenOperation,
  ownerCh: string,
  ownerName: string,
) {
  const locks = readLocks();
  const changed = removeExpiredLocks(locks);
  const current = locks[operation];

  if (current && current.ownerCh !== ownerCh) {
    if (changed) writeLocks(locks);
    return { acquired: false, lock: current };
  }

  const lock: CarvenOperationLock = {
    operation,
    ownerCh,
    ownerName,
    acquiredAt: current?.acquiredAt || new Date().toISOString(),
    expiresAt: Date.now() + LOCK_TTL_MS,
  };
  locks[operation] = lock;
  writeLocks(locks);
  return { acquired: true, lock };
}

export function releaseCarvenOperation(
  operation: CarvenOperation,
  ownerCh: string,
) {
  const locks = readLocks();
  const current = locks[operation];
  if (!current || current.ownerCh !== ownerCh) return false;
  delete locks[operation];
  writeLocks(locks);
  return true;
}

export function hasCarvenOperationLock(
  operation: CarvenOperation,
  ownerCh: string,
) {
  const locks = readLocks();
  const changed = removeExpiredLocks(locks);
  if (changed) writeLocks(locks);
  return locks[operation]?.ownerCh === ownerCh;
}
