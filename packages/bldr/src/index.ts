#!/usr/bin/env bun
import { parseArgs } from "./utils/args.js";
import { build } from "./core/builder.js";
import { checkDependencies } from "./utils/process.js";

async function main() {
  console.log("------------- bldr -------------");
  console.log("📦 Initializing...");
  // Check if required dependencies are installed
  const depsOk = await checkDependencies();
  if (!depsOk) {
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  await build(args);
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
