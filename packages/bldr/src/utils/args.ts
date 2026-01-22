import type { Args } from "../core/types.js";

/**
 * Simple CLI argument parser.
 */
export function parseArgs(argv: string[]): Args {
  const args: Args = { watch: false };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "-w" || a === "--watch") {
      args.watch = true;
    } else if (a === "-p" || a === "--project") {
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        args.project = next;
        i++;
      } else {
        throw new Error("The -p/--project flag requires a path to a tsconfig.json file.");
      }
    } else if (a === "-h" || a === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`
bldr - A simple TypeScript build tool with dist synchronization.

Usage:
  bldr [options]

Options:
  -w, --watch    Watch for changes and sync deletions.
  -p, --project  Path to tsconfig.json (defaults to closest tsconfig.json).
  -h, --help     Show this help message.
`);
}
