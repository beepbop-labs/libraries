#!/usr/bin/env bun
import { parseArgs } from "./utils/args.js";
import { build } from "./core/builder.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await build(args);
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
