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
    const body = await request.json();

    // Detectar qué tipo de actualización es
    const { estado, plataforma, motivo } = body;

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

    const pool = await getSqlConnection();

    // Caso 1: Actualización de estado
    if (estado !== undefined) {
      console.log("🔧 Usuario que cambia estado:", usuario);
      console.log("🔧 Nuevo estado:", estado);

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
    }

    // Caso 2: Actualización de plataforma y/o motivo
    else if (plataforma !== undefined || motivo !== undefined) {
      console.log("🔧 Usuario que modifica ticket:", usuario);
      console.log("🔧 Nueva plataforma:", plataforma);
      console.log("🔧 Nuevo motivo:", motivo);

      // Construir la consulta dinámicamente según los campos que llegan
      let updateFields = [];
      const request = pool.request();

      if (plataforma !== undefined) {
        updateFields.push("plataforma = @plataforma");
        request.input("plataforma", plataforma);
      }

      if (motivo !== undefined) {
        updateFields.push("motivo = @motivo");
        request.input("motivo", motivo);
      }

      if (updateFields.length === 0) {
        return NextResponse.json(
          { success: false, error: "No hay campos para actualizar" },
          { status: 400 },
        );
      }

      // Agregar fecha de actualización
      updateFields.push("fecha_actualizacion = GETDATE()");

      const updateQuery = `
        UPDATE tickets 
        SET ${updateFields.join(", ")}
        WHERE ticket_id = @ticket_id
      `;

      request.input("ticket_id", ticketId);
      await request.query(updateQuery);

      // No agregamos nota automática porque ya se agregó una nota manual desde el frontend
      // con la explicación del cambio

      // Obtener el ticket actualizado para devolverlo
      const updatedTicket = await pool.request().input("ticket_id", ticketId)
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

      return NextResponse.json({
        success: true,
        ticket: updatedTicket.recordset[0],
      });
    } else {
      return NextResponse.json(
        { success: false, error: "No se especificó qué actualizar" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error al actualizar ticket:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar ticket" },
      { status: 500 },
    );
  }
}
