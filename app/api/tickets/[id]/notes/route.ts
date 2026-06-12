import { NextRequest, NextResponse } from "next/server";
import { getSqlConnection } from "@/lib/db_sqlserver";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ticketId } = await params;
    const { content, note_type, tags } = await request.json();

    let usuario = "Usuario";
    const authHeader = request.headers.get("authorization");

    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const base64Payload = token.split(".")[1];
        const payload = JSON.parse(
          Buffer.from(base64Payload, "base64").toString(),
        );
        usuario = payload.nombre_completo || payload.usuario_ch || "Usuario";
      } catch (e) {
        console.error("Error decodificando token:", e);
      }
    }

    const pool = await getSqlConnection();

    await pool
      .request()
      .input("ticket_id", ticketId)
      .input("note_type", note_type || "comentario")
      .input("content", content)
      .input("author", usuario)
      .input("tags", tags || "").query(`
        INSERT INTO ticket_notes (ticket_id, note_type, content, author, tags, fecha_creacion)
        VALUES (@ticket_id, @note_type, @content, @author, @tags, GETDATE())
      `);

    await pool.request().input("ticket_id", ticketId).query(`
        UPDATE tickets 
        SET notas_count = notas_count + 1, fecha_actualizacion = GETDATE()
        WHERE ticket_id = @ticket_id
      `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al agregar nota:", error);
    return NextResponse.json(
      { success: false, error: "Error al agregar nota" },
      { status: 500 },
    );
  }
}
