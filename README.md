# TITAN

## Visión general

TITAN es una plataforma empresarial orientada a la operación interna, atención de incidencias y administración de accesos en entornos corporativos. La solución integra un frontend moderno basado en Next.js con un backend en Python para manejar autenticación, consultas de datos, validación de usuarios y automatización de procesos críticos.

Su propósito es ofrecer una experiencia robusta, segura y operativa para la gestión de tickets, soporte técnico, paneles de control y servicios conectados a infraestructura empresarial.

## Objetivos del proyecto

- Centralizar la gestión operativa y de soporte interno
- Mejorar la trazabilidad de tickets y eventos del negocio
- Optimizar procesos de autenticación y control de acceso
- Integrar datos de sistemas internos con interfaces modernas y escalables
- Proveer una capa de administración eficiente para equipos de soporte y operación

## Arquitectura

### Frontend

- Next.js 15
- React 18
- TypeScript
- Tailwind CSS
- TanStack Query
- Axios
- Recharts
- React Hot Toast
- Lucide React

### Backend

- Python 3.10
- Flask
- PostgreSQL
- SQL Server
- psycopg2
- PyJWT
- bcryptjs
- Twofish
- ssh2
- mssql
- xlsx

### Patrones de diseño

- Enrutamiento del frontend con App Router de Next.js
- APIs internas para lógica de negocio y consumo de datos
- Backend dedicado para autenticación, validaciones y procesos críticos
- Configuración por variables de entorno para mantener seguridad y portabilidad
- Integración con infraestructura remota mediante SSH

## Estado funcional

El proyecto contempla módulos para:

- autenticación y control de sesiones
- gestión de tickets y soporte
- dashboard operativo
- reportes y visualización de datos
- registro y consulta de usuarios
- notificaciones y comunicaciones internas
- integración con servicios remotos y bases de datos

## Requisitos del entorno

Antes de levantar el sistema, asegúrate de contar con:

- Node.js 18 o superior
- npm o yarn
- Python 3.10 o superior
- PostgreSQL o SQL Server configurado
- Credenciales para servicios SSH y entorno local

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd TITAN
```

### 2. Instalar dependencias del frontend

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo [.env.example](.env.example) a un archivo local real como `.env.local` o `.env` y completa los valores requeridos para tu entorno.

```env
# PostgreSQL
PG_HOST=
PG_PORT=5432
PG_USER=
PG_PASSWORD=
PG_DATABASE=

# Backend y aplicación
NEXT_PUBLIC_BACKEND_URL=
NEXT_PUBLIC_APP_URL=
JWT_SECRET=
SESSION_SECRET=

# SSH / servicios remotos
SSH_HOST=
SSH_USER=
SSH_PASS=
SSH_PORT=22

# SQL Server
SQL_USER=
SQL_PASSWORD=
SQL_SERVER=
SQL_PORT=1433
SQL_DATABASE=
SQL_ENCRYPT=false
SQL_TRUST_SERVER_CERTIFICATE=true
```

> Nunca guardes credenciales reales en el repositorio. Usa variables de entorno locales o un gestor seguro de secretos.

### 4. Ejecutar el backend

```bash
cd cadnux-backend
source venv310/bin/activate
python app.py
```

### 5. Ejecutar el frontend

```bash
npm run dev
```

La aplicación estará disponible en:

```text
http://localhost:3000
```

## Módulos operativos

### Panel principal

- Visualización de indicadores operativos
- Consulta rápida de información crítica para usuarios y administradores

### Gestión de tickets

- Creación, seguimiento y cierre de incidencias
- Historial de comentarios y cambios de estado
- Generación de reportes operativos

### Soporte y administración

- Control de acceso por perfil y departamento
- Administración de procesos internos
- Módulo de atención para equipos de soporte

### Integración con infraestructura

- Conexiones SSH para reinicio y control remoto de servicios
- Consultas a bases de datos para validación de datos operativos
- Integración con procesos automáticos del entorno empresarial

## Estructura del repositorio

```text
.
├── AGENTS.md
├── app/
│   ├── api/
│   ├── dashboard/
│   ├── login/
│   ├── page.tsx
│   ├── registro/
│   ├── soporte/
│   └── tickets/
├── cadnux-backend/
│   ├── app.py
│   ├── venv310/
│   └── verificar_conexion_remota.py
├── components/
├── context/
├── data/
├── docs/
├── hooks/
├── lib/
├── middleware.ts
├── public/
├── .env.example
├── .gitignore
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── README.md
├── tailwind.config.js
├── tsconfig.json
├── nginx-1.30.2/
└── node_modules/
```

## Seguridad y buenas prácticas

- No guardar secretos ni credenciales reales en el repositorio
- Mantener archivos `.env` fuera del control de versiones
- Usar variables de entorno para toda configuración sensible
- Revisar periódicamente accesos SSH, credenciales y endpoints críticos
- Evitar depender de valores de desarrollo en entornos de producción

## Licencia

© 2026 Ian Marcel Castrejon Cuevas. Todos los derechos reservados.

Este proyecto y su código fuente son propiedad de Ian Marcel Castrejon Cuevas. Queda prohibida la reproducción, distribución, modificación o utilización del código, total o parcialmente, sin autorización previa del propietario.
