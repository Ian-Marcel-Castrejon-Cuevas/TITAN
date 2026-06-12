export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getStatusColor = (status: string): string => {
  switch(status) {
    case 'abierto': return 'text-red-400 bg-red-500/20';
    case 'en_proceso': return 'text-orange-400 bg-orange-500/20';
    case 'resuelto': return 'text-green-400 bg-green-500/20';
    default: return 'text-gray-400 bg-gray-500/20';
  }
};

export const getStatusText = (status: string): string => {
  switch(status) {
    case 'abierto': return 'Abierto';
    case 'en_proceso': return 'En Proceso';
    case 'resuelto': return 'Resuelto';
    default: return 'Cerrado';
  }
};