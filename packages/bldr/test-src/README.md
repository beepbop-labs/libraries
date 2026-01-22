# Test Directory

This directory contains sample TypeScript files for testing the `bldr` build tool.

## Files

- `index.ts` - Main entry point with examples
- `utils.ts` - Utility functions and types
- `tsconfig.json` - TypeScript configuration (outputs to `../test-dist/`)

## Usage

From the package root, run:

```bash
bun run test:dev
```

This will start the build tool in watch mode with the split-terminal UI, building files from `test-src/` to `test-dist/`.

Try editing the files to see real-time compilation and the UI updates!
