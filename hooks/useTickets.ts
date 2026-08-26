'use client';

import { useState, useEffect } from 'react';
import { api, Ticket } from '@/lib/api';
import toast from 'react-hot-toast';

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const response = await api.getTickets("mine");
      setTickets(response.tickets || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar tickets');
      toast.error('Error al cargar tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  return { tickets, loading, error, reloadTickets: loadTickets };
}