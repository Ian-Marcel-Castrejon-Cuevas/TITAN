# Manual de Mantenimiento — TITAN

Última actualización: 2026-08-11

Propósito
- Proveer información técnica para administradores, ingenieros de soporte y desarrolladores encargados del mantenimiento operativo y evolutivo del sistema TITAN.

Índice
1. Visión general de la arquitectura
2. Servicios y puertos
3. Repositorios y rutas clave
4. Bases de datos
5. Variables de entorno críticas
6. Despliegue y arranque
7. Backups y restauración
8. Monitorización y logs
9. Seguridad y buenas prácticas
10. Tareas de mantenimiento frecuentes
11. Procedimiento de recuperación ante fallos
12. Mejoras recomendadas

---

1. Visión general de la arquitectura
- Frontend + BFF: Next.js 15 (App Router) en TypeScript.
- Backend de autenticación: Flask (Python 3.10) en `cadnux-backend/app.py`.
- Persistencia:
  - SQL Server: tablas `tickets`, `ticket_notes`, `notifications`, `empleados_fotos`.
  - PostgreSQL: tablas relacionadas con empleados (`tbempleados`) y `tbingresos` para Carven.
- Integraciones infra:
  - SSH (comandos remotos) para reiniciar servicios Carven.
  - HTTP interno para health checks de Carven.
  - Nginx como proxy reverso (config en `nginx-1.30.2/conf/nginx.conf`).

2. Servicios y puertos (defaults observados)
- Next.js: 3000 (producción), 3002 (desarrollo proxy en nginx.conf).
- Flask cadnux-backend: 5001 (por defecto en `app.py`).
- PostgreSQL: 5432 (host configurado en rutas PG_* env vars).
- SQL Server: puerto configurado por `SQL_PORT` (por defecto 1433).

3. Rutas y archivos clave
- Frontend/App router: `app/` (páginas y API routes).
- Autenticación proxy: `app/api/auth/login/route.ts` (llama a `NEXT_PUBLIC_BACKEND_URL` o default 192.168.8.87:5001).
- Hooks de cliente: `hooks/useAuth.tsx`, `hooks/useNotifications.ts`, `hooks/useTickets.ts`.
- Conexión a SQL Server: `lib/db_sqlserver.ts`.
- SSH helper: `lib/ssh.ts` (utilidad JS) y implementaciones de reinicio en `app/api/restart-carven1` y `app/api/restart-carven2` (que usan `sshpass` y `child_process`).
- Backend Python: `cadnux-backend/app.py` (login y validación Twofish).

4. Bases de datos
- SQL Server (MSSQL): contiene la lógica de tickets, notas y notificaciones. Asegúrese de:
  - Mantener un plan de backups completo (differential + full + logs) según RPO/RTO.
  - Indices: verificar índices en `tickets(ticket_id)`, `ticket_notes(ticket_id)`, `notifications(user_ch, departamento)`.
- PostgreSQL: almacena `tbempleados` y `tbingresos` usados por la autenticación y operaciones Carven.

5. Variables de entorno críticas
- Next/Frontend:
  - `NEXT_PUBLIC_BACKEND_URL` — URL del backend de autenticación (Flask).
  - `SQL_SERVER, SQL_DATABASE, SQL_USER, SQL_PASSWORD, SQL_PORT`
  - `PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE` (usado por algunas rutas Next que acceden a PostgreSQL)
  - `SSH_HOST / SSH_USER / SSH_PASS / SSH_HOST2 / SSH_USER2 / SSH_PASS2`
- Sesiones:
  - `data/sessions.json` — registro local de la única sesión activa por usuario.
  - El archivo debe permanecer en el mismo servidor donde corre Next.js y no debe compartirse entre réplicas sin un mecanismo de bloqueo/almacenamiento común.
- Flask (`cadnux-backend`):
  - `DB_HOST, DB_PORT, DB_DATABASE, DB_USER, DB_PASSWORD` (PostgreSQL de empleados)
  - `SECRET_KEY` o `JWT_SECRET`
  - `ADMIN_DEPARTMENTS`, `JWT_EXPIRATION_HOURS`

6. Despliegue y arranque
- Entorno típico (producción):
  1. Desplegar la app Next (build y start) en PM2/systemd o contenedor.
  2. Iniciar Flask (`python app.py` o configurar Gunicorn/uWSGI + systemd).
  3. Configurar Nginx para apuntar al puerto del Next app.
  4. Asegurar que PostgreSQL y SQL Server estén disponibles y con backup habilitado.

- Comandos útiles:
```bash
# Frontend (root repo)
npm install
npm run build
npm start

# Backend Python (cadnux-backend)
# activar entorno virtual
python -m venv venv310
# Windows
.\venv310\Scripts\activate
pip install -r requirements.txt
python app.py
```

7. Backups y restauración
- SQL Server:
  - Backup full diario, differential cada 6 horas y transaccional según volumen.
  - Pruebas de restore en entorno staging mínimo mensual.
- PostgreSQL:
  - `pg_dump` programado, con rotación de archivos y verificación de integridad.

8. Monitorización y logs
- Next: revisar logs de proceso (stdout/stderr) y agregar un aggregador (e.g., ELK, Grafana Loki).
- Flask: logs impresos en consola en `app.py` y `traceback` en excepción; redirigir a archivo o sistema de logs central.
- SQL Server/Postgres: activar alertas por alta latencia/conexiones.
- Health checks: crear endpoints adicionales y monitoreo (Ping a `/health` de Flask y rutas internas de Next).

9. Seguridad y buenas prácticas
- Nunca almacenar credenciales en repositorio. Usar vault o secrets manager.
- Revisar que `JWT_SECRET` sea el mismo entre servicios que verifican tokens.
- Cambiar `CORS` abierto y `Access-Control-Allow-Origin: *` por dominios de producción.
- Evitar uso de `sshpass` en producción; preferir claves SSH con `ssh-agent` y control de accesos.
- Habilitar `HttpOnly` y `Secure` en cookies de sesión si es posible.
- Validar tokens en servidor (no confiar solo en la decodificación de payload base64).
- La sesión única de TITAN se controla con la cookie `titan_session`; iniciar sesión en otro equipo invalida la anterior.
- Cada hora se solicita confirmación; si no se confirma en 10 minutos, la sesión se elimina del JSON local.

10. Tareas de mantenimiento frecuentes
- Actualizar dependencias Node/Python: revisar `package.json` y `requirements.txt` (si procede).
- Verificar integridad de conexiones SQL: `testSqlConnection()` y comprobar pool en `lib/db_sqlserver.ts`.
- Rotación de logs y limpieza de tablas temporales (ej. `tbingresos` si aplica).
- Revisar credenciales SSH y renovar claves.
- Comprobar endpoints de Carven y ajustar timeouts en `restart-carven*`.

11. Procedimiento de recuperación ante fallos
- Si Next no arranca: revisar `npm run build` y errores de TypeScript/compilación.
- Si Flask falla: revisar `cadnux-backend/app.py` logs, intentar reiniciar Gunicorn/systemd.
- Si SQL Server no responde: activar plan DR, recuperar desde backup, verificar integridad de logs transaccionales.
- Para des-sincronización de tokens: regenerar `JWT_SECRET` coordinadamente y forzar relogin de usuarios.

12. Mejoras recomendadas (priorizadas)
- Centralizar la autenticación (unificar la verificación de JWT y el secreto compartido) y validar tokens en todas las rutas Next.
- Mover lógica sensible fuera de llamadas shell y `sshpass`; usar API SSH segura con claves gestionadas.
- Añadir autenticación a las rutas API (verificar firmas JWT con `jsonwebtoken`/`jwt.verify`).
- Reemplazar polling agresivo por WebSocket o SSE para notificaciones en tiempo real.
- Automatizar backups y pruebas de restore con pipelines.

---

Apéndice
- Ubicaciones de archivos:
  - Manual de funcionamiento: `docs/Manual_de_Funcionamiento.md`
  - Manual de mantenimiento: `docs/Manual_de_Mantenimiento.md`
  - Código clave: `app/`, `lib/`, `cadnux-backend/app.py`, `nginx-1.30.2/conf/nginx.conf`

- Contactos de operación: (añadir aquí equipos y correos responsables)

