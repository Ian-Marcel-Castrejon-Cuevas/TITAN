const API_URL = "";

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
        throw new Error(error.error || `Error ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error("Fetch error:", error);
      throw new Error("No se pudo conectar con el servidor");
    }
  }

  async getTickets(): Promise<{ success: boolean; tickets: Ticket[] }> {
    return this.request("/api/tickets");
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
      method: "PUT", // Cambiar de PATCH a PUT
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

  async getStats(): Promise<{ success: boolean; stats: any }> {
    return this.request("/api/tickets/stats");
  }

  async login(usuario_ch: string, password: string): Promise<any> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ usuario_ch, password }),
    });
  }
}

export const api = new API();
