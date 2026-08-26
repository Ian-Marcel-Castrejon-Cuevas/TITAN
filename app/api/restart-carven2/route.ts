import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";

const execAsync = promisify(exec);

const SSH_HOST2 = process.env.SSH_HOST2;
const SSH_USER2 = process.env.SSH_USER2;
const SSH_PASS2 = process.env.SSH_PASS2;
const SSH_PORT2 = process.env.SSH_PORT2 || "22";

const SSH_OPTIONS2 = [
  "-o KexAlgorithms=+diffie-hellman-group1-sha1",
  "-o HostKeyAlgorithms=+ssh-rsa",
  "-o StrictHostKeyChecking=no",
  "-o UserKnownHostsFile=/dev/null",
  `-p ${SSH_PORT2}`,
].join(" ");

async function checkCarven2Status(): Promise<boolean> {
  /**
   * Verifica si Carven2 responde mediante una petición HTTP al servicio local del controlador.
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
      "http://192.168.8.51:8081/asecon/servlet/asecon.hcarvenprin",
      {
        signal: controller.signal,
        timeout: 15000,
        validateStatus: () => true,
      },
    );

    clearTimeout(timeoutId);
    return response.status === 200;
  } catch (error) {
    console.error("[checkCarven2Status] Error:", error);
    return false;
  }
}

async function executeSSHCommands(
  commands: string[],
): Promise<{ output: string; error: string }> {
  /**
   * Ejecuta comandos remotos vía SSH usando `sshpass` y `ssh` para Carven2.
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
    if (!SSH_PASS2) {
      throw new Error(
        "SSH_PASS2 no está configurado en las variables de entorno",
      );
    }
    if (!SSH_USER2) {
      throw new Error(
        "SSH_USER2 no está configurado en las variables de entorno",
      );
    }
    if (!SSH_HOST2) {
      throw new Error(
        "SSH_HOST2 no está configurado en las variables de entorno",
      );
    }

    const commandString = commands.join(" && ");

    const sshCommand = `sshpass -p '${SSH_PASS2}' ssh ${SSH_OPTIONS2} ${SSH_USER2}@${SSH_HOST2} "${commandString}"`;

    console.log("[SSH] Ejecutando comando en Carven2...");

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
   * Realiza una prueba simple de conexión SSH ejecutando un `echo` remoto para Carven2.
   *
   * Retorna:
   * - `{ success: true, output, error? }` si la conexión y comando se ejecutan.
   * - `{ success: false, output: '', error }` en caso de fallo.
   *
   * Excepciones:
   * - No lanza; captura errores y los devuelve en la respuesta.
   */
  try {
    if (!SSH_PASS2) {
      throw new Error(
        "SSH_PASS2 no está configurado en las variables de entorno",
      );
    }
    if (!SSH_USER2) {
      throw new Error(
        "SSH_USER2 no está configurado en las variables de entorno",
      );
    }
    if (!SSH_HOST2) {
      throw new Error(
        "SSH_HOST2 no está configurado en las variables de entorno",
      );
    }

    const testCommand = `sshpass -p '${SSH_PASS2}' ssh ${SSH_OPTIONS2} ${SSH_USER2}@${SSH_HOST2} "echo 'Conexión exitosa a Carven2 - Prueba'"`;

    console.log("[Test SSH] Probando conexión SSH a Carven2...");

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

async function ejecutarBotarCarven(): Promise<boolean> {
  /**
   * Invoca el endpoint interno `/api/delete-carven` para ejecutar la limpieza local de Carven2.
   *
   * Retorna:
   * - `Promise<boolean>` indicando si la petición fue exitosa (`response.ok`).
   *
   * Excepciones:
   * - Captura errores de fetch y retorna `false` en caso de fallo.
   */
  try {
    const baseUrl = "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/delete-carven`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Error en Botar Carven:", error);
    return false;
  }
}

export async function POST() {
  /**
   * Endpoint que reinicia Carven2 si no responde: verifica estado, prueba SSH y ejecuta reinicio remoto.
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
    console.log("[Restart Carven2] Verificando estado de Carven2...");

    const testResult = await testSSHConnection();
    if (!testResult.success) {
      console.error(
        "[Restart Carven2] Error en conexión SSH:",
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
    console.log("[Restart Carven2] Conexión SSH exitosa");

    const isResponding = await checkCarven2Status();

    if (isResponding) {
      console.log("[Restart Carven2] Carven2 responde correctamente");
      return NextResponse.json({
        success: true,
        message:
          "Carven2 está respondiendo correctamente, no se requiere reinicio",
        restarted: false,
        botarCarven: false,
        status: "healthy",
      });
    }

    console.log(
      "[Restart Carven2] Carven2 no responde, procediendo con reinicio...",
    );

    const commands = [
      "cd /etc/init.d",
      "./tomcat5 stop",
      "sleep 3",
      "./tomcat5 start",
    ];

    const result = await executeSSHCommands(commands);

    console.log("[Restart Carven2] Reinicio ejecutado exitosamente");
    console.log("[Restart Carven2] Output:", result.output);

    if (result.error) {
      console.warn("[Restart Carven2] Errores:", result.error);
    }

    console.log("[Restart Carven2] Ejecutando Botar Carven...");
    const botarCarvenExitoso = await ejecutarBotarCarven();

    if (botarCarvenExitoso) {
      console.log("[Restart Carven2] Botar Carven ejecutado exitosamente");
    } else {
      console.warn("[Restart Carven2] Botar Carven falló");
    }

    return NextResponse.json({
      success: true,
      message: "Carven2 reiniciado y Botar Carven ejecutado exitosamente",
      restarted: true,
      botarCarven: botarCarvenExitoso,
      output: result.output,
      error: result.error || undefined,
    });
  } catch (error) {
    console.error("[Restart Carven2] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al reiniciar Carven2",
        restarted: false,
        botarCarven: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
