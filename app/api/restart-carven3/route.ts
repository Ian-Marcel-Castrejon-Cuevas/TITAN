import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";
import { getRequestUser } from "@/lib/request-auth";
import {
  hasCarvenOperationLock,
  releaseCarvenOperation,
} from "@/lib/carven-operation-locks";

const execAsync = promisify(exec);

const SSH_HOST3 = process.env.SSH_HOST3;
const SSH_USER3 = process.env.SSH_USER3;
const SSH_PASS3 = process.env.SSH_PASS3;
const SSH_PORT3 = process.env.SSH_PORT3;
const SERVER_WAIT_TIMEOUT_MS = 5 * 60 * 1000;
const PING_INTERVAL_MS = 5000;

const SSH_OPTIONS3 = [
  "-o KexAlgorithms=+diffie-hellman-group1-sha1",
  "-o HostKeyAlgorithms=+ssh-rsa",
  "-o StrictHostKeyChecking=no",
  "-o UserKnownHostsFile=/dev/null",
  `-p ${SSH_PORT3}`,
].join(" ");

async function checkCarven3Status(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await axios.get(
      process.env.CARVEN3_STATUS_URL!,
      {
        signal: controller.signal,
        timeout: 15000,
        validateStatus: () => true,
      },
    );

    clearTimeout(timeoutId);
    return response.status === 200;
  } catch (error) {
    console.warn("[checkCarven3Status] Carven3 no responde:", error);
    return false;
  }
}

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

export async function POST(request: NextRequest) {
  const user = getRequestUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Sesión requerida" },
      { status: 401 },
    );
  }
  if (!hasCarvenOperationLock("carven3", user.ch)) {
    return NextResponse.json(
      { success: false, message: "No existe una reserva activa para Carven3" },
      { status: 409 },
    );
  }

  try {
    console.log("[Restart Carven3] Verificando estado de Carven3...");
    const isResponding = await checkCarven3Status();

    if (isResponding) {
      console.log("[Restart Carven3] Carven3 responde correctamente");
      return NextResponse.json({
        success: true,
        message:
          "Carven3 está respondiendo correctamente, no se requiere reinicio",
        restarted: false,
        status: "healthy",
      });
    }

    console.log("[Restart Carven3] Reiniciando servidor...");
    await rebootServer();

    console.log("[Restart Carven3] Esperando respuesta al ping...");
    await waitForServer();

    console.log("[Restart Carven3] Ejecutando servicios y montaje NFS...");
    const result = await runSSH(
      `cd ${process.env.CARVEN3_INIT_DIR} && ${process.env.CARVEN3_TOMCAT_START} && ${process.env.CARVEN3_NFS_START} && mount ${process.env.CARVEN3_NFS_SOURCE} ${process.env.CARVEN3_NFS_TARGET}`,
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
  } finally {
    releaseCarvenOperation("carven3", user.ch);
  }
}
