import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';

export function useDashboardNotifications() {
  const { isAdmin } = useAuth();
  const [hasNewTickets, setHasNewTickets] = useState(false);
  const [lastCount, setLastCount] = useState(0);

  const checkNewTickets = useCallback(async () => {
    if (!isAdmin) return false;

    try {
      const response = await api.getTickets();
      const currentCount = response.tickets.length;
      
      if (lastCount === 0) {
        setLastCount(currentCount);
        return false;
      }
      
      const hasNew = currentCount > lastCount;
      
      if (hasNew) {
        console.log(`🎫 NUEVO TICKET DETECTADO! Total: ${currentCount}`);
        setHasNewTickets(true);
        setLastCount(currentCount);
      }
      
      return hasNew;
    } catch (error) {
      console.error('Error checking tickets:', error);
      return false;
    }
  }, [isAdmin, lastCount]);

  useEffect(() => {
    if (!isAdmin) return;
    
    checkNewTickets();
    const interval = setInterval(checkNewTickets, 5000);
    return () => clearInterval(interval);
  }, [isAdmin, checkNewTickets]);

  const reset = useCallback(() => {
    setHasNewTickets(false);
  }, []);

  return { hasNewTickets, reset };
}