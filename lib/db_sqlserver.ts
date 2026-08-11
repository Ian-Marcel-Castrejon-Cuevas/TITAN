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
  /**
   * Ejecuta una consulta SQL parametrizada usando el pool compartido.
   *
   * Parámetros:
   * - `query` (string): sentencia SQL a ejecutar.
   * - `params` (Array): arreglos de parámetros con `{ name, type, value }` para `request.input()`.
   *
   * Retorna:
   * - `Promise<T[]>` con el `recordset` devuelto por la consulta.
   *
   * Excepciones:
   * - Lanza errores si la conexión o la consulta falla. El llamador debe manejar/reintentar según corresponda.
   *
   * Ejemplo:
   * const rows = await executeQuery('SELECT * FROM tickets WHERE estado = @estado', [{ name: 'estado', type: sql.VarChar, value: 'abierto' }]);
   */
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
  /**
   * Genera un identificador único para tickets con prefijo `TKT-`.
   *
   * Retorna:
   * - `string` con formato `TKT-YYMMDD-XXXXXX` (parte aleatoria en mayúsculas).
   *
   * Ejemplo:
   * const id = generateTicketId(); // 'TKT-240811-4F7A9B'
   */
  const date = new Date();
  const timestamp = date.toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

export async function getEmpleadoFoto(ch: string) {
  /**
   * Obtiene la foto (base64) de un empleado por su `ch` desde la tabla `empleados_fotos`.
   *
   * Parámetros:
   * - `ch` (string): clave/identificador del empleado.
   *
   * Retorna:
   * - `Promise<any|null>` con el registro `{ ch, foto_base64 }` o `null` si no existe.
   *
   * Excepciones:
   * - Propaga errores de la consulta SQL.
   *
   * Ejemplo:
   * const foto = await getEmpleadoFoto('A123');
   */
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
