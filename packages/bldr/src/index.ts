#!/usr/bin/env bun
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import chokidar from "chokidar";
import blessed from "blessed";

// We use the TypeScript API to correctly resolve tsconfig + "extends".
import ts from "typescript";

type Args = {
  watch: boolean;
  project?: string; // optional override: -p path/to/tsconfig.json
};

function parseArgs(argv: string[]): Args {
  const args: Args = { watch: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-w" || a === "--watch") args.watch = true;
    else if (a === "-p" || a === "--project") args.project = argv[++i];
  }
  return args;
}

function findClosestTsconfig(startDir: string): string {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, "tsconfig.json");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not find tsconfig.json starting from ${startDir}. Pass -p <path-to-tsconfig>.`);
}

function readTsConfig(tsconfigPath: string) {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    const msg = ts.formatDiagnosticsWithColorAndContext([configFile.error], {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    });
    throw new Error(msg);
  }

  const configDir = path.dirname(tsconfigPath);

  // parseJsonConfigFileContent resolves "extends" and normalizes options.
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    configDir,
    /*existingOptions*/ undefined,
    tsconfigPath,
  );

  if (parsed.errors?.length) {
    const msg = ts.formatDiagnosticsWithColorAndContext(parsed.errors, {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => ts.sys.newLine,
    });
    throw new Error(msg);
  }

  // These are absolute paths in parsed.options (when provided).
  const outDir = parsed.options.outDir;
  const rootDir = parsed.options.rootDir;

  return {
    tsconfigPath,
    configDir,
    outDir,
    rootDir,
  };
}

function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      cwd,
      stdio: ["inherit", "pipe", "pipe"], // pipe both stdout and stderr to capture all output
      shell: process.platform === "win32",
    });

    let stdout = "";
    let stderr = "";

    if (p.stdout) {
      p.stdout.on("data", (data) => {
        stdout += data.toString();
      });
    }

    if (p.stderr) {
      p.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    }

    p.on("exit", (code) => {
      if (code === 0) resolve();
      else {
        // Give a small delay to ensure all output data is captured
        setTimeout(() => {
          const allOutput = (stdout + stderr).trim();
          const errorMsg = allOutput || `${cmd} ${args.join(" ")} failed with exit code ${code}`;
          reject(new Error(errorMsg));
        }, 100);
      }
    });
  });
}

function spawnLongRunning(cmd: string, args: string[], cwd: string) {
  const p = spawn(cmd, args, {
    cwd,
    stdio: ["inherit", "pipe", "pipe"], // pipe stdout and stderr
    shell: process.platform === "win32",
  });

  return p;
}

function rel(from: string, to: string) {
  const r = path.relative(from, to);
  return r.startsWith(".") ? r : `./${r}`;
}

async function rmIfExists(p: string) {
  try {
    await fs.promises.rm(p, { force: true, recursive: true });
  } catch {
    // ignore
  }
}

function isTsLike(filePath: string) {
  return (
    filePath.endsWith(".ts") || filePath.endsWith(".tsx") || filePath.endsWith(".mts") || filePath.endsWith(".cts")
  );
}

function stripTsExt(p: string) {
  return p.replace(/\.(ts|tsx|mts|cts)$/i, "");
}

function makeDistCleaner(rootDirAbs: string, outDirAbs: string) {
  const EMITTED_SUFFIXES = [".js", ".js.map", ".d.ts", ".d.ts.map"];

  function toOutPath(srcPathAbs: string) {
    const relPath = path.relative(rootDirAbs, srcPathAbs);
    return path.join(outDirAbs, relPath);
  }

  async function removeEmittedForSource(srcFileAbs: string) {
    const outLike = toOutPath(srcFileAbs); // dist/foo.tsx
    const base = stripTsExt(outLike); // dist/foo
    await Promise.all(EMITTED_SUFFIXES.map((s) => rmIfExists(base + s)));
  }

  async function removeOutDirForSourceDir(srcDirAbs: string) {
    const outDir = toOutPath(srcDirAbs);
    await rmIfExists(outDir);
  }

  return { removeEmittedForSource, removeOutDirForSourceDir };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const cwd = process.cwd();
  const tsconfigPath = args.project ? path.resolve(cwd, args.project) : findClosestTsconfig(cwd);

  const cfg = readTsConfig(tsconfigPath);

  if (!cfg.outDir || !cfg.rootDir) {
    throw new Error(
      [
        `tsconfig must specify both "compilerOptions.outDir" and "compilerOptions.rootDir" for dist sync.`,
        `Found: rootDir=${String(cfg.rootDir)} outDir=${String(cfg.outDir)}`,
        `File: ${tsconfigPath}`,
      ].join("\n"),
    );
  }

  const rootDirAbs = path.isAbsolute(cfg.rootDir) ? cfg.rootDir : path.resolve(cfg.configDir, cfg.rootDir);
  const outDirAbs = path.isAbsolute(cfg.outDir) ? cfg.outDir : path.resolve(cfg.configDir, cfg.outDir);

  // Create terminal UI only in watch mode
  let screen: any, bldrBox: any, tscBox: any, aliasBox: any, logToBldr: any;

  if (args.watch) {
    screen = blessed.screen({
      smartCSR: true,
      title: "bldr - TypeScript Build Tool",
    });

    bldrBox = blessed.box({
      top: 0,
      left: 0,
      width: "33%",
      height: "100%",
      label: " bldr ",
      border: { type: "line" },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { ch: " " },
    });

    tscBox = blessed.box({
      top: 0,
      left: "33%",
      width: "34%",
      height: "100%",
      label: " tsc ",
      border: { type: "line" },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { ch: " " },
    });

    aliasBox = blessed.box({
      top: 0,
      left: "67%",
      width: "33%",
      height: "100%",
      label: " tsc-alias ",
      border: { type: "line" },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { ch: " " },
    });

    screen.append(bldrBox);
    screen.append(tscBox);
    screen.append(aliasBox);

    // Handle screen events
    screen.key(["escape", "q", "C-c"], () => {
      shutdown();
    });

    screen.key(["C-l"], () => {
      bldrBox.setScrollPerc(100);
      tscBox.setScrollPerc(100);
      aliasBox.setScrollPerc(100);
      screen.render();
    });

    // Create a function to log to the bldr box
    logToBldr = (text: string) => {
      if (screen && bldrBox) {
        bldrBox.insertBottom(text);
        bldrBox.setScrollPerc(100);
        screen.render();
      }
    };

    // Override console.log and console.error for bldr messages
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => {
      logToBldr(args.join(" "));
      // Don't call originalLog to avoid double output
    };

    console.error = (...args: any[]) => {
      logToBldr(args.join(" "));
      // Don't call originalError to avoid double output
    };

    screen.render();
  }

  // Initial messages will now go to the bldr box via overridden console.log
  console.log(
    [
      `\n[bldr] project: ${rel(cwd, tsconfigPath)}`,
      `[bldr] rootDir : ${rel(cwd, rootDirAbs)}`,
      `[bldr] outDir  : ${rel(cwd, outDirAbs)}`,
      `[bldr] mode    : ${args.watch ? "watch" : "build"}\n`,
    ].join("\n"),
  );

  // Clean the output directory first
  console.log(`[bldr] cleaning output directory...`);
  await rmIfExists(outDirAbs);

  const tscArgs = ["-p", tsconfigPath];
  const aliasArgs = ["-p", tsconfigPath];

  // Error handling function for watch mode
  const handleFatalError = async (errorMessage: string) => {
    // Always restore normal console logging for watch mode
    if (args.watch) {
      // Destroy UI first to avoid conflicts
      if (screen) {
        screen.destroy();
        screen = null;
        bldrBox = null;
        tscBox = null;
        aliasBox = null;
      }

      // Write directly to stderr to ensure visibility
      process.stderr.write(`[bldr] ${errorMessage}\n`);
    } else {
      // In build mode, just print normally
      console.error(`[bldr] ${errorMessage}`);
    }

    // Kill all processes
    if (tscWatch && !tscWatch.killed) {
      tscWatch.kill();
    }
    if (aliasWatch && !aliasWatch.killed) {
      aliasWatch.kill();
    }
    if (srcWatcher) {
      try {
        await srcWatcher.close();
      } catch (e) {
        // ignore
      }
    }

    process.exit(1);
  };

  if (!args.watch) {
    // One-shot build: tsc -> tsc-alias
    try {
      await run("tsc", tscArgs, cwd);
      await run("tsc-alias", aliasArgs, cwd);
    } catch (error) {
      // Clean up partial output on build failure
      console.error(`[bldr] build failed, cleaning output directory...`);
      await rmIfExists(outDirAbs);
      throw error;
    }
    console.log(`[bldr] build completed successfully!`);
    return;
  }

  // Watch mode:
  // 2) Do a clean initial pass so dist is correct immediately.
  try {
    await run("tsc", tscArgs, cwd);
    await run("tsc-alias", aliasArgs, cwd);
  } catch (error) {
    await handleFatalError(`[bldr] initial build failed: ${error}`);
  }

  // 3) Start watchers
  const tscWatch = spawnLongRunning("tsc", [...tscArgs, "-w"], cwd);
  const aliasWatch = spawnLongRunning("tsc-alias", [...aliasArgs, "-w"], cwd);

  // Pipe output to boxes
  if (tscWatch.stdout) {
    tscWatch.stdout.on("data", (data) => {
      const text = data.toString().trim();
      if (text) {
        tscBox.insertBottom(text);
        tscBox.setScrollPerc(100);
        screen.render();
      }
    });
  }

  if (tscWatch.stderr) {
    tscWatch.stderr.on("data", (data) => {
      const text = data.toString().trim();
      if (text) {
        tscBox.insertBottom(text);
        tscBox.setScrollPerc(100);
        screen.render();
      }
    });
  }

  if (aliasWatch.stdout) {
    aliasWatch.stdout.on("data", (data) => {
      const text = data.toString().trim();
      if (text) {
        aliasBox.insertBottom(text);
        aliasBox.setScrollPerc(100);
        screen.render();
      }
    });
  }

  if (aliasWatch.stderr) {
    aliasWatch.stderr.on("data", (data) => {
      const text = data.toString().trim();
      if (text) {
        aliasBox.insertBottom(text);
        aliasBox.setScrollPerc(100);
        screen.render();
      }
    });
  }

  // If any child process errors or exits, shut down all processes
  tscWatch.on("error", (error) => {
    handleFatalError(`[bldr] tsc watcher error: ${error}`);
  });
  aliasWatch.on("error", (error) => {
    handleFatalError(`[bldr] tsc-alias watcher error: ${error}`);
  });

  // 3) dist sync watcher: remove stale outputs on deletes/dir deletes
  const cleaner = makeDistCleaner(rootDirAbs, outDirAbs);

  const srcWatcher = chokidar.watch(rootDirAbs, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
    atomic: true, // Handle atomic writes (renames/moves) properly
    interval: 100, // Poll interval for most files
    binaryInterval: 300, // Poll interval for binary files
  });

  // Queue for handling rapid operations to prevent race conditions
  const operationQueue = new Map<string, Promise<void>>();
  const MAX_CONCURRENT_OPERATIONS = 10;

  async function queuedOperation(key: string, operation: () => Promise<void>) {
    // Wait for any existing operation on this key
    const existing = operationQueue.get(key);
    if (existing) {
      await existing;
    }

    // Limit concurrent operations
    while (operationQueue.size >= MAX_CONCURRENT_OPERATIONS) {
      await Promise.race(operationQueue.values());
    }

    const promise = operation().finally(() => operationQueue.delete(key));
    operationQueue.set(key, promise);
    return promise;
  }

  srcWatcher.on("unlink", async (absPath) => {
    try {
      await queuedOperation(absPath, async () => {
        if (isTsLike(absPath)) {
          await cleaner.removeEmittedForSource(absPath);
        } else {
          // Mirror non-TS deletes too (assets)
          await rmIfExists(path.join(outDirAbs, path.relative(rootDirAbs, absPath)));
        }
      });
    } catch (error) {
      console.error(`[bldr] error handling file deletion ${absPath}: ${error}`);
    }
  });

  srcWatcher.on("unlinkDir", async (absDir) => {
    try {
      await cleaner.removeOutDirForSourceDir(absDir);
    } catch (error) {
      console.error(`[bldr] error handling directory deletion ${absDir}: ${error}`);
    }
  });

  // TypeScript compiler handles additions and changes automatically

  const shutdown = async () => {
    console.log("\n[bldr] shutting down...");

    // Destroy screen if it exists
    if (screen) {
      screen.destroy();
      screen = null;
    }

    // Close file watcher
    try {
      if (srcWatcher) {
        await srcWatcher.close();
      }
      console.log("[bldr] src watcher closed");
    } catch (error) {
      console.error(`[bldr] error closing src watcher: ${error}`);
    }

    // Kill child processes
    const killPromises: Promise<void>[] = [];

    if (tscWatch && !tscWatch.killed) {
      killPromises.push(
        new Promise<void>((resolve) => {
          tscWatch.on("exit", () => resolve());
          tscWatch.kill();
          // Force kill after 5 seconds
          setTimeout(() => {
            if (!tscWatch.killed) {
              tscWatch.kill("SIGKILL");
            }
            resolve();
          }, 5000);
        }),
      );
      console.log("[bldr] killing tsc watcher...");
    }

    if (aliasWatch && !aliasWatch.killed) {
      killPromises.push(
        new Promise<void>((resolve) => {
          aliasWatch.on("exit", () => resolve());
          aliasWatch.kill();
          // Force kill after 5 seconds
          setTimeout(() => {
            if (!aliasWatch.killed) {
              aliasWatch.kill("SIGKILL");
            }
            resolve();
          }, 5000);
        }),
      );
      console.log("[bldr] killing tsc-alias watcher...");
    }

    // Wait for all child processes to exit
    await Promise.all(killPromises);
    console.log("[bldr] all processes cleaned up");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // If any child exits, shut down.
  tscWatch.on("exit", () => shutdown());
  aliasWatch.on("exit", () => shutdown());
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
