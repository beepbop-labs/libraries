import type { ChildProcess } from "node:child_process";

export type Args = {
  watch: boolean;
  project?: string; // optional override: -p path/to/tsconfig.json
};

export interface Config {
  tsconfigPath: string;
  configDir: string;
  outDir: string;
  rootDir: string;
}

export interface BuildProcess {
  tsc?: ChildProcess;
  alias?: ChildProcess;
  watcher?: { close: () => Promise<void> };
}
