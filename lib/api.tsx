const API_URL = "";

function expireSession(reason: string) {
  localStorage.removeItem("cadnux_token");
  localStorage.removeItem("cadnux_user_ch");
  localStorage.removeItem("cadnux_nombre");
  localStorage.removeItem("cadnux_departamento");
  localStorage.removeItem("cadnux_es_admin");
  localStorage.removeItem("cadnux_login_time");
  document.cookie =
    "cadnux_token=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
  document.cookie =
    "cadnux_es_admin=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
  void fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
  window.location.href = `/login?reason=${reason}`;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  usuario_ch: string;
  nombre_completo: string;
  departamento?: number;
  es_admin?: boolean;
  llave?: string;
}

export interface Ticket {
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
  updated_at?: string;
  fecha_procesado?: string;
  fecha_resuelto?: string;
  fecha_cerrado?: string;
  creado_por?: string;
  procesado_por?: string;
  resuelto_por?: string;
  atendido_por?: string;
}

export interface TicketNote {
  id?: number;
  ticket_id: string;
  note_type: string;
  content: string;
  author: string;
  timestamp: string;
  tags?: string;
}

class API {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = localStorage.getItem("cadnux_token");

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Error en la solicitud" }));

        if (response.status === 401) {
          expireSession("session-expired");
        }

        throw new Error(error.error || `Error ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Fetch error:", error);
      throw error instanceof Error
        ? error
        : new Error("No se pudo conectar con el servidor");
    }
  }

  async getTickets(
    scope: "mine" | "all" = "all",
    options: {
      status?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<{
    success: boolean;
    tickets: Ticket[];
    pagination?: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const params = new URLSearchParams({ scope });
    if (options.status && options.status !== "all") params.set("status", options.status);
    if (options.search) params.set("search", options.search);
    if (options.page) params.set("page", String(options.page));
    if (options.pageSize) params.set("pageSize", String(options.pageSize));
    return this.request(`/api/tickets?${params.toString()}`);
  }

  async getTicket(
    id: string,
  ): Promise<{ success: boolean; ticket: Ticket; notes: TicketNote[] }> {
    return this.request(`/api/tickets/${id}`);
  }

  async createTicket(
    data: Omit<Ticket, "ticket_id" | "estado" | "fecha">,
  ): Promise<{ success: boolean; ticketCode: string }> {
    return this.request("/api/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async addNote(
    ticketId: string,
    note: Omit<TicketNote, "ticket_id" | "id" | "timestamp">,
  ): Promise<{ success: boolean }> {
    return this.request(`/api/tickets/${ticketId}/notes`, {
      method: "POST",
      body: JSON.stringify(note),
    });
  }

  async changeStatus(
    ticketId: string,
    estado: string,
  ): Promise<{ success: boolean }> {
    return this.request(`/api/tickets/${ticketId}`, {
      method: "PUT",
      body: JSON.stringify({ estado }),
    });
  }

  async updateTicket(
    ticketId: string,
    data: { plataforma: string; motivo: string },
  ): Promise<{ success: boolean; ticket: Ticket }> {
    return this.request(`/api/tickets/${ticketId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteTicket(
    ticketId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/tickets/${ticketId}`, {
      method: "DELETE",
    });
  }

  async getStats(): Promise<{
    success: boolean;
    stats: {
      total_tickets: number;
      tickets_hoy: number;
      por_estado: Record<string, number>;
    };
  }> {
    return this.request("/api/tickets/stats");
  }

  async login(usuario_ch: string, password: string): Promise<AuthResponse> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ usuario_ch, password }),
    });
  }
}

export const api = new API();
