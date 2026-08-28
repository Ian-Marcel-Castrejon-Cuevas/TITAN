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

// Configuración SSH para Carven1 con sshpass (contraseña)
const SSH_HOST = process.env.SSH_HOST;
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const SSH_PORT = process.env.SSH_PORT;

const SSH_OPTIONS = [
  "-o KexAlgorithms=+diffie-hellman-group1-sha1",
  "-o HostKeyAlgorithms=+ssh-rsa",
  "-o StrictHostKeyChecking=no",
  "-o UserKnownHostsFile=/dev/null",
  `-p ${SSH_PORT}`,
].join(" ");

async function checkCarven1Status(): Promise<boolean> {
  /**
   * Verifica si Carven1 responde mediante una petición HTTP al servicio local del controlador.
   *
   * Retorna:
   * - `Promise<boolean>`: `true` si responde con status 200, `false` en otro caso.
   *
   * Excepciones:
   * - Captura errores de red y devuelve `false` (no lanza excepciones al llamador).
   */
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await axios.get(
      process.env.CARVEN1_STATUS_URL!,
      {
        signal: controller.signal,
        timeout: 15000,
        validateStatus: () => true,
      },
    );

    clearTimeout(timeoutId);
    return response.status === 200;
  } catch (error) {
    console.error("[checkCarven1Status] Error:", error);
    return false;
  }
}

async function executeSSHCommands(
  commands: string[],
): Promise<{ output: string; error: string }> {
  /**
   * Ejecuta comandos remotos vía SSH usando `sshpass` y `ssh` para Carven1.
   *
   * Parámetros:
   * - `commands` (string[]): lista de comandos a ejecutar en el host remoto.
   *
   * Retorna:
   * - `Promise<{ output: string; error: string }>` con `stdout`/`stderr` del comando.
   *
   * Excepciones:
   * - Lanza `Error` si faltan variables de entorno de SSH o si `exec` falla.
   *
   * Seguridad:
   * - Usa `sshpass` con una contraseña en texto claro (peligroso). Evitar en producción.
   */
  try {
    if (!SSH_PASS) {
      throw new Error(
        "SSH_PASS no está configurado en las variables de entorno",
      );
    }
    if (!SSH_USER) {
      throw new Error(
        "SSH_USER no está configurado en las variables de entorno",
      );
    }
    if (!SSH_HOST) {
      throw new Error(
        "SSH_HOST no está configurado en las variables de entorno",
      );
    }

    const commandString = commands.join(" && ");

    const sshCommand = `sshpass -p '${SSH_PASS}' ssh ${SSH_OPTIONS} ${SSH_USER}@${SSH_HOST} "${commandString}"`;

    console.log("[SSH] Ejecutando comando en Carven1...");

    const { stdout, stderr } = await execAsync(sshCommand, {
      timeout: 60000,
      maxBuffer: 1024 * 1024 * 10,
      shell: "/bin/bash",
    });

    return { output: stdout, error: stderr };
  } catch (error) {
    console.error("[SSH] Error:", error);
    if (error instanceof Error) {
      throw new Error(`SSH Error: ${error.message}`);
    }
    throw new Error("Error desconocido al ejecutar SSH");
  }
}

async function testSSHConnection(): Promise<{
  success: boolean;
  output: string;
  error?: string;
}> {
  /**
   * Realiza una prueba simple de conexión SSH ejecutando un `echo` remoto para Carven1.
   *
   * Retorna:
   * - `{ success: true, output, error? }` si la conexión y comando se ejecutan.
   * - `{ success: false, output: '', error }` en caso de fallo.
   *
   * Excepciones:
   * - No lanza; captura errores y los devuelve en la respuesta.
   */
  try {
    if (!SSH_PASS) {
      throw new Error(
        "SSH_PASS no está configurado en las variables de entorno",
      );
    }
    if (!SSH_USER) {
      throw new Error(
        "SSH_USER no está configurado en las variables de entorno",
      );
    }
    if (!SSH_HOST) {
      throw new Error(
        "SSH_HOST no está configurado en las variables de entorno",
      );
    }

    const testCommand = `sshpass -p '${SSH_PASS}' ssh ${SSH_OPTIONS} ${SSH_USER}@${SSH_HOST} "echo 'Conexión exitosa a Carven1 - Prueba'"`;

    console.log("[Test SSH] Probando conexión SSH a Carven1...");

    const { stdout, stderr } = await execAsync(testCommand, {
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 10,
      shell: "/bin/bash",
    });

    console.log("[Test SSH] Output:", stdout);
    if (stderr) {
      console.warn("[Test SSH] Errores:", stderr);
    }

    return { success: true, output: stdout, error: stderr || undefined };
  } catch (error) {
    console.error("[Test SSH] Error:", error);
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

async function ejecutarBotarCarven(cookie: string): Promise<boolean> {
  /**
   * Invoca el endpoint interno `/api/delete-carven` para ejecutar la limpieza local de Carven1.
   *
   * Retorna:
   * - `Promise<boolean>` indicando si la petición fue exitosa (`response.ok`).
   *
   * Excepciones:
   * - Captura errores de fetch y retorna `false` en caso de fallo.
   */
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) return false;
    const response = await fetch(`${baseUrl}/api/delete-carven`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie,
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Error en Botar Carven:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const user = getRequestUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Sesión requerida" },
      { status: 401 },
    );
  }
  if (!hasCarvenOperationLock("carven1", user.ch)) {
    return NextResponse.json(
      { success: false, message: "No existe una reserva activa para Carven1" },
      { status: 409 },
    );
  }

  /**
   * Endpoint que reinicia Carven1 si no responde: verifica estado, prueba SSH y ejecuta reinicio remoto.
   *
   * Retorna:
   * - `NextResponse` con detalles del resultado: `success`, `restarted`, `botarCarven`, `output`, `error`.
   *
   * Excepciones:
   * - Maneja errores y devuelve status 500 en caso de fallos graves.
   *
   * Seguridad:
   * - Este endpoint ejecuta comandos remotos y debería protegerse; no exponer sin autenticación/autoridad.
   */
  try {
    console.log("[Restart Carven1] Verificando estado de Carven1...");

    // Verificar que tenemos la contraseña configurada
    if (!SSH_PASS) {
      console.error("[Restart Carven1] SSH_PASS no está configurado");
      return NextResponse.json(
        {
          success: false,
          message: "SSH_PASS no configurado en variables de entorno",
          restarted: false,
          botarCarven: false,
          error: "Falta contraseña SSH",
        },
        { status: 500 },
      );
    }

    const testResult = await testSSHConnection();
    if (!testResult.success) {
      console.error(
        "[Restart Carven1] Error en conexión SSH:",
        testResult.error,
      );
      return NextResponse.json(
        {
          success: false,
          message: "Error en conexión SSH",
          restarted: false,
          botarCarven: false,
          error: testResult.error,
        },
        { status: 500 },
      );
    }
    console.log("[Restart Carven1] Conexión SSH exitosa");

    const isResponding = await checkCarven1Status();

    if (isResponding) {
      console.log("[Restart Carven1] Carven1 responde correctamente");
      return NextResponse.json({
        success: true,
        message:
          "Carven1 está respondiendo correctamente, no se requiere reinicio",
        restarted: false,
        botarCarven: false,
        status: "healthy",
      });
    }

    console.log(
      "[Restart Carven1] Carven1 no responde, procediendo con reinicio...",
    );

    const commands = [
      `cd ${process.env.CARVEN1_INIT_DIR}`,
      `${process.env.CARVEN1_START_COMMAND} || true`,
    ];

    const result = await executeSSHCommands(commands);

    console.log("[Restart Carven1] Reinicio ejecutado exitosamente");
    console.log("[Restart Carven1] Output:", result.output);

    if (result.error) {
      console.warn("[Restart Carven1] Errores:", result.error);
    }

    console.log("[Restart Carven1] Ejecutando Botar Carven...");
    const botarCarvenExitoso = await ejecutarBotarCarven(
      request.headers.get("cookie") || "",
    );

    if (botarCarvenExitoso) {
      console.log("[Restart Carven1] Botar Carven ejecutado exitosamente");
    } else {
      console.warn("[Restart Carven1] Botar Carven falló");
    }

    return NextResponse.json({
      success: true,
      message: "Carven1 reiniciado y Botar Carven ejecutado exitosamente",
      restarted: true,
      botarCarven: botarCarvenExitoso,
      output: result.output,
      error: result.error || undefined,
    });
  } catch (error) {
    console.error("[Restart Carven1] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al reiniciar Carven1",
        restarted: false,
        botarCarven: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  } finally {
    releaseCarvenOperation("carven1", user.ch);
  }
}
