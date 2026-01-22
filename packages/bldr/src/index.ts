#!/usr/bin/env bun
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import chokidar from "chokidar";

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
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    p.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

function spawnLongRunning(cmd: string, args: string[], cwd: string) {
  const p = spawn(cmd, args, {
    cwd,
    stdio: "inherit",
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

  console.log(
    [
      `\n[tsbuild] project: ${rel(cwd, tsconfigPath)}`,
      `[tsbuild] rootDir : ${rel(cwd, rootDirAbs)}`,
      `[tsbuild] outDir  : ${rel(cwd, outDirAbs)}`,
      `[tsbuild] mode    : ${args.watch ? "watch" : "build"}\n`,
    ].join("\n"),
  );

  // Clean the output directory first
  console.log(`[tsbuild] cleaning output directory...`);
  await rmIfExists(outDirAbs);

  const tscArgs = ["-p", tsconfigPath];
  const aliasArgs = ["-p", tsconfigPath];

  if (!args.watch) {
    // One-shot build: tsc -> tsc-alias
    try {
      await run("tsc", tscArgs, cwd);
      await run("tsc-alias", aliasArgs, cwd);
    } catch (error) {
      // Clean up partial output on build failure
      console.error(`[tsbuild] build failed, cleaning output directory...`);
      await rmIfExists(outDirAbs);
      throw error;
    }
    return;
  }

  // Watch mode:
  // 1) Do a clean initial pass so dist is correct immediately.
  try {
    await run("tsc", tscArgs, cwd);
    await run("tsc-alias", aliasArgs, cwd);
  } catch (error) {
    console.error(`[tsbuild] initial build failed: ${error}`);
    // Continue in watch mode even if initial build fails
    console.log(`[tsbuild] continuing in watch mode...`);
  }

  // 2) Start watchers
  const tscWatch = spawnLongRunning("tsc", [...tscArgs, "-w"], cwd);
  const aliasWatch = spawnLongRunning("tsc-alias", [...aliasArgs, "-w"], cwd);

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
      console.error(`[tsbuild] error handling file deletion ${absPath}: ${error}`);
    }
  });

  srcWatcher.on("unlinkDir", async (absDir) => {
    try {
      await cleaner.removeOutDirForSourceDir(absDir);
    } catch (error) {
      console.error(`[tsbuild] error handling directory deletion ${absDir}: ${error}`);
    }
  });

  // TypeScript compiler handles additions and changes automatically

  const shutdown = async () => {
    console.log("\n[tsbuild] shutting down...");
    try {
      srcWatcher.close();
      console.log("[tsbuild] src watcher closed");
    } catch (error) {
      console.error(`[tsbuild] error closing src watcher: ${error}`);
    }
    try {
      tscWatch.kill();
      console.log("[tsbuild] tsc watcher killed");
    } catch (error) {
      console.error(`[tsbuild] error killing tsc watcher: ${error}`);
    }
    try {
      aliasWatch.kill();
      console.log("[tsbuild] tsc-alias watcher killed");
    } catch (error) {
      console.error(`[tsbuild] error killing tsc-alias watcher: ${error}`);
    }
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
