import path from "node:path";
import fs from "node:fs";
import ts from "typescript";
import type { Config } from "../core/types.js";

/**
 * Finds the closest tsconfig.json by walking up the directory tree.
 */
export function findClosestTsconfig(startDir: string): string {
  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, "tsconfig.json");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not find tsconfig.json starting from ${startDir}. Pass -p <path-to-tsconfig>.`);
}

/**
 * Reads and parses a tsconfig.json file, resolving "extends".
 */
export function readTsConfig(tsconfigPath: string): Config {
  const absolutePath = path.resolve(tsconfigPath);
  const configFile = ts.readConfigFile(absolutePath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(formatTsDiagnostics([configFile.error]));
  }

  const configDir = path.dirname(absolutePath);

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, configDir, undefined, absolutePath);

  if (parsed.errors?.length) {
    throw new Error(formatTsDiagnostics(parsed.errors));
  }

  const outDir = parsed.options.outDir;
  const rootDir = parsed.options.rootDir;

  if (!outDir || !rootDir) {
    throw new Error(
      `tsconfig at ${absolutePath} must specify both "compilerOptions.outDir" and "compilerOptions.rootDir".`,
    );
  }

  return {
    tsconfigPath: absolutePath,
    configDir,
    outDir: path.isAbsolute(outDir) ? outDir : path.resolve(configDir, outDir),
    rootDir: path.isAbsolute(rootDir) ? rootDir : path.resolve(configDir, rootDir),
  };
}

function formatTsDiagnostics(diagnostics: ts.Diagnostic[]): string {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
  });
}

/**
 * Returns a relative path, ensuring it starts with ./ or ../
 */
export function rel(from: string, to: string): string {
  const r = path.relative(from, to);
  return r.startsWith(".") ? r : `./${r}`;
}

/**
 * Safely removes a file or directory if it exists.
 */
export async function rmIfExists(p: string): Promise<void> {
  try {
    await fs.promises.rm(p, { force: true, recursive: true });
  } catch (error) {
    // Ignore if not found, otherwise rethrow or log
    if ((error as any).code !== "ENOENT") {
      throw error;
    }
  }
}

/**
 * Checks if a file is a TypeScript-like source file.
 */
export function isTsLike(filePath: string): boolean {
  return /\.(ts|tsx|mts|cts)$/i.test(filePath);
}

/**
 * Strips TypeScript extensions from a path.
 */
export function stripTsExt(p: string): string {
  return p.replace(/\.(ts|tsx|mts|cts)$/i, "");
}

/**
 * Creates a cleaner utility for synchronizing deletions from src to dist.
 */
export function makeDistCleaner(rootDirAbs: string, outDirAbs: string) {
  const EMITTED_SUFFIXES = [".js", ".js.map", ".d.ts", ".d.ts.map", ".mjs", ".mjs.map", ".cjs", ".cjs.map"];

  function toOutPath(srcPathAbs: string): string {
    const relPath = path.relative(rootDirAbs, srcPathAbs);
    return path.join(outDirAbs, relPath);
  }

  async function removeEmittedForSource(srcFileAbs: string): Promise<void> {
    const outLike = toOutPath(srcFileAbs);
    const base = stripTsExt(outLike);
    await Promise.all(EMITTED_SUFFIXES.map((s) => rmIfExists(base + s)));
  }

  async function removeOutDirForSourceDir(srcDirAbs: string): Promise<void> {
    const outDir = toOutPath(srcDirAbs);
    await rmIfExists(outDir);
  }

  return { removeEmittedForSource, removeOutDirForSourceDir };
}
