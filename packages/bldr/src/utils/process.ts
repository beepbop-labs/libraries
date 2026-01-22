import { spawn, spawnSync, type ChildProcess } from "node:child_process";

/**
 * Checks if a command is available in the PATH.
 */
function commandExists(cmd: string): boolean {
  const result = spawnSync("which", [cmd], { stdio: "pipe" });
  return result.status === 0;
}

/**
 * Installs missing dependencies using bun.
 */
async function installDeps(deps: string[]): Promise<void> {
  console.log(`\n📦 Installing: ${deps.join(", ")}...\n`);

  return new Promise((resolve, reject) => {
    const child = spawn("bun", ["add", "-d", ...deps], {
      stdio: "inherit",
      shell: true,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        console.log("\n✅ Dependencies installed successfully!\n");
        resolve();
      } else {
        reject(new Error(`Failed to install dependencies (exit code ${code})`));
      }
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to run bun: ${error.message}`));
    });
  });
}

/**
 * Checks if required dependencies (tsc, tsc-alias) are available.
 * If not, automatically installs them.
 */
export async function checkDependencies(): Promise<boolean> {
  const missing: string[] = [];

  if (!commandExists("tsc")) {
    missing.push("typescript");
  }

  if (!commandExists("tsc-alias")) {
    missing.push("tsc-alias");
  }

  if (missing.length === 0) {
    return true;
  }

  console.log(`\n⚠️  Missing required dependencies: ${missing.join(", ")}`);
  await installDeps(missing);
  return true;
}

/**
 * Runs a command and returns a promise that resolves when the command finishes.
 * Captures output for error messages if the command fails.
 */
export function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      cwd,
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
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
    shell: true,
    env: { ...process.env, FORCE_COLOR: "1" },
  });
}
