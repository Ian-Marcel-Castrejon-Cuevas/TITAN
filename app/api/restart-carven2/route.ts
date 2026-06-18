import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";

const execAsync = promisify(exec);

const SSH_HOST2 = process.env.SSH_HOST2;
const SSH_USER2 = process.env.SSH_USER2;
const SSH_PASS2 = process.env.SSH_PASS2;

const PLINK_PATH = "C:\\Program Files\\PuTTY\\plink.exe";

const HOST_KEY_CARVEN2 = process.env.SSH_KEY2;

async function checkCarven2Status(): Promise<boolean> {
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
    return false;
  }
}

async function executeSSHCommands(
  commands: string[],
): Promise<{ output: string; error: string }> {
  try {
    const commandString = commands.join(" && ");

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
    if (!HOST_KEY_CARVEN2) {
      throw new Error(
        "SSH_KEY2 no está configurado en las variables de entorno",
      );
    }

    const sshCommand = `"${PLINK_PATH}" -ssh -no-antispoof -pw ${SSH_PASS2} -hostkey ${HOST_KEY_CARVEN2} ${SSH_USER2}@${SSH_HOST2} "${commandString}"`;

    const safeCommand = sshCommand.replace(
      new RegExp(SSH_PASS2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      "******",
    );

    console.log("[SSH] Ejecutando comando con plink:", safeCommand);

    const { stdout, stderr } = await execAsync(sshCommand, {
      timeout: 60000,
      maxBuffer: 1024 * 1024 * 10,
      shell: "cmd.exe",
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
    if (!HOST_KEY_CARVEN2) {
      throw new Error(
        "SSH_KEY2 no está configurado en las variables de entorno",
      );
    }

    const testCommand = `"${PLINK_PATH}" -ssh -no-antispoof -pw ${SSH_PASS2} -hostkey ${HOST_KEY_CARVEN2} ${SSH_USER2}@${SSH_HOST2} "echo 'Conexión exitosa a Carven2 - Prueba'"`;

    console.log("[Test SSH] Probando conexión SSH con plink...");

    const { stdout, stderr } = await execAsync(testCommand, {
      timeout: 30000,
      maxBuffer: 1024 * 1024 * 10,
      shell: "cmd.exe",
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
      console.log(
        "[Restart Carven2] Carven2 responde correctamente, no se requiere reinicio",
      );
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
      console.warn(
        "[Restart Carven2] Botar Carven falló o no se ejecutó correctamente",
      );
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

    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      {
        success: false,
        message: "Error al reiniciar Carven2",
        restarted: false,
        botarCarven: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
