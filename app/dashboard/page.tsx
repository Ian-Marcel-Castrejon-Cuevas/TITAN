"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/layout/Footer";
import { api, Ticket } from "@/lib/api";
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  PlusCircle,
  Activity,
  Shield,
  X,
  XCircle,
  FileText,
  Download,
  Search,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Estadisticas {
  total_tickets: number;
  tickets_hoy: number;
  por_estado: {
    abierto: number;
    en_proceso: number;
    resuelto: number;
    cerrado: number;
  };
}

const SONIDOS = [
  "/audios/AMONG US.mp3",
  "/audios/CARRERITAS.mp3",
  "/audios/DISPARO.mp3",
  "/audios/GANADOR.mp3",
  "/audios/NIVEL COMPLETO.mp3",
  "/audios/PHONE.mp3",
  "/audios/XPMINECRAFT.mp3",
];

const SONIDO_BOTAR_CARVEN = "/audios/botarcarven.mp3";

const formatFechaHora = (fechaStr: string) => {
  if (!fechaStr) return "";
  return fechaStr;
};

const formatFecha = (date: Date) => {
  const dia = date.getDate().toString().padStart(2, "0");
  const mes = (date.getMonth() + 1).toString().padStart(2, "0");
  const año = date.getFullYear();
  return `${dia}/${mes}/${año}`;
};

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case "abierto":
      return "bg-red-500/20 text-red-400";
    case "en_proceso":
      return "bg-orange-500/20 text-orange-400";
    case "resuelto":
      return "bg-green-500/20 text-green-400";
    case "cerrado":
      return "bg-gray-500/20 text-gray-400";
    default:
      return "bg-gray-500/20 text-gray-400";
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

const limpiarEspacios = (texto: string) => {
  if (!texto) return "";
  return texto.replace(/\s+/g, " ").trim();
};

export default function DashboardPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Estadisticas | null>(null);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [activeTab, setActiveTab] = useState<
    "abierto" | "en_proceso" | "resuelto" | "cerrado"
  >("abierto");
  const [showReportModal, setShowReportModal] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState<Ticket[]>([]);
  const [showReportResults, setShowReportResults] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastTicketCount, setLastTicketCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [documentHidden, setDocumentHidden] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setDocumentHidden(document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const showSystemNotification = (title: string, body: string) => {
    if (documentHidden && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  const playSoundByMotivo = useCallback((motivo: string) => {
    let soundUrl: string;

    if (motivo && motivo.toLowerCase().trim() === "botar carven") {
      soundUrl = SONIDO_BOTAR_CARVEN;
    } else {
      const randomIndex = Math.floor(Math.random() * SONIDOS.length);
      soundUrl = SONIDOS[randomIndex];
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = soundUrl;
      audioRef.current.load();
      audioRef.current.play().catch((e) => console.log("Error:", e));
    } else {
      const audio = new Audio(soundUrl);
      audio.volume = 0.7;
      audio.play().catch((e) => console.log("Error:", e));
      audioRef.current = audio;
    }
  }, []);

  const showNewTicketNotification = useCallback(
    (newTicketsCount: number, lastTicket?: Ticket) => {
      if (newTicketsCount > 0) {
        if (lastTicket) {
          playSoundByMotivo(lastTicket.motivo);
        } else {
          const randomIndex = Math.floor(Math.random() * SONIDOS.length);
          const audio = new Audio(SONIDOS[randomIndex]);
          audio.volume = 0.7;
          audio.play().catch((e) => console.log("Error:", e));
        }

        if (newTicketsCount === 1 && lastTicket) {
          const message = `🎫 Nuevo ticket: ${lastTicket.ticket_id} - ${lastTicket.nombre}`;
          setNewTicketMessage(message);
          showSystemNotification("Nuevo Ticket", message);
        } else {
          const message = `🎉 ${newTicketsCount} nuevos tickets registrados!`;
          setNewTicketMessage(message);
          showSystemNotification("Nuevos Tickets", message);
        }

        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
      }
    },
    [playSoundByMotivo, documentHidden],
  );

  const loadData = useCallback(
    async (isAutoRefresh: boolean = false) => {
      try {
        const ticketsRes = await api.getTickets();
        const tickets = ticketsRes.tickets || [];

        if (lastTicketCount > 0 && tickets.length > lastTicketCount) {
          const newTicketsCount = tickets.length - lastTicketCount;
          showNewTicketNotification(newTicketsCount, tickets[0]);
        }

        setAllTickets(tickets);
        setLastTicketCount(tickets.length);

        setStats({
          total_tickets: tickets.length,
          tickets_hoy: tickets.filter(
            (t) =>
              new Date(t.fecha).toDateString() === new Date().toDateString(),
          ).length,
          por_estado: {
            abierto: tickets.filter((t) => t.estado === "abierto").length,
            en_proceso: tickets.filter((t) => t.estado === "en_proceso").length,
            resuelto: tickets.filter((t) => t.estado === "resuelto").length,
            cerrado: tickets.filter((t) => t.estado === "cerrado").length,
          },
        });

        setFilteredTickets(tickets.filter((t) => t.estado === activeTab));
      } catch (error) {
        console.error("Error cargando:", error);
        if (!isAutoRefresh) toast.error("Error al cargar datos");
      } finally {
        if (!isAutoRefresh) setLoading(false);
      }
    },
    [activeTab, lastTicketCount, showNewTicketNotification],
  );

  useEffect(() => {
    if (!isAdmin) return;
    loadData(false);
    const interval = setInterval(() => loadData(true), 5000);
    return () => clearInterval(interval);
  }, [isAdmin, loadData]);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push("/tickets");
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Buenos días");
    else if (hour < 18) setGreeting("Buenas tardes");
    else setGreeting("Buenas noches");
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    setFechaFin(hoy.toISOString().split("T")[0]);
    setFechaInicio(hace30Dias.toISOString().split("T")[0]);
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    setFilteredTickets(allTickets.filter((t) => t.estado === activeTab));
  }, [activeTab, allTickets]);

  const filterByStatus = (
    estado: "abierto" | "en_proceso" | "resuelto" | "cerrado",
  ) => {
    setActiveTab(estado);
    setSearchTerm("");
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim() === "") {
      filterByStatus(activeTab);
      return;
    }
    const filtered = allTickets.filter(
      (ticket) =>
        ticket.estado === activeTab &&
        (ticket.ticket_id.toLowerCase().includes(term.toLowerCase()) ||
          ticket.nombre.toLowerCase().includes(term.toLowerCase()) ||
          ticket.ch.toLowerCase().includes(term.toLowerCase()) ||
          ticket.motivo.toLowerCase().includes(term.toLowerCase())),
    );
    setFilteredTickets(filtered);
  };

  const generateReport = async () => {
    if (!fechaInicio || !fechaFin) {
      toast.error("Selecciona un rango de fechas");
      return;
    }
    setGeneratingReport(true);
    try {
      const response = await fetch("/api/tickets/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaInicio, fechaFin }),
      });
      const data = await response.json();
      if (data.success) {
        setReportData(data.tickets);
        setShowReportResults(true);
        toast.success(`Se encontraron ${data.total} tickets`);
      } else {
        toast.error("Error al generar reporte");
      }
    } catch (error) {
      toast.error("Error al generar reporte");
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadReport = () => {
    if (!reportData || reportData.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const headers = [
      "Fecha de Creación",
      "ID",
      "CH",
      "Nombre",
      "Nodo",
      "Departamento",
      "Plataforma",
      "Motivo",
      "Estado",
      "Fecha de Procesado",
      "Atendido por (Procesó)",
      "Fecha de Resuelto",
      "Atendido por (Resolvió)",
      "Fecha de Cierre",
      "Atendido por (Cerró)",
      "Creado Por",
    ];

    const rows = [headers];

    reportData.forEach((t) => {
      rows.push([
        t.fecha || "",
        t.ticket_id,
        t.ch,
        limpiarEspacios(t.nombre),
        t.nodo || "",
        t.cartera || "",
        t.plataforma || "",
        t.motivo || "",
        getEstadoTexto(t.estado),
        t.fecha_procesado || "",
        limpiarEspacios(t.procesado_por || ""),
        t.fecha_resuelto || "",
        limpiarEspacios(t.resuelto_por || ""),
        t.fecha_cerrado || "",
        limpiarEspacios(t.atendido_por || ""),
        limpiarEspacios(t.creado_por || t.ch),
      ]);
    });

    const csv = rows
      .map((row) => {
        return row
          .map((cell) => {
            const cellStr = String(cell);
            if (
              cellStr.includes(",") ||
              cellStr.includes('"') ||
              cellStr.includes("\n")
            ) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(",");
      })
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute(
      "download",
      `reporte_tickets_${fechaInicio}_a_${fechaFin}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Reporte descargado con ${reportData.length} tickets`);
  };

  const goToTicket = (ticketId: string) => router.push(`/tickets/${ticketId}`);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 ml-72 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const statCards = [
    {
      label: "Tickets Totales",
      value: stats?.total_tickets || 0,
      icon: TicketIcon,
      color: "from-purple-500 to-purple-600",
    },
    {
      label: "Tickets Abiertos",
      value: stats?.por_estado?.abierto || 0,
      icon: AlertCircle,
      color: "from-red-500 to-red-600",
    },
    {
      label: "En Proceso",
      value: stats?.por_estado?.en_proceso || 0,
      icon: Clock,
      color: "from-orange-500 to-orange-600",
    },
    {
      label: "Resueltos",
      value: stats?.por_estado?.resuelto || 0,
      icon: CheckCircle,
      color: "from-green-500 to-green-600",
    },
    {
      label: "Cerrados",
      value: stats?.por_estado?.cerrado || 0,
      icon: XCircle,
      color: "from-gray-500 to-gray-600",
    },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 ml-72 flex flex-col">
        <main className="flex-1 overflow-y-auto p-8">
          {/* NOTIFICACIÓN AMARILLA POPUP */}
          {showNotification && (
            <div className="fixed top-4 right-4 z-[9999] bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-4 py-3 rounded-xl shadow-2xl animate-fade-in">
              <div className="flex items-center gap-3">
                <TicketIcon className="w-5 h-5" />
                <span className="font-medium">{newTicketMessage}</span>
                <button
                  onClick={() => setShowNotification(false)}
                  className="ml-2 text-white/80 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-primary-500 rounded-full" />
                  <h2 className="text-3xl font-bold text-white">
                    {greeting},{" "}
                    {limpiarEspacios(user?.nombre?.split(" ")[0] || "Admin")}
                  </h2>
                </div>
                <p className="text-white/50 ml-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary-400" />
                  Panel de Administración
                </p>
              </div>
              <div className="glass-card px-4 py-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-400" />
                  <span className="text-white/70">
                    {formatFecha(new Date())}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-6 mb-8">
            {statCards.map((stat, i) => (
              <div
                key={i}
                onClick={() => {
                  if (stat.label !== "Tickets Totales") {
                    const estado =
                      stat.label === "Tickets Abiertos"
                        ? "abierto"
                        : stat.label === "En Proceso"
                          ? "en_proceso"
                          : stat.label === "Resueltos"
                            ? "resuelto"
                            : "cerrado";
                    filterByStatus(estado as any);
                  }
                }}
                className="cursor-pointer glass-card p-6 text-center hover:scale-105 transition"
              >
                <div
                  className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center shadow-lg mb-3`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-white/50 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setShowReportModal(true)}
              className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"
            >
              <FileText className="w-4 h-4 inline mr-2" /> Generar Reporte
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Buscar por ID, nombre, CH o motivo..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white w-64 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <h3 className="text-xl font-semibold text-white mb-4">
            Tickets {getEstadoTexto(activeTab)}s ({filteredTickets.length})
          </h3>

          {/* Tabla */}
          {filteredTickets.length === 0 ? (
            <div className="glass-card p-12 text-center text-white/40">
              No hay tickets
            </div>
          ) : (
            <div className="glass-card p-6 overflow-x-auto">
              <table className="w-full">
                <thead className="text-white/50 border-b border-white/10">
                  <tr>
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Usuario</th>
                    <th className="text-left py-2">CH</th>
                    <th className="text-left py-2">Motivo</th>
                    <th className="text-left py-2">Estado</th>
                    <th className="text-left py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.ticket_id}
                      onClick={() => goToTicket(ticket.ticket_id)}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                    >
                      <td className="py-2 font-mono text-primary-400 text-sm">
                        {ticket.ticket_id}
                      </td>
                      <td className="py-2 text-white">
                        {limpiarEspacios(ticket.nombre)}
                      </td>
                      <td className="py-2 text-white/80">{ticket.ch}</td>
                      <td className="py-2 text-white/80">{ticket.motivo}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getEstadoColor(ticket.estado)}`}
                        >
                          {getEstadoTexto(ticket.estado)}
                        </span>
                      </td>
                      <td className="py-2 text-white/50 text-sm">
                        {formatFechaHora(ticket.fecha)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
        <Footer />
      </div>

      {/* Modal Reporte */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Generar Reporte
            </h3>
            <div className="space-y-4">
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-2 rounded bg-slate-700 text-white"
              />
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-2 rounded bg-slate-700 text-white"
              />
              <div className="flex gap-3">
                <button
                  onClick={generateReport}
                  disabled={generatingReport}
                  className="flex-1 py-2 rounded bg-primary-500 text-white disabled:opacity-50"
                >
                  {generatingReport ? "Buscando..." : "Generar"}
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-2 rounded bg-slate-700 text-white"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Resultados */}
      {showReportResults && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-5xl w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                Reporte {fechaInicio} al {fechaFin}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={downloadReport}
                  className="px-3 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition flex items-center gap-1"
                >
                  <Download className="w-4 h-4" /> Descargar CSV
                </button>
                <button
                  onClick={() => setShowReportResults(false)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
            {reportData.length === 0 ? (
              <p className="text-white/40 text-center py-8">
                No hay tickets en el rango de fechas seleccionado
              </p>
            ) : (
              <>
                <p className="text-white/40 text-sm mb-4">
                  Total de tickets: {reportData.length}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-white/50 border-b border-white/10">
                      <tr>
                        <th className="text-left py-2">Fecha</th>
                        <th className="text-left py-2">ID</th>
                        <th className="text-left py-2">CH</th>
                        <th className="text-left py-2">Nombre</th>
                        <th className="text-left py-2">Motivo</th>
                        <th className="text-left py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((t) => (
                        <tr
                          key={t.ticket_id}
                          onClick={() => goToTicket(t.ticket_id)}
                          className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                        >
                          <td className="py-2 text-white/50 text-xs">
                            {formatFechaHora(t.fecha)}
                          </td>
                          <td className="py-2 font-mono text-primary-400 text-xs">
                            {t.ticket_id}
                          </td>
                          <td className="py-2 text-white/80 text-xs">{t.ch}</td>
                          <td className="py-2 text-white text-xs">
                            {limpiarEspacios(t.nombre)}
                          </td>
                          <td className="py-2 text-white/80 text-xs">
                            {t.motivo}
                          </td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${getEstadoColor(t.estado)}`}
                            >
                              {getEstadoTexto(t.estado)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
