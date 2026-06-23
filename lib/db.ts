import { getSqlConnection } from "./db_sqlserver";

export const getDb = getSqlConnection;

export {
  closeSqlConnection,
  testSqlConnection,
  executeQuery,
  generateTicketId,
  getEmpleadoFoto,
} from "./db_sqlserver";
