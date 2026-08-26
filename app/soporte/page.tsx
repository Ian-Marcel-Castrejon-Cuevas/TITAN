"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { api, Ticket, TicketNote } from "@/lib/api";
import {
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  X,
  Eye,
  Check,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

type TicketEstado = "abierto" | "en_proceso" | "resuelto" | "cerrado";

interface TicketWithNotes extends Ticket {
  notes?: TicketNote[];
}

export default function SoportePage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketWithNotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<TicketWithNotes | null>(
    null,
  );
  const [showModal, setShowModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    abierto: 0,
    en_proceso: 0,
    resuelto: 0,
    cerrado: 0,
  });

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const response = await api.getTickets("all");
      const ticketsData = response.tickets || [];
      setTickets(ticketsData);

      setStats({
        total: ticketsData.length,
        abierto: ticketsData.filter((t: Ticket) => t.estado === "abierto")
          .length,
        en_proceso: ticketsData.filter((t: Ticket) => t.estado === "en_proceso")
          .length,
        resuelto: ticketsData.filter((t: Ticket) => t.estado === "resuelto")
          .length,
        cerrado: ticketsData.filter((t: Ticket) => t.estado === "cerrado")
          .length,
      });
    } catch {
      toast.error("Error al cargar tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = async (ticket: TicketWithNotes) => {
    try {
      const response = await api.getTicket(ticket.ticket_id);
      setSelectedTicket({
        ...ticket,
        notes: response.notes || [],
      });
      setShowModal(true);
    } catch {
      toast.error("Error al cargar detalles");
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedTicket) return;

    setSendingNote(true);
    try {
      await api.addNote(selectedTicket.ticket_id, {
        content: newNote,
        note_type: "comentario",
        author: user?.nombre || "Soporte Técnico",
        tags: "soporte",
      });

      toast.success("Nota agregada");
      setNewNote("");
      const response = await api.getTicket(selectedTicket.ticket_id);
      setSelectedTicket({
        ...selectedTicket,
        notes: response.notes || [],
      });
      loadTickets();
    } catch {
      toast.error("Error al agregar nota");
    } finally {
      setSendingNote(false);
    }
  };

  const handleChangeStatus = async (
    ticketId: string,
    newStatus: TicketEstado,
  ) => {
    try {
      await api.changeStatus(ticketId, newStatus);
      toast.success(`Estado cambiado a ${getStatusText(newStatus)}`);
      loadTickets();
      if (selectedTicket && selectedTicket.ticket_id === ticketId) {
        const response = await api.getTicket(ticketId);
        setSelectedTicket({
          ...selectedTicket,
          estado: newStatus,
          notes: response.notes || [],
        });
      }
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const getStatusIcon = (estado: TicketEstado) => {
    switch (estado) {
      case "abierto":
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case "en_proceso":
        return <Clock className="w-5 h-5 text-orange-400" />;
      case "resuelto":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (estado: TicketEstado) => {
    switch (estado) {
      case "abierto":
        return "Abierto";
      case "en_proceso":
        return "En Proceso";
      case "resuelto":
        return "Resuelto";
      default:
        return "Cerrado";
    }
  };

  const getStatusBadgeClass = (estado: TicketEstado) => {
    switch (estado) {
      case "abierto":
        return "badge-pending";
      case "en_proceso":
        return "badge-progress";
      case "resuelto":
        return "badge-resolved";
      default:
        return "badge-closed";
    }
  };

  const exportToExcel = () => {
    const exportData = tickets.map((ticket) => ({
      ID: ticket.ticket_id,
      Estado: getStatusText(ticket.estado as TicketEstado),
      CH: ticket.ch,
      Nombre: ticket.nombre,
      Nodo: ticket.nodo,
      Cartera: ticket.cartera,
      Plataforma: ticket.plataforma,
      Motivo: ticket.motivo,
      Puesto: ticket.puesto,
      Descripción: ticket.descripcion,
      Fecha: new Date(ticket.fecha).toLocaleString("es-MX"),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tickets");
    XLSX.writeFile(
      wb,
      `cadnux_tickets_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    toast.success("Exportado a Excel");
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ch.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" || ticket.estado === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const statCards = [
    { label: "Total", value: stats.total, color: "from-blue-500 to-cyan-500" },
    {
      label: "Abiertos",
      value: stats.abierto,
      color: "from-red-500 to-orange-500",
    },
    {
      label: "En Proceso",
      value: stats.en_proceso,
      color: "from-orange-500 to-yellow-500",
    },
    {
      label: "Resueltos",
      value: stats.resuelto,
      color: "from-green-500 to-emerald-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 ml-72 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Cargando panel de soporte...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <main className="flex-1 ml-72 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full" />
                  <h2 className="text-3xl font-bold text-white">
                    Panel de Soporte
                  </h2>
                </div>
                <p className="text-white/50 ml-4">
                  Gestión completa de tickets - Equipo técnico
                </p>
              </div>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors flex items-center gap-2"
              >
                📊 Exportar a Excel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat, index) => (
              <div
                key={index}
                className={`glass-card p-4 text-center bg-gradient-to-br ${stat.color}/10`}
              >
                <p className="text-white/50 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="glass-card p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar por ID, nombre o CH..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-white/30 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              <div className="flex gap-2">
                {["all", "abierto", "en_proceso", "resuelto"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg capitalize transition-all duration-200 ${
                      filterStatus === status
                        ? "bg-primary-500 text-white"
                        : "bg-slate-800/50 text-white/60 hover:bg-slate-700/50"
                    }`}
                  >
                    {status === "all"
                      ? "Todos"
                      : getStatusText(status as TicketEstado)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">
                      ID
                    </th>
                    <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">
                      Estado
                    </th>
                    <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">
                      CH
                    </th>
                    <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">
                      Nombre
                    </th>
                    <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">
                      Nodo
                    </th>
                    <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">
                      Cartera
                    </th>
                    <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">
                      Motivo
                    </th>
                    <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">
                      Fecha
                    </th>
                    <th className="text-left py-3 px-4 text-white/60 text-sm font-medium">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-12 text-white/40"
                      >
                        No hay tickets
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <tr
                        key={ticket.ticket_id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono text-primary-400 text-sm">
                            {ticket.ticket_id}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(ticket.estado as TicketEstado)}
                            <span
                              className={`badge ${getStatusBadgeClass(ticket.estado as TicketEstado)}`}
                            >
                              {getStatusText(ticket.estado as TicketEstado)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {ticket.ch}
                        </td>
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {ticket.nombre}
                        </td>
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {ticket.nodo}
                        </td>
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {ticket.cartera}
                        </td>
                        <td className="py-3 px-4 text-white/80 text-sm">
                          {ticket.motivo}
                        </td>
                        <td className="py-3 px-4 text-white/50 text-sm">
                          {new Date(ticket.fecha).toLocaleDateString("es-MX")}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleViewTicket(ticket)}
                            className="p-2 rounded-lg bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {showModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800/95 backdrop-blur-sm p-6 border-b border-white/10 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-primary-400 text-lg">
                    {selectedTicket.ticket_id}
                  </span>
                  <span
                    className={`badge ${getStatusBadgeClass(selectedTicket.estado as TicketEstado)}`}
                  >
                    {getStatusText(selectedTicket.estado as TicketEstado)}
                  </span>
                </div>
                <p className="text-white/60">
                  {selectedTicket.nombre} • {selectedTicket.ch}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-white/40 text-sm">Nodo</p>
                  <p className="text-white">{selectedTicket.nodo}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-white/40 text-sm">Puesto</p>
                  <p className="text-white">{selectedTicket.puesto}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-white/40 text-sm">Cartera</p>
                  <p className="text-white">{selectedTicket.cartera}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-white/40 text-sm">Plataforma</p>
                  <p className="text-white">{selectedTicket.plataforma}</p>
                </div>
              </div>

              <div>
                <p className="text-white/40 text-sm mb-2">Motivo</p>
                <p className="text-white">{selectedTicket.motivo}</p>
              </div>

              <div>
                <p className="text-white/40 text-sm mb-2">Descripción</p>
                <div className="p-4 rounded-lg bg-slate-800/50 text-white whitespace-pre-wrap">
                  {selectedTicket.descripcion}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary-400" />
                  Notas del Soporte
                </h3>

                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {selectedTicket.notes && selectedTicket.notes.length > 0 ? (
                    selectedTicket.notes.map((note, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-slate-800/30 border border-white/5"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-primary-400 text-sm font-medium">
                            {note.author}
                          </span>
                          <span className="text-white/30 text-xs">
                            {new Date(note.timestamp).toLocaleString("es-MX")}
                          </span>
                        </div>
                        <p className="text-white/80 text-sm whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/40 text-center py-4">
                      No hay notas aún
                    </p>
                  )}
                </div>

                <div className="border-t border-white/10 pt-4">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Agregar nota de seguimiento..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  />
                  <div className="flex justify-between mt-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleChangeStatus(
                            selectedTicket.ticket_id,
                            "en_proceso",
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 text-sm transition-colors"
                      >
                        <Clock className="w-4 h-4 inline mr-1" />
                        En Proceso
                      </button>
                      <button
                        onClick={() =>
                          handleChangeStatus(
                            selectedTicket.ticket_id,
                            "resuelto",
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm transition-colors"
                      >
                        <Check className="w-4 h-4 inline mr-1" />
                        Resolver
                      </button>
                      {selectedTicket.estado === "resuelto" && (
                        <button
                          onClick={() =>
                            handleChangeStatus(
                              selectedTicket.ticket_id,
                              "abierto",
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 text-sm transition-colors"
                        >
                          <RotateCcw className="w-4 h-4 inline mr-1" />
                          Reabrir
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handleAddNote}
                      disabled={sendingNote || !newNote.trim()}
                      className="btn-primary flex items-center gap-2 py-1.5 px-4"
                    >
                      {sendingNote ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
