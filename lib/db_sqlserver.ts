import sql from "mssql";

const sqlConfig: sql.config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || "",
  port: parseInt(process.env.SQL_PORT || "1433"),
  database: process.env.SQL_DATABASE || "",
  options: {
    encrypt: process.env.SQL_ENCRYPT === "true",
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === "true",
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

if (!sqlConfig.server || !sqlConfig.database) {
  throw new Error(
    "Faltan variables de entorno para SQL Server: SQL_SERVER y SQL_DATABASE son requeridas",
  );
}

let pool: sql.ConnectionPool | null = null;
let isConnecting = false;

/**
 * Obtiene una conexión a SQL Server
 * @returns Promise<sql.ConnectionPool> - Conexión activa
 * @throws Error si no se puede conectar
 */
export async function getSqlConnection(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  if (isConnecting) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return getSqlConnection();
  }

  try {
    isConnecting = true;

    if (pool) {
      try {
        await pool.close();
      } catch (error) {
        console.warn("Error al cerrar pool anterior:", error);
      }
      pool = null;
    }

    console.log("🔌 Conectando a SQL Server...");
    pool = await sql.connect(sqlConfig);
    console.log("✅ Conexión a SQL Server establecida correctamente");

    return pool;
  } catch (error) {
    console.error("❌ Error al conectar a SQL Server:", error);
    pool = null;
    throw new Error(`No se pudo conectar a SQL Server: ${error}`);
  } finally {
    isConnecting = false;
  }
}

export async function closeSqlConnection() {
  if (pool) {
    try {
      await pool.close();
      pool = null;
      console.log("🔒 Conexión a SQL Server cerrada correctamente");
    } catch (error) {
      console.error("Error al cerrar conexión:", error);
    }
  }
}

export async function testSqlConnection() {
  try {
    const pool = await getSqlConnection();
    const result = await pool.request().query("SELECT 1 as test");
    return {
      success: true,
      message: "Conexión exitosa",
      data: result.recordset,
    };
  } catch (error) {
    return { success: false, message: `Error: ${error}` };
  }
}

export async function executeQuery<T = any>(
  query: string,
  params?: { name: string; type: sql.ISqlType; value: any }[],
): Promise<T[]> {
  try {
    const pool = await getSqlConnection();
    const request = pool.request();

    if (params) {
      params.forEach((param) => {
        request.input(param.name, param.type, param.value);
      });
    }

    const result = await request.query(query);
    return result.recordset as T[];
  } catch (error) {
    console.error("Error al ejecutar consulta:", error);
    throw error;
  }
}

export function generateTicketId(): string {
  const date = new Date();
  const timestamp = date.toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

export async function getEmpleadoFoto(ch: string) {
  try {
    const pool = await getSqlConnection();
    const result = await pool
      .request()
      .input("ch", sql.VarChar(10), ch)
      .query("SELECT ch, foto_base64 FROM empleados_fotos WHERE ch = @ch");

    return result.recordset[0] || null;
  } catch (error) {
    console.error(`Error al obtener foto del empleado ${ch}:`, error);
    throw error;
  }
}
