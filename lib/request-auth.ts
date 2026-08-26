import type { NextRequest } from "next/server";
import { getSessionStatus, type SessionUser } from "@/lib/session-store";

export function getRequestUser(request: NextRequest): SessionUser | null {
  const sessionId = request.cookies.get("titan_session")?.value;
  if (!sessionId) return null;
  return getSessionStatus(sessionId)?.user || null;
}

export function isSameTicketOwner(
  owner: string | null | undefined,
  user: SessionUser,
) {
  if (!owner) return true;
  const normalizedOwner = owner.trim().toUpperCase();
  return [user.ch, user.nombre].some(
    (identity) => identity?.trim().toUpperCase() === normalizedOwner,
  );
}