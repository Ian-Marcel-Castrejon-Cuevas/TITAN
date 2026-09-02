import { NextRequest, NextResponse } from "next/server";
import { getSqlConnection } from "@/lib/db_sqlserver";
import { getRequestUser } from "@/lib/request-auth";
import { hasTicketLock, releaseTicketLock } from "@/lib/ticket-locks";
import { logError } from "@/lib/error-log";
import {
  deleteDemoTicket,
  getDemoTicket,
  isDemoMode,
  updateDemoTicket,
} from "@/lib/demo-store";

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
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Sesión requerida" }, { status: 401 });
    }

    if (isDemoMode()) {
      const demoTicket = getDemoTicket(ticketId, user);
      if (!demoTicket) {
        return NextResponse.json({ success: false, error: "Ticket no encontrado" }, { status: 404 });
      }
      return NextResponse.json({ success: true, ...demoTicket });
    }

    const pool = await getSqlConnection();
    const ticketRequest = pool.request().input("ticket_id", ticketId);
    if (!user.es_admin) ticketRequest.input("user_ch", user.ch);

    const ticketResult = await ticketRequest.query(`
        SELECT 
          ticket_id, ch, nombre, nodo, cartera, plataforma, 
          motivo, puesto, descripcion, estado, 
          fecha_creacion as fecha,
          fecha_actualizacion as updated_at,
          fecha_procesado,
          fecha_resuelto,
          fecha_cerrado,
          creado_por,
          procesado_por,
          resuelto_por,
          atendido_por
        FROM tickets 
        WHERE ticket_id = @ticket_id
        ${user.es_admin ? "" : "AND (creado_por = @user_ch OR (creado_por IS NULL AND ch = @user_ch))"}
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
    logError("Error al obtener ticket", error);
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
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Sesión requerida" }, { status: 401 });
    }

    const { estado, plataforma, motivo } = body;
    const validStatuses = ["abierto", "en_proceso", "resuelto", "cerrado"];

    if (estado !== undefined && !validStatuses.includes(estado)) {
      return NextResponse.json(
        { success: false, error: "Estado de ticket no válido" },
        { status: 400 },
      );
    }

    const usuario = user.nombre || user.ch;
    const owner = user.ch;

    if (isDemoMode()) {
      if (!estado && plataforma === undefined && motivo === undefined) {
        return NextResponse.json({ success: false, error: "No se especifico que actualizar" }, { status: 400 });
      }
      const ticket = updateDemoTicket(ticketId, user, { estado, plataforma, motivo });
      if (!ticket) return NextResponse.json({ success: false, error: "Ticket no encontrado" }, { status: 404 });
      return NextResponse.json({ success: true, ticket });
    }

    if (user.es_admin && !hasTicketLock(ticketId, user.ch)) {
      return NextResponse.json(
        { success: false, error: "Debes tomar el ticket antes de modificarlo" },
        { status: 409 },
      );
    }

    const pool = await getSqlConnection();
    const currentResult = await pool.request().input("ticket_id", ticketId).query(`
      SELECT ch, creado_por, estado, procesado_por
      FROM tickets
      WHERE ticket_id = @ticket_id
    `);

    if (currentResult.recordset.length === 0) {
      return NextResponse.json({ success: false, error: "Ticket no encontrado" }, { status: 404 });
    }

    const currentTicket = currentResult.recordset[0];
    if (!user.es_admin && currentTicket.creado_por !== user.ch && currentTicket.ch !== user.ch) {
      return NextResponse.json({ success: false, error: "No tienes permiso para este ticket" }, { status: 403 });
    }

    if (estado !== undefined) {
      let updateQuery = `
        UPDATE tickets 
        SET estado = @estado, 
            fecha_actualizacion = GETDATE()
      `;

      if (estado === "en_proceso") {
        updateQuery += `, fecha_procesado = GETDATE()`;
        if (!user.es_admin) updateQuery += `, procesado_por = @usuario`;
      } else if (estado === "resuelto") {
        updateQuery += `, fecha_resuelto = GETDATE()`;
        updateQuery += `, resuelto_por = @usuario`;
      } else if (estado === "cerrado") {
        updateQuery += `, fecha_cerrado = GETDATE()`;
        updateQuery += `, atendido_por = @usuario`;
      }

      if (user.es_admin) {
        updateQuery += `, procesado_por = CASE WHEN @estado = 'cerrado' THEN NULL ELSE COALESCE(procesado_por, @owner) END`;
      }

      updateQuery += " WHERE ticket_id = @ticket_id";

      const updateResult = await pool
        .request()
        .input("ticket_id", ticketId)
        .input("estado", estado)
        .input("usuario", usuario)
        .input("owner", owner)
        .input("owner_name", user.nombre)
        .query(updateQuery);

      if (updateResult.rowsAffected[0] === 0) {
        return NextResponse.json(
          { success: false, error: "Otro administrador está gestionando este ticket" },
          { status: 409 },
        );
      }

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

      if (user.es_admin && estado === "cerrado") {
        releaseTicketLock(ticketId, user.ch);
      }

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
      if (user.es_admin) updateFields.push("procesado_por = @owner");

      const updateQuery = `
        UPDATE tickets 
        SET ${updateFields.join(", ")}
        WHERE ticket_id = @ticket_id
      `;

      dbRequest.input("ticket_id", ticketId);
      dbRequest.input("owner", owner).input("owner_name", user.nombre);
      const updateResult = await dbRequest.query(updateQuery);

      if (updateResult.rowsAffected[0] === 0) {
        return NextResponse.json(
          { success: false, error: "Otro administrador está gestionando este ticket" },
          { status: 409 },
        );
      }

      const updatedTicket = await pool.request().input("ticket_id", ticketId)
        .query(`
          SELECT 
            ticket_id, ch, nombre, nodo, cartera, plataforma, 
            motivo, puesto, descripcion, estado, 
            fecha_creacion as fecha,
            fecha_actualizacion as updated_at,
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
    logError("Error en PUT de ticket", error);
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
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Sesión requerida" }, { status: 401 });
    }

    const usuario = user.nombre || user.ch;

    if (isDemoMode()) {
      const result = deleteDemoTicket(ticketId, user);
      if (result === "not-found") return NextResponse.json({ success: false, error: "Ticket no encontrado" }, { status: 404 });
      if (result === "closed") return NextResponse.json({ success: false, error: "No se pueden eliminar tickets cerrados" }, { status: 403 });
      return NextResponse.json({ success: true, message: "Ticket eliminado correctamente" });
    }

    const pool = await getSqlConnection();

    if (user.es_admin && !hasTicketLock(ticketId, user.ch)) {
      return NextResponse.json(
        { success: false, error: "Debes tomar el ticket antes de eliminarlo" },
        { status: 409 },
      );
    }

    const ticketResult = await pool
      .request()
      .input("ticket_id", ticketId)
      .query(`SELECT estado, ch, creado_por, procesado_por FROM tickets WHERE ticket_id = @ticket_id`);

    if (ticketResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ticket no encontrado" },
        { status: 404 },
      );
    }

    const ticket = ticketResult.recordset[0];

    if (!user.es_admin && ticket.creado_por !== user.ch && ticket.ch !== user.ch) {
      return NextResponse.json({ success: false, error: "No tienes permiso para este ticket" }, { status: 403 });
    }

    if (ticket.estado === "cerrado" && !user.es_admin) {
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

    const deleteResult = await pool
      .request()
      .input("ticket_id", ticketId)
      .input("owner", user.ch)
      .input("owner_name", user.nombre)
      .query("DELETE FROM tickets WHERE ticket_id = @ticket_id");

    if (deleteResult.rowsAffected[0] === 0) {
      return NextResponse.json(
        { success: false, error: "Otro administrador está gestionando este ticket" },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Ticket eliminado correctamente",
    });
  } catch (error) {
    logError("Error al eliminar ticket", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar ticket" },
      { status: 500 },
    );
  }
}
