import { spawn, type ChildProcess } from "node:child_process";

/**
 * Runs a command and returns a promise that resolves when the command finishes.
 * Captures output for error messages if the command fails.
 */
export function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      cwd,
      stdio: ["inherit", "pipe", "pipe"],
      shell: process.platform === "win32",
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    let output = "";

    p.stdout?.on("data", (data) => {
      output += data.toString();
    });

    p.stderr?.on("data", (data) => {
      output += data.toString();
    });

    p.on("error", (error) => {
      reject(new Error(`Failed to start ${cmd}: ${error.message}`));
    });

    p.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        // Give a small delay to ensure all output data is captured
        setTimeout(() => {
          const cleanOutput = output.trim();
          const errorMsg = cleanOutput || `${cmd} ${args.join(" ")} failed with exit code ${code}`;
          reject(new Error(errorMsg));
        }, 100);
      }
    });
  });
}

/**
 * Spawns a long-running process (like a watcher).
 */
export function spawnLongRunning(cmd: string, args: string[], cwd: string): ChildProcess {
  return spawn(cmd, args, {
    cwd,
    stdio: ["inherit", "pipe", "pipe"],
    shell: process.platform === "win32",
    env: { ...process.env, FORCE_COLOR: "1" },
  });
}
