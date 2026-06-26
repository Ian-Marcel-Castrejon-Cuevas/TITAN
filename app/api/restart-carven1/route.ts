import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";

const execAsync = promisify(exec);

const SSH_HOST = process.env.SSH_HOST;
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const SSH_PORT = process.env.SSH_PORT || "22";

const SSH_OPTIONS = [
  "-o KexAlgorithms=+diffie-hellman-group1-sha1",
  "-o HostKeyAlgorithms=+ssh-rsa",
  "-o StrictHostKeyChecking=no",
  "-o UserKnownHostsFile=/dev/null",
  `-p ${SSH_PORT}`
].join(" ");

async function checkCarven1Status(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await axios.get(
      "http://192.168.8.50:8081/asecon/servlet/asecon.hcarvenprin",
      {
        signal: controller.signal,
        timeout: 15000,
        validateStatus: () => true,
      }
    );

    clearTimeout(timeoutId);
    return response.status === 200;
  } catch (error) {
    console.error("[checkCarven1Status] Error:", error);
    return false;
  }
}

async function executeSSHCommands(
  commands: string[]
): Promise<{ output: string; error: string }> {
  try {
    if (!SSH_PASS) {
      throw new Error("SSH_PASS no está configurado en las variables de entorno");
    }
    if (!SSH_USER) {
      throw new Error("SSH_USER no está configurado en las variables de entorno");
    }
    if (!SSH_HOST) {
      throw new Error("SSH_HOST no está configurado en las variables de entorno");
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
  try {
    if (!SSH_PASS) {
      throw new Error("SSH_PASS no está configurado en las variables de entorno");
    }
    if (!SSH_USER) {
      throw new Error("SSH_USER no está configurado en las variables de entorno");
    }
    if (!SSH_HOST) {
      throw new Error("SSH_HOST no está configurado en las variables de entorno");
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

async function ejecutarBotarCarven(): Promise<boolean> {
  try {
    const baseUrl =  "http://localhost:3000";
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
  try {
    console.log("[Restart Carven1] Verificando estado de Carven1...");

   const testResult = await testSSHConnection();
    if (!testResult.success) {
      console.error("[Restart Carven1] Error en conexión SSH:", testResult.error);
      return NextResponse.json(
        {
          success: false,
          message: "Error en conexión SSH",
          restarted: false,
          botarCarven: false,
          error: testResult.error,
        },
        { status: 500 }
      );
    }
    console.log("[Restart Carven1] Conexión SSH exitosa");

    const isResponding = await checkCarven1Status();

    if (isResponding) {
      console.log("[Restart Carven1] Carven1 responde correctamente");
      return NextResponse.json({
        success: true,
        message: "Carven1 está respondiendo correctamente, no se requiere reinicio",
        restarted: false,
        botarCarven: false,
        status: "healthy",
      });
    }

    console.log("[Restart Carven1] Carven1 no responde, procediendo con reinicio...");

    const commands = [
      "cd /etc/init.d",
      "./tomcat5 stop",
      "sleep 3",
      "./tomcat5 start",
    ];

    const result = await executeSSHCommands(commands);

    console.log("[Restart Carven1] Reinicio ejecutado exitosamente");
    console.log("[Restart Carven1] Output:", result.output);

    if (result.error) {
      console.warn("[Restart Carven1] Errores:", result.error);
    }

    console.log("[Restart Carven1] Ejecutando Botar Carven...");
    const botarCarvenExitoso = await ejecutarBotarCarven();

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
      { status: 500 }
    );
  }
}