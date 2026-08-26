import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const SSH_HOST3 = process.env.SSH_HOST3 || "192.168.8.52";
const SSH_USER3 = process.env.SSH_USER3 || "root";
const SSH_PASS3 = process.env.SSH_PASS3;
const SSH_PORT3 = process.env.SSH_PORT3 || "22";
const SERVER_WAIT_TIMEOUT_MS = 5 * 60 * 1000;
const PING_INTERVAL_MS = 5000;

const SSH_OPTIONS3 = [
  "-o StrictHostKeyChecking=no",
  "-o UserKnownHostsFile=/dev/null",
  `-p ${SSH_PORT3}`,
].join(" ");

function sshCommand(command: string) {
  if (!SSH_PASS3) throw new Error("SSH_PASS3 no está configurado");
  return `sshpass -p '${SSH_PASS3}' ssh ${SSH_OPTIONS3} ${SSH_USER3}@${SSH_HOST3} "${command}"`;
}

async function runSSH(command: string) {
  return execAsync(sshCommand(command), {
    timeout: 30000,
    maxBuffer: 1024 * 1024 * 10,
    shell: "/bin/bash",
  });
}

async function rebootServer() {
  try {
    await runSSH("reboot");
  } catch (error) {
    // Reboot normally closes SSH before it can return a successful response.
    console.warn("[Restart Carven3] SSH cerrado por reboot:", error);
  }
}

async function waitForServer() {
  const deadline = Date.now() + SERVER_WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      await execAsync(`ping -c 1 -W 3 ${SSH_HOST3}`, {
        timeout: 10000,
        shell: "/bin/bash",
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, PING_INTERVAL_MS));
    }
  }

  throw new Error("El servidor Carven3 no levantó después de 5 minutos");
}

export async function POST() {
  try {
    console.log("[Restart Carven3] Reiniciando servidor...");
    await rebootServer();

    console.log("[Restart Carven3] Esperando respuesta al ping...");
    await waitForServer();

    console.log("[Restart Carven3] Ejecutando servicios y montaje NFS...");
    const result = await runSSH(
      "cd /etc/init.d && ./tomcat5 start && ./nfs start && mount 192.168.8.101:/procesos_carven /SYS",
    );

    return NextResponse.json({
      success: true,
      message: "Carven3 reiniciado, servicios iniciados y NFS montado",
      restarted: true,
      output: result.stdout,
      error: result.stderr || undefined,
    });
  } catch (error) {
    console.error("[Restart Carven3] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Error al reiniciar Carven3",
        restarted: false,
      },
      { status: 500 },
    );
  }
}
