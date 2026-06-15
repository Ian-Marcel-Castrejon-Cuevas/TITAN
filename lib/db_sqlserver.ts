import sql from "mssql";

const sqlConfig = {
  user: "sa",
  password: "test1",
  server: "192.168.28.35",
  port: 1433,
  database: "CADNUX_Tickets",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getSqlConnection() {
  if (!pool) {
    pool = await sql.connect(sqlConfig);
  }
  return pool;
}

export function generateTicketId(): string {
  const date = new Date();
  const timestamp = date.toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

export async function getEmpleadoFoto(ch: string) {
  const pool = await getSqlConnection();
  const result = await pool
    .request()
    .input("ch", sql.VarChar(10), ch)
    .query("SELECT ch, foto_base64 FROM empleados_fotos WHERE ch = @ch");

  return result.recordset[0] || null;
}
