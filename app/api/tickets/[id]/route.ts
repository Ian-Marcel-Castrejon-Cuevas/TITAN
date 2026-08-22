import { NextRequest, NextResponse } from "next/server";
import { getSqlConnection } from "@/lib/db_sqlserver";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  /**
   * Obtiene un ticket por su ID junto con sus notas.
   *
   * Parámetros:
   * - `request` (NextRequest): petición entrante.
   * - `params` (object): objeto que contiene `{ id: string }` del ticket.
   *
   * Retorna:
   * - `NextResponse` con `{ success: true, ticket, notes }` si se encuentra el ticket.
   * - Si no existe, retorna `{ success: false, error: 'Ticket no encontrado' }` con status 404.
   *
   * Excepciones:
   * - Propaga errores relacionados a la conexión o consulta en SQL Server.
   *
   * Ejemplo:
   * await fetch(`/api/tickets/${ticketId}`)
   */
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
  /**
   * Actualiza el estado o campos básicos de un ticket identificado por ID.
   *
   * Comportamiento:
   * - Si `estado` está presente en el body, actualiza timestamps y crea una nota de cambio de estado.
   * - Si `plataforma` o `motivo` están presentes, actualiza esos campos.
   *
   * Parámetros:
   * - `request` (NextRequest): body JSON con campos a actualizar (`estado`, `plataforma`, `motivo`).
   * - `params` (object): `{ id: string }` identificador del ticket.
   *
   * Retorna:
   * - `NextResponse` con `{ success: true }` cuando la actualización es exitosa.
   * - En caso de error retorna `{ success: false, error: string }` y status 500.
   *
   * Excepciones:
   * - Errores de consulta/actualización en SQL Server.
   *
   * Ejemplo:
   * await fetch(`/api/tickets/${ticketId}`, { method: 'PUT', body: JSON.stringify({ estado: 'resuelto' }) })
   */
  try {
    const { id: ticketId } = await params;
    const body = await request.json();

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

    if (estado !== undefined) {
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
    } else if (plataforma !== undefined || motivo !== undefined) {
      const updateFields: string[] = [];
      const dbRequest = pool.request();

      if (plataforma !== undefined) {
        updateFields.push(`plataforma = @plataforma`);
        dbRequest.input("plataforma", plataforma);
      }

      if (motivo !== undefined) {
        updateFields.push(`motivo = @motivo`);
        dbRequest.input("motivo", motivo);
      }

      if (updateFields.length === 0) {
        return NextResponse.json(
          { success: false, error: "No hay campos para actualizar" },
          { status: 400 },
        );
      }

      updateFields.push("fecha_actualizacion = GETDATE()");

      const updateQuery = `
        UPDATE tickets 
        SET ${updateFields.join(", ")}
        WHERE ticket_id = @ticket_id
      `;

      dbRequest.input("ticket_id", ticketId);
      await dbRequest.query(updateQuery);

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
        { success: false, error: "No se especifico que actualizar" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error en PUT:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar ticket" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  /**
   * Elimina un ticket por su ID si no está en estado cerrado (lógica de seguridad de negocio).
   *
   * Parámetros:
   * - `request` (NextRequest): petición entrante (no necesita body).
   * - `params` (object): `{ id: string }` identificador del ticket.
   *
   * Retorna:
   * - `NextResponse` con `{ success: true, message }` si la eliminación fue permitida y ejecutada.
   * - Si el ticket está cerrado, retorna `{ success: false, message }` con status 400.
   *
   * Excepciones:
   * - Errores de eliminación en la base de datos se devuelven como status 500.
   *
   * Ejemplo:
   * await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' })
   */
  try {
    const { id: ticketId } = await params;

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

    const ticketResult = await pool
      .request()
      .input("ticket_id", ticketId)
      .query(`SELECT estado FROM tickets WHERE ticket_id = @ticket_id`);

    if (ticketResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ticket no encontrado" },
        { status: 404 },
      );
    }

    const ticket = ticketResult.recordset[0];

    if (ticket.estado === "cerrado") {
      return NextResponse.json(
        { success: false, error: "No se pueden eliminar tickets cerrados" },
        { status: 403 },
      );
    }

    await pool
      .request()
      .input("ticket_id", ticketId)
      .input("content", `Ticket eliminado por: ${usuario}`)
      .input("author", usuario).query(`
        INSERT INTO ticket_notes (ticket_id, note_type, content, author, tags, fecha_creacion)
        VALUES (@ticket_id, 'eliminacion', @content, @author, 'eliminado', GETDATE())
      `);

    await pool
      .request()
      .input("ticket_id", ticketId)
      .query(`DELETE FROM ticket_notes WHERE ticket_id = @ticket_id`);

    await pool
      .request()
      .input("ticket_id", ticketId)
      .query(`DELETE FROM tickets WHERE ticket_id = @ticket_id`);

    return NextResponse.json({
      success: true,
      message: "Ticket eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar ticket:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar ticket" },
      { status: 500 },
    );
  }
}
