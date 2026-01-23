import path from "node:path";
import chokidar from "chokidar";
import { type Args, type BuildProcess } from "./types.js";
import { findClosestTsconfig, readTsConfig, rel, rmIfExists, isTsLike, makeDistCleaner } from "../utils/fs.js";
import { run, spawnLongRunning } from "../utils/process.js";
import { createTerminalUI, type TerminalUI } from "../ui/terminal.js";

export async function build(args: Args) {
  const cwd = process.cwd();
  const tsconfigPath = args.project ? path.resolve(cwd, args.project) : findClosestTsconfig(cwd);

  const cfg = readTsConfig(tsconfigPath);

  if (!cfg.outDir || !cfg.rootDir) {
    throw new Error(
      [
        `❌ tsconfig must specify both "compilerOptions.outDir" and "compilerOptions.rootDir" for dist sync.`,
        `Found: rootDir=${String(cfg.rootDir)} outDir=${String(cfg.outDir)}`,
        `File: ${tsconfigPath}`,
      ].join("\n"),
    );
  }

  const rootDirAbs = path.isAbsolute(cfg.rootDir) ? cfg.rootDir : path.resolve(cfg.configDir, cfg.rootDir);
  const outDirAbs = path.isAbsolute(cfg.outDir) ? cfg.outDir : path.resolve(cfg.configDir, cfg.outDir);

  const state: BuildProcess & { ui?: TerminalUI } = {};

  const shutdown = async (code = 0) => {
    // Prevent multiple shutdown calls
    if ((shutdown as any).inProgress) return;
    (shutdown as any).inProgress = true;

    if (state.ui) {
      state.ui.destroy();
      state.ui = undefined;
    }

    console.log("\n⏳ Shutting down...");

    try {
      if (state.watcher) {
        await state.watcher.close();
      }
      console.log("✅ Src watcher closed");
    } catch (error) {
      console.error(`❌ Error closing src watcher: ${error}`);
    }

    const killProcess = (name: string, p: any) => {
      if (p && !p.killed) {
        console.log(`🔄 Killing ${name}...`);
        p.kill();
        return new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (!p.killed) p.kill("SIGKILL");
            resolve();
          }, 2000);
          p.on("exit", () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      return Promise.resolve();
    };

    await Promise.all([killProcess("tsc", state.tsc), killProcess("tsc-alias", state.alias)]);

    console.log("✅ All processes cleaned up");
    process.exit(code);
  };

  // Register shutdown handlers
  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  if (args.watch) {
    state.ui = createTerminalUI(() => shutdown(0));

    console.log = (...args: any[]) => {
      state.ui?.logToBldr(args.join(" "));
    };

    console.error = (...args: any[]) => {
      state.ui?.logToBldr(`{red-fg}❌ ${args.join(" ")}{/red-fg}`);
    };
  }

  console.log(
    [
      `\n📦 Project  : ${rel(cwd, tsconfigPath)}`,
      `📁 Root Dir : ${rel(cwd, rootDirAbs)}`,
      `📁 Out Dir  : ${rel(cwd, outDirAbs)}`,
      `➡️  Mode     : ${args.watch ? "Watch" : "Build"}\n`,
    ].join("\n"),
  );

  console.log(`📦 Cleaning output directory...`);
  await rmIfExists(outDirAbs);
  console.log(`✅ Output directory cleaned`);

  const tscArgs = ["-p", tsconfigPath, "--pretty"];
  const aliasArgs = ["-p", tsconfigPath];

  if (!args.watch) {
    try {
      console.log(`\n📦 Starting build...`);
      await run("tsc", tscArgs, cwd);
      await run("tsc-alias", aliasArgs, cwd);

      console.log(`✅ Build completed successfully!`);
    } catch (error) {
      console.error(`❌ Build failed, cleaning output directory...`);
      await rmIfExists(outDirAbs);
      throw error;
    }
    return;
  }

  // Watch mode initial pass
  try {
    console.log(`\n📦 Starting initial build...`);
    await run("tsc", tscArgs, cwd);
    await run("tsc-alias", aliasArgs, cwd);
    console.log(`✅ Initial build completed`);
  } catch (error) {
    if (state.ui) {
      state.ui.tscBox.insertBottom(`❌ Initial build failed: ${(error as Error).message}{/red-fg}`);
      state.ui.tscBox.setScrollPerc(100);
      state.ui.screen.render();
    }
  }

  // Start processes
  state.tsc = spawnLongRunning("tsc", [...tscArgs, "-w"], cwd);
  state.alias = spawnLongRunning("tsc-alias", [...aliasArgs, "-w"], cwd);

  const setupOutputPipe = (p: any, box: any) => {
    if (!p) return;
    const handleData = (data: any) => {
      const text = data.toString().trim();
      if (text && state.ui) {
        box.insertBottom(text);
        box.setScrollPerc(100);
        state.ui.screen.render();
      }
    };
    p.stdout?.on("data", handleData);
    p.stderr?.on("data", handleData);
    p.on("error", (error: any) => {
      if (state.ui) {
        box.insertBottom(`❌ ${error}{/red-fg}`);
        box.setScrollPerc(100);
        state.ui.screen.render();
      }
    });
    p.on("exit", (code: number) => {
      if (code !== 0 && code !== null) {
        console.error(`❌ ${p === state.tsc ? "tsc" : "tsc-alias"} exited with code ${code}`);
      }
      // If one of them exits unexpectedly in watch mode, we might want to shut down or restart
      // For now, let's just shut down if it's not a normal exit
      if (code !== 0 && code !== null) shutdown(code);
    });
  };

  if (state.ui) {
    setupOutputPipe(state.tsc, state.ui.tscBox);
    setupOutputPipe(state.alias, state.ui.aliasBox);
  }

  const cleaner = makeDistCleaner(rootDirAbs, outDirAbs);

  const srcWatcher = chokidar.watch(rootDirAbs, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
    atomic: true,
    interval: 100,
    binaryInterval: 300,
  });
  state.watcher = srcWatcher;

  const operationQueue = new Map<string, Promise<void>>();
  const MAX_CONCURRENT_OPERATIONS = 10;

  async function queuedOperation(key: string, operation: () => Promise<void>) {
    const existing = operationQueue.get(key);
    if (existing) await existing;

    while (operationQueue.size >= MAX_CONCURRENT_OPERATIONS) {
      await Promise.race(operationQueue.values());
    }

    const promise = operation().finally(() => operationQueue.delete(key));
    operationQueue.set(key, promise);
    return promise;
  }

  srcWatcher.on("unlink", async (absPath: string) => {
    try {
      await queuedOperation(absPath, async () => {
        if (isTsLike(absPath)) {
          await cleaner.removeEmittedForSource(absPath);
          console.log(`🔄 Sync: removed output for ${path.relative(rootDirAbs, absPath)}`);
        } else {
          const outPath = path.join(outDirAbs, path.relative(rootDirAbs, absPath));
          await rmIfExists(outPath);
          console.log(`🔄 Sync: removed asset ${path.relative(rootDirAbs, absPath)}`);
        }
      });
    } catch (error) {
      console.error(`❌ Error handling file deletion ${absPath}: ${error}`);
    }
  });

  srcWatcher.on("unlinkDir", async (absDir: string) => {
    try {
      await cleaner.removeOutDirForSourceDir(absDir);
      console.log(`🔄 Sync: removed directory ${path.relative(rootDirAbs, absDir)}`);
    } catch (error) {
      console.error(`❌ Error handling directory deletion ${absDir}: ${error}`);
    }
  });
}
