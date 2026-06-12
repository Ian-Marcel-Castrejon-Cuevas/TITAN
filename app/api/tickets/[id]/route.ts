import { NextRequest, NextResponse } from "next/server";
import { getSqlConnection } from "@/lib/db_sqlserver";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ticketId } = await params;

    const pool = await getSqlConnection();

    const ticketResult = await pool.request().input("ticket_id", ticketId)
      .query(`
        SELECT 
          ticket_id, ch, nombre, nodo, cartera, plataforma, 
          motivo, puesto, descripcion, estado, 
          fecha_creacion as fecha,
          fecha_procesado,
          fecha_resuelto,
          fecha_cerrado,
          creado_por,
          procesado_por,
          resuelto_por,
          atendido_por
        FROM tickets 
        WHERE ticket_id = @ticket_id
      `);

    if (ticketResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ticket no encontrado" },
        { status: 404 },
      );
    }

    const notesResult = await pool.request().input("ticket_id", ticketId)
      .query(`
        SELECT 
          id, note_type, content, author, 
          fecha_creacion as timestamp, 
          tags
        FROM ticket_notes 
        WHERE ticket_id = @ticket_id
        ORDER BY fecha_creacion DESC
      `);

    return NextResponse.json({
      success: true,
      ticket: ticketResult.recordset[0],
      notes: notesResult.recordset,
    });
  } catch (error) {
    console.error("Error al obtener ticket:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener ticket" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ticketId } = await params;
    const { estado } = await request.json();

    let usuario = "Sistema";
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

    console.log("🔧 Usuario que cambia estado:", usuario);
    console.log("🔧 Nuevo estado:", estado);

    const pool = await getSqlConnection();

    let updateQuery = `
      UPDATE tickets 
      SET estado = @estado, 
          fecha_actualizacion = GETDATE()
    `;

    if (estado === "en_proceso") {
      updateQuery += `, fecha_procesado = GETDATE()`;
      updateQuery += `, procesado_por = @usuario`;  
    } else if (estado === "resuelto") {
      updateQuery += `, fecha_resuelto = GETDATE()`;
      updateQuery += `, resuelto_por = @usuario`;  
    } else if (estado === "cerrado") {
      updateQuery += `, fecha_cerrado = GETDATE()`;
      updateQuery += `, atendido_por = @usuario`;   
    }

    updateQuery += ` WHERE ticket_id = @ticket_id`;

    await pool
      .request()
      .input("ticket_id", ticketId)
      .input("estado", estado)
      .input("usuario", usuario)
      .query(updateQuery);

    let statusText = "";
    switch (estado) {
      case "en_proceso":
        statusText = "En Proceso";
        break;
      case "resuelto":
        statusText = "Resuelto";
        break;
      case "cerrado":
        statusText = "Cerrado";
        break;
      default:
        statusText = estado;
    }

    await pool
      .request()
      .input("ticket_id", ticketId)
      .input("content", `Estado cambiado a: ${statusText}`)
      .input("author", usuario).query(`
        INSERT INTO ticket_notes (ticket_id, note_type, content, author, tags, fecha_creacion)
        VALUES (@ticket_id, 'cambio_estado', @content, @author, 'estado', GETDATE())
      `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar estado" },
      { status: 500 },
    );
  }
}