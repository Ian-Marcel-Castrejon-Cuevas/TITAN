import { NextRequest, NextResponse } from "next/server";
import { getSqlConnection, generateTicketId } from "@/lib/db_sqlserver";

export async function GET(request: NextRequest) {
  try {
    const pool = await getSqlConnection();

    const result = await pool.request().query(`
      SELECT 
        ticket_id, ch, nombre, nodo, cartera, plataforma, 
        motivo, puesto, descripcion, estado, 
        fecha_creacion as fecha,
        fecha_procesado,
        fecha_resuelto,
        fecha_cerrado,
        creado_por
      FROM tickets 
      ORDER BY fecha_creacion DESC
    `);

    return NextResponse.json({ success: true, tickets: result.recordset });
  } catch (error) {
    console.error("Error al obtener tickets:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener tickets" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const ticketId = generateTicketId();

    const pool = await getSqlConnection();

    await pool
      .request()
      .input("ticket_id", ticketId)
      .input("ch", data.ch)
      .input("nombre", data.nombre)
      .input("nodo", data.nodo)
      .input("cartera", data.cartera)
      .input("plataforma", data.plataforma)
      .input("motivo", data.motivo)
      .input("puesto", data.puesto)
      .input("descripcion", data.descripcion)
      .input("creado_por", data.creado_por || data.ch).query(`
        INSERT INTO tickets (
          ticket_id, ch, nombre, nodo, cartera, plataforma, 
          motivo, puesto, descripcion, estado, 
          fecha_creacion, fecha_actualizacion, creado_por
        ) VALUES (
          @ticket_id, @ch, @nombre, @nodo, @cartera, @plataforma,
          @motivo, @puesto, @descripcion, 'abierto',
          GETDATE(), GETDATE(), @creado_por
        )
      `);

    await pool
      .request()
      .input("ticket_id", ticketId)
      .input("content", `Ticket creado. Motivo: ${data.motivo}`)
      .input("author", "Sistema").query(`
        INSERT INTO ticket_notes (ticket_id, note_type, content, author, tags, fecha_creacion)
        VALUES (@ticket_id, 'creacion', @content, @author, 'creado,sistema', GETDATE())
      `);

    return NextResponse.json({ success: true, ticketCode: ticketId });
  } catch (error) {
    console.error("Error al crear ticket:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear ticket" },
      { status: 500 },
    );
  }
}
