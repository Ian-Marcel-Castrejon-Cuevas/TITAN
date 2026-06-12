"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { api, Ticket, TicketNote } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  FileText,
  Calendar,
  MessageSquare,
  Send,
  UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";

const formatFechaHora = (fechaStr: string) => {
  if (!fechaStr) return "";
  let fecha = fechaStr;
  if (fecha.includes("T")) {
    fecha = fecha.replace("T", " ");
  }
  if (fecha.includes(".")) {
    fecha = fecha.substring(0, fecha.lastIndexOf("."));
  }
  return fecha;
};

const formatFechaCorta = (fechaStr: string) => {
  if (!fechaStr) return "";
  let fecha = fechaStr;
  if (fecha.includes("T")) {
    fecha = fecha.replace("T", " ");
  }
  if (fecha.includes(".")) {
    fecha = fecha.substring(0, fecha.lastIndexOf("."));
  }
  const partes = fecha.split(" ");
  return partes[0];
};

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case "abierto":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "en_proceso":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "resuelto":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "cerrado":
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
};

const getEstadoTexto = (estado: string) => {
  switch (estado) {
    case "abierto":
      return "Abierto";
    case "en_proceso":
      return "En Proceso";
    case "resuelto":
      return "Resuelto";
    case "cerrado":
      return "Cerrado";
    default:
      return estado;
  }
};

const getStatusIcon = (estado: string) => {
  switch (estado) {
    case "abierto":
      return <AlertCircle className="w-6 h-6 text-red-400" />;
    case "en_proceso":
      return <Clock className="w-6 h-6 text-orange-400" />;
    case "resuelto":
      return <CheckCircle className="w-6 h-6 text-green-400" />;
    default:
      return <XCircle className="w-6 h-6 text-gray-400" />;
  }
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (ticketId) {
      loadTicket();
    }
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const response = await api.getTicket(ticketId);
      if (response.success && response.ticket) {
        setTicket(response.ticket);
        setNotes(response.notes || []);
      } else {
        toast.error("Ticket no encontrado");
        router.push("/tickets");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar el ticket");
      router.push("/tickets");
    } finally {
      setLoading(false);
    }
  };

  const createNotification = async (type: string, message: string) => {
    if (!ticket) return;
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departamento: ticket.cartera,
          ticket_id: ticketId,
          type: type,
          message: message,
          created_by: user?.nombre || user?.ch || 'Sistema'
        })
      });
      
      if (response.ok) {
        console.log(`📢 Notificación creada para departamento: ${ticket.cartera}`);
      }
    } catch (error) {
      console.error('Error al crear notificación:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Escribe una nota");
      return;
    }

    setSendingNote(true);
    try {
      const authorName = user?.nombre || "Usuario";
      
      await api.addNote(ticketId, {
        content: newNote,
        note_type: "comentario",
        author: authorName,
        tags: "comentario",
      });

      if (isAdmin && ticket) {
        await createNotification(
          'note',
          `📝 Nueva nota en ticket ${ticketId}: ${newNote.substring(0, 100)}`
        );
      }

      toast.success("Nota agregada");
      setNewNote("");
      loadTicket();
    } catch (error) {
      toast.error("Error al agregar nota");
    } finally {
      setSendingNote(false);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await api.changeStatus(ticketId, newStatus);

      let statusText = "";
      switch (newStatus) {
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
          statusText = newStatus;
      }

      if (ticket) {
        await createNotification(
          'status',
          `🔄 Ticket ${ticketId} cambió a estado: ${statusText}`
        );
      }

      toast.success(`Estado cambiado a: ${statusText}`);
      loadTicket();
    } catch (error) {
      toast.error("Error al cambiar estado");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 ml-72 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Cargando ticket...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 ml-72 overflow-y-auto">
          <div className="p-8">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Ticket Header */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(ticket.estado)}
                      <div>
                        <h1 className="text-2xl font-bold text-white">
                          {ticket.ticket_id}
                        </h1>
                        <p className="text-white/50 text-sm">
                          Creado el {formatFechaHora(ticket.fecha)}
                        </p>
                      </div>
                    </div>

                    {/* Solo ADMIN puede ver botones de cambio de estado */}
                    {isAdmin && (
                      <div className="flex gap-2">
                        {ticket.estado === "abierto" && (
                          <button
                            onClick={() => handleChangeStatus("en_proceso")}
                            disabled={updating}
                            className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                          >
                            {updating ? "Procesando..." : "Tomar en Proceso"}
                          </button>
                        )}
                        {ticket.estado === "en_proceso" && (
                          <button
                            onClick={() => handleChangeStatus("resuelto")}
                            disabled={updating}
                            className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                          >
                            {updating
                              ? "Procesando..."
                              : "Marcar como Resuelto"}
                          </button>
                        )}
                        {ticket.estado === "resuelto" && (
                          <button
                            onClick={() => handleChangeStatus("cerrado")}
                            disabled={updating}
                            className="px-4 py-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors disabled:opacity-50"
                          >
                            {updating ? "Procesando..." : "Cerrar Ticket"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium inline-flex ${getEstadoColor(ticket.estado)}`}
                  >
                    {getEstadoTexto(ticket.estado)}
                  </div>
                </div>

                {/* Ticket Details */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-400" />
                    Detalles del Ticket
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-white/40 text-sm">
                          Nombre del afectado
                        </p>
                        <p className="text-white font-medium">
                          {ticket.nombre}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 text-sm">CH del afectado</p>
                        <p className="text-white font-medium">{ticket.ch}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-sm flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          Creado por
                        </p>
                        <p className="text-white font-medium">
                          {ticket.creado_por || ticket.ch}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 text-sm">Nodo</p>
                        <p className="text-white font-medium">{ticket.nodo}</p>
                      </div>
                      <div>
                        <p className="text-white/40 text-sm">Puesto</p>
                        <p className="text-white font-medium">
                          {ticket.puesto}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 text-sm">
                          Cartera / Departamento
                        </p>
                        <p className="text-white font-medium">
                          {ticket.cartera}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/40 text-sm">Plataforma</p>
                        <p className="text-white font-medium">
                          {ticket.plataforma}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-white/40 text-sm mb-2">Motivo</p>
                      <p className="text-white">{ticket.motivo}</p>
                    </div>

                    <div>
                      <p className="text-white/40 text-sm mb-2">Descripción</p>
                      <div className="p-4 rounded-lg bg-slate-800/50 text-white whitespace-pre-wrap">
                        {ticket.descripcion}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary-400" />
                    Notas y Seguimiento
                  </h3>

                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {notes.length === 0 ? (
                      <p className="text-white/40 text-center py-8">
                        No hay notas aún
                      </p>
                    ) : (
                      notes.map((note, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg bg-slate-800/30 border border-white/5"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-primary-400" />
                              <span className="text-white font-medium text-sm">
                                {note.author}
                              </span>
                            </div>
                            <span className="text-white/30 text-xs">
                              {formatFechaHora(note.timestamp)}
                            </span>
                          </div>
                          <p className="text-white/80 text-sm whitespace-pre-wrap">
                            {note.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Note */}
                  <div className="border-t border-white/10 pt-4">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Agregar una nota..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={sendingNote || !newNote.trim()}
                      className="mt-3 btn-primary flex items-center gap-2"
                    >
                      {sendingNote ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Enviar Nota
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Información
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>Creado: {formatFechaCorta(ticket.fecha)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <MessageSquare className="w-4 h-4" />
                      <span>{notes.length} nota(s)</span>
                    </div>
                    {ticket.creado_por && ticket.creado_por !== ticket.ch && (
                      <div className="flex items-center gap-2 text-white/60 text-sm pt-2 border-t border-white/10">
                        <UserCheck className="w-4 h-4 text-primary-400" />
                        <span>
                          Creado por:{" "}
                          <span className="text-white">
                            {ticket.creado_por}
                          </span>
                        </span>
                      </div>
                    )}
                    {/* Fechas de estados */}
                    {ticket.fecha_procesado && (
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <span>
                          En Proceso: {formatFechaHora(ticket.fecha_procesado)}
                        </span>
                      </div>
                    )}
                    {ticket.fecha_resuelto && (
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>
                          Resuelto: {formatFechaHora(ticket.fecha_resuelto)}
                        </span>
                      </div>
                    )}
                    {ticket.fecha_cerrado && (
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <XCircle className="w-4 h-4 text-gray-400" />
                        <span>
                          Cerrado: {formatFechaHora(ticket.fecha_cerrado)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}