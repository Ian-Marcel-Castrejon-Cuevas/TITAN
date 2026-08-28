"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { api, Ticket } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import {
  Search,
  Ticket as TicketIcon,
  AlertCircle,
  Clock,
  CheckCircle,
  PlusCircle,
  Building2,
  XCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const DEPARTAMENTOS: Record<number, string> = {
  1: "Dirección General",
  2: "Coordinación General",
  3: "Recuperación",
  4: "Administración",
  5: "Contabilidad",
  6: "Jurídico",
  7: "Captura",
  8: "Gestores Externos",
  9: "Sistemas",
  10: "Sucursales",
  11: "ARQUITECTURA",
  12: "AT&T",
  13: "AUDITORIA INTERNA",
  14: "BBVA",
  15: "Capacitación",
  16: "CITIBANAMEX",
  17: "COMPRAS",
  18: "COMUNICACION",
  19: "GM FINANCIAL",
  20: "GM FINANCIAL LEGAL",
  21: "INFONAVIT CAMPECHE",
  22: "INFONAVIT CANCUN",
  23: "INFONAVIT CDMX",
  24: "INFONAVIT CELAYA",
  25: "INFONAVIT CHETUMAL",
  26: "INFONAVIT GARCIA",
  27: "INFONAVIT IRAPUATO",
  28: "INFONAVIT LEON",
  29: "INFONAVIT MONTERREY",
  30: "INFONAVIT NUEVO LAREDO",
  31: "INFONAVIT NUEVO LEON",
  32: "INFONAVIT PLAYA DEL CARMEN",
  33: "INFONAVIT REYNOSA",
  34: "INFONAVIT TAMPICO",
  35: "MONITOREO Y CALIDAD",
  36: "RECURSOS HUMANOS",
  37: "SERVICIOS INTERNOS",
  38: "SUCURSAL CANCUN",
  39: "SUCURSAL CDMX",
  40: "SUCURSAL CHIAPAS",
  41: "SUCURSAL CHIHUAHUA",
  42: "SUCURSAL COLIMA",
  43: "SUCURSAL CULIACAN",
  44: "SUCURSAL GUADALAJARA",
  45: "SUCURSAL HERMOSILLO",
  46: "SUCURSAL LEON",
  47: "SUCURSAL MEXICALI",
  48: "SUCURSAL MONTERREY",
  49: "SUCURSAL MORELIA",
  50: "SUCURSAL OAXACA",
  51: "SUCURSAL PUEBLA",
  52: "SUCURSAL VERACRUZ",
  53: "TOYOTA",
  54: "VOLKSWAGEN (LEGAL)",
  55: "INFONAVIT CHIHUAHUA",
  56: "SCOTIABANK",
  57: "SEGURIDAD DE LA INFORMACIÓN",
  58: "Capacitación",
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

const getDepartamentoNombre = (cartera: string): string => {
  return cartera || "Sin departamento";
};

export default function TicketsPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const { notifications, unreadCount, markAsRead, fetchNotifications } =
    useNotifications();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [ticketsWithNotifications, setTicketsWithNotifications] = useState<
    Set<string>
  >(new Set());
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());
  const [ticketPage, setTicketPage] = useState(1);
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null>(null);

  const usesServerQuery = filterStatus === "cerrado" || searchTerm.trim() !== "";

  const loadTickets = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.getTickets("mine", {
        status: filterStatus === "all" ? undefined : filterStatus,
        search: searchTerm.trim() || undefined,
        page: usesServerQuery ? page : undefined,
        pageSize: usesServerQuery ? 100 : undefined,
      });
      const userTickets = response.tickets || [];

      setTickets(userTickets);
      setPagination(response.pagination || null);
      setTicketPage(response.pagination?.page || page);
    } catch {
      toast.error("Error al cargar tickets");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchTerm, usesServerQuery]);

  useEffect(() => {
    const ticketIds = new Set<string>();
    notifications.forEach((notif) => {
      if (notif.ticket_id) {
        ticketIds.add(notif.ticket_id);
      }
    });
    setTicketsWithNotifications(ticketIds);
  }, [notifications]);

  useEffect(() => {
    if (!authLoading) {
      loadTickets(ticketPage);
    }
  }, [authLoading, filterStatus, searchTerm, ticketPage, loadTickets]);

  useEffect(() => {
    if (!user?.ch || authLoading) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadTickets(ticketPage);
        fetchNotifications();
        setLastFetchTime(new Date());
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadTickets(ticketPage);
        fetchNotifications();
        setLastFetchTime(new Date());
      }
    };

    const handleWindowFocus = () => {
      loadTickets(ticketPage);
      fetchNotifications();
      setLastFetchTime(new Date());
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [
    user?.ch,
    authLoading,
    ticketPage,
    filterStatus,
    searchTerm,
    loadTickets,
    fetchNotifications,
  ]);

  const filteredTickets = usesServerQuery
    ? tickets
    : tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.motivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.descripcion &&
        ticket.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter =
      filterStatus === "all" || ticket.estado === filterStatus;

    return matchesSearch && matchesFilter;
    });

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setTicketPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setTicketPage(1);
  };

  const handleTicketClick = async (ticketId: string) => {
    const notificationsForTicket = notifications.filter(
      (n) => n.ticket_id === ticketId,
    );

    if (notificationsForTicket.length > 0) {
      const notificationIds = notificationsForTicket.map((n) => n.id);
      await markAsRead(notificationIds);

      setTimeout(() => {
        fetchNotifications();
      }, 500);
    }
  };

  const handleNotificationOpen = async (
    notification: (typeof notifications)[number],
  ) => {
    await markAsRead([notification.id]);
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 sidebar-content flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Cargando tus tickets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 sidebar-content flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 lg:p-8">
          <div className="mb-8">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full" />
                  <h2 className="text-3xl font-bold text-white">Mis Tickets</h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-500 text-black font-semibold animate-pulse">
                      {unreadCount} {unreadCount === 1 ? "nueva" : "nuevas"}
                    </span>
                  )}
                </div>
                <p className="text-white/50 ml-4">
                  {isAdmin
                    ? `Tickets del departamento: ${DEPARTAMENTOS[user?.departamento || 0] || "Sin departamento"}`
                    : "Consulta el estado de tus solicitudes"}
                </p>
                {lastFetchTime && (
                  <p className="text-white/30 text-xs ml-4 mt-1">
                    Última actualización: {lastFetchTime.toLocaleTimeString()}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 sm:justify-end">
                <button
                  onClick={() => {
                    loadTickets();
                    fetchNotifications();
                    toast.success("Datos actualizados");
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 text-white hover:bg-slate-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Actualizar
                </button>

                <Link
                  href="/registro"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Nuevo Ticket
                </Link>
              </div>
            </div>
          </div>

          <NotificationCenter
            notifications={notifications}
            onMarkAllRead={() => markAsRead()}
            onOpen={handleNotificationOpen}
          />

          <div className="glass-card p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar por ID, motivo o descripción..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-white/30 focus:outline-none focus:border-primary-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap">
              {["all", "abierto", "en_proceso", "resuelto", "cerrado"].map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => handleFilterChange(status)}
                    className={`px-4 py-2 rounded-lg capitalize transition-all duration-200 ${
                      filterStatus === status
                        ? "bg-primary-500 text-white"
                        : "bg-slate-800/50 text-white/60 hover:bg-slate-700/50"
                    }`}
                  >
                    {status === "all" ? "Todos" : getEstadoTexto(status)}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <TicketIcon className="w-10 h-10 text-white/20" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  No hay tickets
                </h3>
                <p className="text-white/40">
                  No se encontraron tickets con los filtros aplicados
                </p>
                <Link
                  href="/registro"
                  className="inline-block mt-4 px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                >
                  Crear nuevo ticket
                </Link>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const hasNewNote = ticketsWithNotifications.has(
                  ticket.ticket_id,
                );

                return (
                  <Link
                    key={ticket.ticket_id}
                    href={`/tickets/${ticket.ticket_id}`}
                    onClick={() => handleTicketClick(ticket.ticket_id)}
                    className="block group"
                  >
                    <div
                      className={`glass-card p-5 transition-all duration-300 cursor-pointer relative overflow-hidden
                      ${
                        hasNewNote
                          ? "border-yellow-500/50 bg-yellow-500/5 hover:border-yellow-500/70 ring-2 ring-yellow-500/30"
                          : "hover:border-primary-500/30"
                      }
                    `}
                    >
                      {hasNewNote && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 animate-pulse-fast" />
                          <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-yellow-500 to-amber-500" />
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500/0 via-yellow-500 to-yellow-500/0 animate-pulse" />
                        </>
                      )}

                      <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="relative">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center ${getEstadoColor(ticket.estado)}`}
                            >
                              {ticket.estado === "abierto" ? (
                                <AlertCircle className="w-5 h-5 text-red-400" />
                              ) : ticket.estado === "en_proceso" ? (
                                <Clock className="w-5 h-5 text-orange-400" />
                              ) : ticket.estado === "resuelto" ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            {hasNewNote && (
                              <>
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 animate-ping" />
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500" />
                              </>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span
                                className={`font-mono font-semibold ${hasNewNote ? "text-yellow-400" : "text-primary-400"}`}
                              >
                                {ticket.ticket_id}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(ticket.estado)}`}
                              >
                                {getEstadoTexto(ticket.estado)}
                              </span>
                              {hasNewNote && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs animate-pulse">
                                  <Bell className="w-3 h-3" />
                                  Nota nueva
                                </span>
                              )}
                              {ticket.cartera && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/50 text-xs text-white/60">
                                  <Building2 className="w-3 h-3" />
                                  {getDepartamentoNombre(ticket.cartera)}
                                </span>
                              )}
                            </div>
                            <p
                              className={`font-medium ${hasNewNote ? "text-yellow-100" : "text-white"}`}
                            >
                              {ticket.motivo}
                            </p>
                            <p className="text-white/40 text-sm mt-1 line-clamp-2">
                              {ticket.descripcion}
                            </p>
                            <div className="flex flex-wrap gap-4 mt-2 text-white/30 text-xs">
                              <span>Nodo: {ticket.nodo}</span>
                              <span>Plataforma: {ticket.plataforma}</span>
                            </div>
                            <p className="text-white/30 text-xs mt-2">
                              {formatFechaHora(ticket.fecha)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white/50 text-sm">
                            {formatFechaHora(ticket.fecha).split(" ")[0]}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {filteredTickets.length > 0 && (
            <div className="text-center text-white/40 text-sm mt-4">
              {pagination
                ? `Mostrando ${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(pagination.page * pagination.pageSize, pagination.total)} de ${pagination.total} tickets`
                : `Mostrando ${filteredTickets.length} de ${tickets.length} tickets`}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setTicketPage((page) => Math.max(1, page - 1))}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-700/60 px-4 py-2 text-sm text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <span className="text-sm text-white/60">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setTicketPage((page) =>
                    Math.min(pagination.totalPages, page + 1),
                  )
                }
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-700/60 px-4 py-2 text-sm text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
