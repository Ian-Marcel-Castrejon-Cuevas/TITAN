# Manual de Funcionamiento — TITAN

Última actualización: 2026-08-11

Resumen
- Propósito: Describir cómo usar la aplicación TITAN para la gestión de tickets y soporte.
- Público objetivo: operadores, agentes de soporte y usuarios finales.

1. Acceso y requisitos
- Requisitos previos:
  - Navegador moderno (Chrome, Edge, Firefox) con soporte para notificaciones y audio.
  - Conexión a la red de la organización que permita acceso a los servicios (Next.js, Flask, bases de datos).
- URL de acceso típica: `http://<host>:3000` (o la URL publicada por Nginx).

2. Inicio de sesión
- Ruta: `/login`
- Usuario: formato `CH12345` o uno de los usuarios autorizados listados en el formulario.
- Contraseña: introducida en el campo correspondiente.
- Flujo:
  1. El formulario envía credenciales a `/api/auth/login`.
  2. El backend de autenticación (Flask) valida usuario contra PostgreSQL y devuelve un JWT.
  3. El cliente guarda el token en `localStorage` y establece cookies de sesión.
  4. Redirección: administradores -> `/dashboard`, resto -> `/tickets`.
- Errores comunes:
  - Formato de usuario inválido: aparición de aviso en UI.
  - Credenciales incorrectas: mensaje desde el backend.

3. Navegación principal
- Barra lateral (`Sidebar`) con accesos:
  - `Mis Tickets` -> `/tickets`
  - `Nuevo Ticket` -> `/registro`
  - `Dashboard` -> `/dashboard` (solo admins)
  - `Cerrar sesión` -> elimina cookies/localStorage y redirige a `/login`

4. Crear un ticket (Registro)
- Ruta: `/registro`
- Campos principales: Usuario (CH), Nombre, Cartera/Departamento, Plataforma, Motivo, Descripción, Puesto, Nodo.
- Validaciones: formatos de CH, campos requeridos.
- Motivos especiales: para motivos relacionados con "Carven" se llaman internamente APIs adicionales (`/api/delete-carven`, `/api/restart-carven1`, `/api/restart-carven2`).
- Resultado: al enviar, el sistema crea un registro en `tickets` (SQL Server) y genera un `ticket_id` tipo `TKT-...`.

5. Consultar y gestionar tickets
- Ruta general: `/tickets` muestra los tickets del usuario o del departamento.
- Filtrado: por estado (`abierto`, `en_proceso`, `resuelto`, `cerrado`) y búsqueda por ID, CH o nombre.
- Detalle: `/tickets/[id]` muestra ticket y notas; desde ahí se pueden agregar notas y cambiar estado.
- Cambio de estado: al cambiar, la API actualiza la fecha correspondiente y añade una nota automática en `ticket_notes`.
- Eliminación: el sistema impide eliminar tickets con estado `cerrado`.

6. Soporte y administración
- `/soporte`: panel de soporte para ver todos los tickets, añadir notas, cambiar estados y exportar a Excel.
- `/dashboard`: vista administrativa con métricas, refresco automático (intervalo cada 5s para admins), reproducción de sonidos y notificaciones de nuevos tickets.
- Permisos: el middleware redirige a `/dashboard` solo si la cookie `cadnux_es_admin` está en `true`.

7. Notificaciones
- Persistentes: tabla `notifications` (SQL Server) con consultas desde `/api/notifications`.
- Polling: los hooks en cliente (ej. `useNotifications`, dashboard) interrogan cada 5s o 30s según la vista.
- Sistema de alertas: reproducción de audio y notificaciones del navegador cuando la pestaña está oculta.

8. Fotos de empleado
- Endpoint: `/api/empleados/foto?ch=CH12345` consulta `empleados_fotos` en SQL Server.

9. Comportamiento en errores comunes
- Backend inaccesible: la UI muestra error "No se pudo conectar con el servidor" y recomienda reintentar.
- Problemas de autenticación: borrar cookies y volver a iniciar sesión.
- Tickets no aparecen: actualizar la página o verificar permisos (departamento/rol).

10. Procedimientos operativos rápidos
- Cerrar sesión seguro: botón "Cerrar Sesión" en la barra lateral.
- Forzar refresco de datos (admin): en dashboard esperar el refresco automático o recargar la página.
- Ejecutar reinicio de Carven (si corresponde): crear ticket con motivo apropiado o usar la acción explícita en la UI que llama a `/api/restart-carven1` o `/api/restart-carven2`.

11. Contacto y soporte
- Administradores del sistema: (añadir contactos internos aquí).
- Para incidencias en producción: proveer logs (ver Manual de Mantenimiento, sección Logs) y copiar request/response relevantes.

---
Notas: este manual cubre el uso normal de la aplicación. Para tareas de despliegue, mantenimiento y solución de incidentes ver el Manual de Mantenimiento (docs/Manual_de_Mantenimiento.md).