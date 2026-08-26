import { NextRequest, NextResponse } from "next/server";
import {
  confirmSession,
  destroySession,
  getSessionStatus,
} from "@/lib/session-store";
import { releaseTicketLocksByOwner } from "@/lib/ticket-locks";

export const runtime = "nodejs";

const SESSION_COOKIE = "titan_session";

function cookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

function unauthorized() {
  const response = NextResponse.json(
    { valid: false, error: "Sesión inválida o expirada" },
    { status: 401 },
  );
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  const status = sessionId ? getSessionStatus(sessionId) : null;

  if (!status) return unauthorized();
  return NextResponse.json({ valid: true, ...status });
}

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  const status = sessionId ? confirmSession(sessionId) : null;

  if (!status) return unauthorized();
  return NextResponse.json({ valid: true, ...status });
}

export async function DELETE(request: NextRequest) {
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    const session = getSessionStatus(sessionId);
    if (session) releaseTicketLocksByOwner(session.user.ch);
    destroySession(sessionId);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", {
    ...cookieOptions(request),
    maxAge: 0,
  });
  return response;
}
