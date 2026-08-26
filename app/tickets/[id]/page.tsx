"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { CustomDropdown } from "@/components/ui/CustomDropdown";
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
  Save,
  X,
  Briefcase,
} from "lucide-react";
import toast from "react-hot-toast";

const plataformas = [
  "Active Directory (AD)",
  "Problema con el equipo",
  "Carven",
  "Nuxiba Host",
  "Nuxiba Sitio",
  "Intranet",
  "Cyber",
  "Ccc Uno",
  "Otro",
];

const motivosActiveDirectory = [
  "Bloqueo de usuario",
  "Cuenta sin Aplicativos",
  "Restablecimiento de Contraseña",
  "Usuario Deshabilitado",
  "Cambio de Cartera",
  "Equipo Deshabilitado",
  "Corrección de Datos",
  "Alta de usuario o validación",
  "Otros",
];

const motivosProblemaEquipo = [
  "Movimiento de Equipo",
  "Equipo Congelado",
  "Problemas con Audio",
  "Problemas con Software",
  "Equipo lento",
  "Equipo sin Red",
  "Solicitud Consumible",
  "Reacomodo de Cableado",
  "Fallas en Monitor o proyección",
  "Problemas con Cableado",
  "Otros",
];

const motivosCarven = [
  "Botar Carven",
  "Cambio de contraseña",
  "Desbloqueo de Carven",
  "Asignar producto",
  "Quitar producto",
  "Agregar lista de trabajo individual",
  "Levantar carven 1",
  "Levantar carven 2",
  "Levantar carven 3",
  "Otros",
];

const motivosNuxibaHost = [
  "Cambio de contraseña",
  "Reasignación de grupo",
  "Asignación manual",
  "Autorización de transferencia",
  "Bloqueo de campañas",
  "Fallo de audio",
  "Bloqueo de calificación",
  "Cierre forzoso de sesión",
  "Otros",
];

const motivosNuxibaSitio = [
  "Cambio de contraseña",
  "Reasignación de grupo",
  "Asignación manual",
  "Autorización de transferencia",
  "Bloqueo de campañas",
  "Fallo de audio",
  "Bloqueo de calificación",
  "Cierre forzoso de sesión",
  "Otros",
];

const motivosIntranet = [
  "Asignar cartera",
  "Borrar publicación",
  "Error de página",
  "Otros",
];

const motivosCyber = ["Sin Acceso", "Otros"];

const motivosCCC = [
  "Bloqueo de campañas",
  "Fallo de audio",
  "Bloqueo de calificación",
  "Cierre forzoso de sesión",
  "Otros",
];

const getMotivosPorPlataforma = (plataforma: string): string[] => {
  switch (plataforma) {
    case "Active Directory (AD)":
      return motivosActiveDirectory;
    case "Problema con el equipo":
      return motivosProblemaEquipo;
    case "Carven":
      return motivosCarven;
    case "Nuxiba Host":
      return motivosNuxibaHost;
    case "Nuxiba Sitio":
      return motivosNuxibaSitio;
    case "Intranet":
      return motivosIntranet;
    case "Cyber":
      return motivosCyber;
    case "Ccc Uno":
      return motivosCCC;
    default:
      return ["Otro"];
  }
};

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
  const [deleting, setDeleting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    plataforma: "",
    motivo: "",
  });
  const [editNote, setEditNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [motivosDisponibles, setMotivosDisponibles] = useState<string[]>([]);
  const [lockAcquired, setLockAcquired] = useState(!isAdmin);
  const [lockOwnerName, setLockOwnerName] = useState("");
  const lastUpdatedAt = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (ticketId) {
      loadTicket();
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;

    const intervalId = window.setInterval(async () => {
      try {
        const response = await api.getTicket(ticketId);
        if (response.success && response.ticket) {
          if (response.ticket.updated_at !== lastUpdatedAt.current) {
            lastUpdatedAt.current = response.ticket.updated_at;
            setTicket(response.ticket);
            setNotes(response.notes || []);
          }
        }
      } catch {
        // La capa API gestiona la expiración de sesión y los errores de conexión.
      }
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId || !isAdmin) return;

    let active = true;
    const acquire = async () => {
      try {
        const response = await fetch(`/api/tickets/${ticketId}/lock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        if (!active) return;
        if (response.ok) {
          setLockAcquired(true);
          setLockOwnerName(data.lock?.ownerName || user?.nombre || "");
        } else {
          setLockAcquired(false);
          setLockOwnerName(data.error || "otro administrador");
          toast.error(data.error || "Otro administrador ya tomó este ticket");
        }
      } catch {
        if (active) {
          setLockAcquired(false);
          toast.error("No se pudo reservar el ticket");
        }
      }
    };

    void acquire();
    const heartbeatId = window.setInterval(() => {
      void acquire();
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(heartbeatId);
      void fetch(`/api/tickets/${ticketId}/lock`, {
        method: "DELETE",
        keepalive: true,
      }).catch(() => undefined);
    };
  }, [ticketId, isAdmin, user?.nombre]);

  useEffect(() => {
    if (isEditing && editForm.plataforma) {
      const nuevosMotivos = getMotivosPorPlataforma(editForm.plataforma);
      setMotivosDisponibles(nuevosMotivos);
      if (editForm.motivo && !nuevosMotivos.includes(editForm.motivo)) {
        setEditForm((prev) => ({ ...prev, motivo: "" }));
      }
    }
  }, [editForm.plataforma, isEditing]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const response = await api.getTicket(ticketId);
      if (response.success && response.ticket) {
        lastUpdatedAt.current = response.ticket.updated_at;
        setTicket(response.ticket);
        setNotes(response.notes || []);
        setEditForm({
          plataforma: response.ticket.plataforma,
          motivo: response.ticket.motivo,
        });
        setMotivosDisponibles(
          getMotivosPorPlataforma(response.ticket.plataforma),
        );
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
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departamento: ticket.cartera,
          ticket_id: ticketId,
          type: type,
          message: message,
          created_by: user?.nombre || user?.ch || "Sistema",
        }),
      });
    } catch (error) {
      console.error("Error al crear notificacion:", error);
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
          "note",
          `Nueva nota en ticket ${ticketId}: ${newNote.substring(0, 100)}`,
        );
      }

      toast.success("Nota agregada");
      setNewNote("");
      loadTicket();
    } catch {
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
          "status",
          `Ticket ${ticketId} cambio a estado: ${statusText}`,
        );
      }

      toast.success(`Estado cambiado a: ${statusText}`);
      if (newStatus === "cerrado") setLockAcquired(false);
      loadTicket();
    } catch {
      toast.error("Error al cambiar estado");
    } finally {
      setUpdating(false);
    }
  };

  const handleEditTicket = () => {
    setIsEditing(true);
    setEditNote("");
    if (ticket) {
      setMotivosDisponibles(getMotivosPorPlataforma(ticket.plataforma));
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditNote("");
    if (ticket) {
      setEditForm({
        plataforma: ticket.plataforma,
        motivo: ticket.motivo,
      });
      setMotivosDisponibles(getMotivosPorPlataforma(ticket.plataforma));
    }
  };

  const handleSaveEdit = async () => {
    if (!editNote.trim()) {
      toast.error("Debes escribir una nota explicando el motivo del cambio");
      return;
    }

    if (!editForm.plataforma || !editForm.motivo) {
      toast.error("La plataforma y el motivo son obligatorios");
      return;
    }

    if (
      editForm.plataforma === ticket?.plataforma &&
      editForm.motivo === ticket?.motivo
    ) {
      toast.error("No se detectaron cambios");
      return;
    }

    setSavingEdit(true);
    try {
      await api.updateTicket(ticketId, {
        plataforma: editForm.plataforma,
        motivo: editForm.motivo,
      });

      const cambios = [];
      if (editForm.plataforma !== ticket?.plataforma) {
        cambios.push(
          `Plataforma: "${ticket?.plataforma}" -> "${editForm.plataforma}"`,
        );
      }
      if (editForm.motivo !== ticket?.motivo) {
        cambios.push(`Motivo: "${ticket?.motivo}" -> "${editForm.motivo}"`);
      }

      const notaContenido = `MODIFICACION ADMINISTRATIVA\n\nCambios realizados:\n${cambios.join("\n")}\n\nMotivo del cambio:\n${editNote}\n\nModificado por: ${user?.nombre || user?.ch || "Administrador"}`;

      await api.addNote(ticketId, {
        content: notaContenido,
        note_type: "modificacion",
        author: user?.nombre || "Administrador",
        tags: "modificacion,admin",
      });

      await createNotification(
        "modificacion",
        `Ticket ${ticketId} fue modificado por ${user?.nombre || "Administrador"}:\n${cambios.join(", ")}`,
      );

      toast.success("Ticket modificado exitosamente");
      setIsEditing(false);
      setEditNote("");
      loadTicket();
    } catch (error) {
      console.error("Error al modificar ticket:", error);
      toast.error("Error al modificar el ticket");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticket) return;

    const confirmDelete = window.confirm(
      `Esta seguro de que desea eliminar el ticket ${ticket?.ticket_id}?\n\n` +
        `Esta accion no se puede deshacer y eliminara todas las notas asociadas.`,
    );

    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const response = await api.deleteTicket(ticketId);
      if (response.success) {
        toast.success("Ticket eliminado correctamente");
        setTimeout(() => {
          router.push("/tickets");
        }, 1500);
      } else {
        toast.error(response.message || "Error al eliminar ticket");
      }
    } catch (error) {
      console.error("Error al eliminar:", error);
      toast.error("Error al eliminar el ticket");
    } finally {
      setDeleting(false);
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

  const adminCanManageTicket = isAdmin && lockAcquired;
  const ticketLockedByAnotherAdmin = isAdmin && !lockAcquired;

  const showDeleteButton =
    (!isAdmin && ticket.estado === "abierto") || (isAdmin && adminCanManageTicket);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 ml-72 overflow-y-auto">
          <div className="p-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
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

                    <div className="flex gap-2 flex-wrap">
                      {!isEditing && adminCanManageTicket && (
                        <button
                          onClick={handleEditTicket}
                          className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        >
                          Editar Ticket
                        </button>
                      )}

                      {showDeleteButton && (
                        <button
                          onClick={handleDeleteTicket}
                          disabled={deleting || (isAdmin && !adminCanManageTicket)}
                          className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                          {deleting ? "Eliminando..." : "Eliminar Ticket"}
                        </button>
                      )}

                      {isAdmin && ticket.estado === "abierto" && (
                        <button
                          onClick={() => handleChangeStatus("en_proceso")}
                          disabled={updating || !adminCanManageTicket}
                          className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                        >
                          {updating ? "Procesando..." : "Tomar en Proceso"}
                        </button>
                      )}
                      {isAdmin && ticket.estado === "cerrado" && (
                        <button
                          onClick={() => handleChangeStatus("en_proceso")}
                          disabled={updating || !adminCanManageTicket}
                          className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors disabled:opacity-50"
                        >
                          {updating ? "Procesando..." : "Reabrir y Tomar"}
                        </button>
                      )}
                      {isAdmin && ticket.estado === "en_proceso" && (
                        <button
                          onClick={() => handleChangeStatus("resuelto")}
                          disabled={updating || !adminCanManageTicket}
                          className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                        >
                          {updating ? "Procesando..." : "Marcar como Resuelto"}
                        </button>
                      )}
                      {isAdmin && ticket.estado === "resuelto" && (
                        <button
                          onClick={() => handleChangeStatus("cerrado")}
                          disabled={updating || !adminCanManageTicket}
                          className="px-4 py-2 rounded-lg bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors disabled:opacity-50"
                        >
                          {updating ? "Procesando..." : "Cerrar Ticket"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium inline-flex ${getEstadoColor(ticket.estado)}`}
                  >
                    {getEstadoTexto(ticket.estado)}
                  </div>

                  {ticketLockedByAnotherAdmin && (
                    <div className="mt-4 rounded-xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-orange-200">
                      Este ticket está siendo gestionado por {lockOwnerName || "otro administrador"}. Las acciones se habilitarán cuando lo libere.
                    </div>
                  )}
                </div>

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
                    </div>

                    <div>
                      <p className="text-white/40 text-sm mb-2">Plataforma</p>
                      {isEditing ? (
                        <CustomDropdown
                          label="Plataforma"
                          options={plataformas}
                          value={editForm.plataforma}
                          onChange={(value) =>
                            setEditForm({ ...editForm, plataforma: value })
                          }
                          icon={<Briefcase className="w-4 h-4" />}
                        />
                      ) : (
                        <p className="text-white font-medium">
                          {ticket.plataforma}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-white/40 text-sm mb-2">Motivo</p>
                      {isEditing ? (
                        <CustomDropdown
                          label="Motivo"
                          options={motivosDisponibles}
                          value={editForm.motivo}
                          onChange={(value) =>
                            setEditForm({ ...editForm, motivo: value })
                          }
                          icon={<AlertCircle className="w-4 h-4" />}
                        />
                      ) : (
                        <p className="text-white">{ticket.motivo}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-white/40 text-sm mb-2">Descripcion</p>
                      <div className="p-4 rounded-lg bg-slate-800/50 text-white whitespace-pre-wrap">
                        {ticket.descripcion}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <label className="text-yellow-400 text-sm font-medium mb-2 block">
                          * Nota explicativa del cambio (obligatoria)
                        </label>
                        <textarea
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-yellow-500 resize-none"
                          placeholder="Explica por que estas realizando estos cambios..."
                        />
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={handleSaveEdit}
                            disabled={savingEdit}
                            className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors flex items-center gap-2 disabled:opacity-50"
                          >
                            {savingEdit ? (
                              <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            Guardar Cambios
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={savingEdit}
                            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary-400" />
                    Notas y Seguimiento
                  </h3>

                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {notes.length === 0 ? (
                      <p className="text-white/40 text-center py-8">
                        No hay notas aun
                      </p>
                    ) : (
                      notes.map((note, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${
                            note.tags?.includes("modificacion")
                              ? "bg-yellow-500/5 border-yellow-500/30"
                              : "bg-slate-800/30 border-white/5"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-primary-400" />
                              <span className="text-white font-medium text-sm">
                                {note.author}
                              </span>
                              {note.tags?.includes("modificacion") && (
                                <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">
                                  Modificacion
                                </span>
                              )}
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

              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Informacion
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
