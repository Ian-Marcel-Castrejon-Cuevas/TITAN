import fs from "node:fs";
import path from "node:path";

const LOG_FILE = path.join(process.cwd(), "titan-errors.log");

export function logError(context: string, error: unknown) {
  const detail = error instanceof Error ? error.stack || error.message : String(error);
  const line = `[${new Date().toISOString()}] ${context}: ${detail}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line, "utf8");
  } catch (logErrorFailure) {
    console.error("No se pudo escribir titan-errors.log:", logErrorFailure);
  }
  console.error(context, error);
}