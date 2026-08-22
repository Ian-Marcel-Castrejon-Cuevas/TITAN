import { Client } from "ssh2";

export interface SSHConfig {
  host: string;
  username: string;
  password: string;
  readyTimeout?: number;
}

export function executeSSHCommands(
  config: SSHConfig,
  commands: string[],
): Promise<{ output: string; error: string }> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = "";
    let errorOutput = "";
    let isResolved = false;

    const timeout = setTimeout(() => {
      if (!isResolved) {
        conn.end();
        reject(new Error("SSH connection timeout"));
      }
    }, 30000);

    conn.on("ready", () => {
      const commandString = commands.join(" && ");

      conn.exec(commandString, (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          conn.end();
          reject(err);
          return;
        }

        stream.on("close", (code: number) => {
          clearTimeout(timeout);
          isResolved = true;
          conn.end();
          if (code === 0) {
            resolve({ output, error: errorOutput });
          } else {
            reject(
              new Error(
                `Command failed with code ${code}: ${errorOutput || output || "Unknown error"}`,
              ),
            );
          }
        });

        stream.on("data", (data: Buffer) => {
          output += data.toString();
        });

        stream.stderr.on("data", (data: Buffer) => {
          errorOutput += data.toString();
        });
      });
    });

    conn.on("error", (err) => {
      clearTimeout(timeout);
      isResolved = true;
      reject(err);
    });

    conn.connect(config);
  });
}
