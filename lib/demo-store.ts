import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { SessionUser } from "@/lib/session-store";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "demo-users.json");
const TICKETS_FILE = path.join(DATA_DIR, "demo-tickets.json");

export interface DemoUser extends SessionUser {
  password: string;
  token: string;
  llave: string;
}

export interface DemoNote {
  id: number;
  ticket_id: string;
  note_type: string;
  content: string;
  author: string;
  timestamp: string;
  tags: string;
}

export interface DemoTicket {
  ticket_id: string;
  ch: string;
  nombre: string;
  nodo: string;
  cartera: string;
  plataforma: string;
  motivo: string;
  puesto: string;
  descripcion: string;
  estado: "abierto" | "en_proceso" | "resuelto" | "cerrado";
  fecha: string;
  updated_at: string;
  fecha_procesado?: string;
  fecha_resuelto?: string;
  fecha_cerrado?: string;
  creado_por: string;
  procesado_por?: string;
  resuelto_por?: string;
  atendido_por?: string;
  notes: DemoNote[];
}

export function isDemoMode() {
  return process.env.TITAN_DEMO_MODE === "true";
}

function readJson<T>(file: string): T[] {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T[];
}

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryFile = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(temporaryFile, file);
}

function readTickets() {
  return readJson<DemoTicket>(TICKETS_FILE);
}

function publicTicket(ticket: DemoTicket) {
  return Object.fromEntries(
    Object.entries(ticket).filter(([key]) => key !== "notes"),
  ) as Omit<DemoTicket, "notes">;
}

function ownsTicket(ticket: DemoTicket, user: SessionUser) {
  return ticket.creado_por === user.ch || ticket.ch === user.ch;
}

export function authenticateDemoUser(ch: string, password: string) {
  const user = readJson<DemoUser>(USERS_FILE).find(
    (item) => item.ch.toUpperCase() === ch.toUpperCase() && item.password === password,
  );
  if (!user) return null;
  return Object.fromEntries(
    Object.entries(user).filter(([key]) => key !== "password"),
  ) as Omit<DemoUser, "password">;
}

export function listDemoTickets(
  user: SessionUser,
  options: { scope: string; status: string | null; search: string },
) {
  let tickets = readTickets().filter(
    (ticket) => options.scope !== "mine" || ownsTicket(ticket, user),
  );

  if (options.status) tickets = tickets.filter((ticket) => ticket.estado === options.status);
  if (options.search) {
    const search = options.search.toLowerCase();
    tickets = tickets.filter((ticket) =>
      [ticket.ticket_id, ticket.motivo, ticket.descripcion, ticket.nombre, ticket.ch]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }

  tickets.sort((left, right) => right.fecha.localeCompare(left.fecha));
  return tickets.map(publicTicket);
}

export function getDemoTicket(ticketId: string, user: SessionUser) {
  const ticket = readTickets().find((item) => item.ticket_id === ticketId);
  if (!ticket || (!user.es_admin && !ownsTicket(ticket, user))) return null;
  return { ticket: publicTicket(ticket), notes: ticket.notes };
}

export function createDemoTicket(data: Partial<DemoTicket>, user: SessionUser) {
  const now = new Date().toISOString();
  const ticketId = `DEMO-${Date.now().toString().slice(-6)}`;
  const ticket: DemoTicket = {
    ticket_id: ticketId,
    ch: data.ch || user.ch,
    nombre: data.nombre || user.nombre,
    nodo: data.nodo || "Demo",
    cartera: data.cartera || "Demostración",
    plataforma: data.plataforma || "Portal TITAN",
    motivo: data.motivo || "Solicitud de soporte",
    puesto: data.puesto || "Usuario",
    descripcion: data.descripcion || "Ticket creado durante la demostración.",
    estado: "abierto",
    fecha: now,
    updated_at: now,
    creado_por: user.ch,
    notes: [{
      id: Date.now(),
      ticket_id: ticketId,
      note_type: "creacion",
      content: `Ticket creado. Motivo: ${data.motivo || "Solicitud de soporte"}`,
      author: "Sistema",
      timestamp: now,
      tags: "creado,sistema",
    }],
  };
  const tickets = readTickets();
  tickets.push(ticket);
  writeJson(TICKETS_FILE, tickets);
  return ticketId;
}

export function updateDemoTicket(
  ticketId: string,
  user: SessionUser,
  changes: { estado?: DemoTicket["estado"]; plataforma?: string; motivo?: string },
) {
  const tickets = readTickets();
  const ticket = tickets.find((item) => item.ticket_id === ticketId);
  if (!ticket || (!user.es_admin && !ownsTicket(ticket, user))) return null;
  const now = new Date().toISOString();

  if (changes.estado) {
    ticket.estado = changes.estado;
    ticket.updated_at = now;
    if (changes.estado === "en_proceso") ticket.fecha_procesado = now;
    if (changes.estado === "resuelto") ticket.fecha_resuelto = now;
    if (changes.estado === "cerrado") ticket.fecha_cerrado = now;
    ticket.notes.unshift({
      id: Date.now(), ticket_id: ticketId, note_type: "cambio_estado",
      content: `Estado cambiado a: ${changes.estado}`, author: user.nombre || user.ch,
      timestamp: now, tags: "estado",
    });
    if (changes.estado === "cerrado") ticket.atendido_por = user.nombre || user.ch;
  }
  if (changes.plataforma !== undefined) ticket.plataforma = changes.plataforma;
  if (changes.motivo !== undefined) ticket.motivo = changes.motivo;
  ticket.updated_at = now;
  writeJson(TICKETS_FILE, tickets);
  return publicTicket(ticket);
}

export function deleteDemoTicket(ticketId: string, user: SessionUser) {
  const tickets = readTickets();
  const ticket = tickets.find((item) => item.ticket_id === ticketId);
  if (!ticket || (!user.es_admin && !ownsTicket(ticket, user))) return "not-found";
  if (ticket.estado === "cerrado") return "closed";
  writeJson(TICKETS_FILE, tickets.filter((item) => item.ticket_id !== ticketId));
  return "deleted";
}

export function addDemoNote(ticketId: string, user: SessionUser, data: Partial<DemoNote>) {
  const tickets = readTickets();
  const ticket = tickets.find((item) => item.ticket_id === ticketId);
  if (!ticket || (!user.es_admin && !ownsTicket(ticket, user))) return false;
  const now = new Date().toISOString();
  ticket.notes.unshift({
    id: Date.now(), ticket_id: ticketId, note_type: data.note_type || "comentario",
    content: data.content || "", author: user.nombre || user.ch, timestamp: now, tags: data.tags || "",
  });
  ticket.updated_at = now;
  writeJson(TICKETS_FILE, tickets);
  return true;
}

export function getDemoStats() {
  const tickets = readTickets();
  return {
    total_tickets: tickets.length,
    tickets_hoy: tickets.filter((ticket) => ticket.fecha.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
    por_estado: tickets.reduce<Record<string, number>>((counts, ticket) => {
      counts[ticket.estado] = (counts[ticket.estado] || 0) + 1;
      return counts;
    }, {}),
  };
}

export function getDemoReport(fechaInicio: string, fechaFin: string) {
  return readTickets()
    .filter((ticket) => ticket.fecha.slice(0, 10) >= fechaInicio && ticket.fecha.slice(0, 10) <= fechaFin)
    .map(publicTicket);
}

export function createDemoToken() {
  return `demo-${randomUUID()}`;
}