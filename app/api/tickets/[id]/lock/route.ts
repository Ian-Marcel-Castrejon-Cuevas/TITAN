import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-auth";
import { acquireTicketLock, releaseTicketLock } from "@/lib/ticket-locks";
import { logError } from "@/lib/error-log";
import { getSqlConnection } from "@/lib/db_sqlserver";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = getRequestUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Sesión requerida" }, { status: 401 });
  }
  if (!user.es_admin) {
    return NextResponse.json({ success: false, error: "Solo los administradores pueden tomar tickets" }, { status: 403 });
  }

  try {
    const { id: ticketId } = await params;
    const pool = await getSqlConnection();
    const ticket = await pool
      .request()
      .input("ticket_id", ticketId)
      .query("SELECT ticket_id FROM tickets WHERE ticket_id = @ticket_id");
    if (ticket.recordset.length === 0) {
      return NextResponse.json({ success: false, error: "Ticket no encontrado" }, { status: 404 });
    }

    const result = acquireTicketLock(ticketId, user.ch, user.nombre);
    if (!result.acquired) {
      return NextResponse.json(
        { success: false, error: `No puedes tomar este ticket. Lo está gestionando ${result.lock.ownerName}.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true, lock: result.lock });
  } catch (error) {
    logError("Error al tomar ticket", error);
    return NextResponse.json({ success: false, error: "No se pudo tomar el ticket" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = getRequestUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Sesión requerida" }, { status: 401 });
  }
  if (!user.es_admin) {
    return NextResponse.json({ success: false, error: "Solo los administradores pueden liberar tickets" }, { status: 403 });
  }

  try {
    const { id: ticketId } = await params;
    return NextResponse.json({ success: true, released: releaseTicketLock(ticketId, user.ch) });
  } catch (error) {
    logError("Error al liberar ticket", error);
    return NextResponse.json({ success: false, error: "No se pudo liberar el ticket" }, { status: 500 });
  }
}
