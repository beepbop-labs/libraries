# bldr

A TypeScript build tool with watch mode, automatic dist synchronization, and split-terminal UI.

## Installation

```bash
bun add -d @bb-labs/builder typescript tsc-alias
```

## Usage

```json
{
  "scripts": {
    "build": "bldr",
    "dev": "bldr --watch"
  }
}
```

## Options

- `--watch`, `-w`: Watch mode with split-terminal UI showing tsc, tsc-alias, and bldr outputs side by side
- `--project`, `-p <path>`: Custom tsconfig.json path

## Testing

Run `bun run test:dev` to test the build tool with the included test files in `test-src/`. This will:

- Build files from `test-src/` to `test-dist/`
- Show the split-terminal UI with real-time updates
- Watch for changes and rebuild automatically

Add or modify files in `test-src/` to see the build tool in action!

## Features

- **Split Terminal UI**: In watch mode, displays three panels side by side showing output from TypeScript compiler, tsc-alias, and bldr itself
- **Clean Builds**: Always cleans output directory before building
- **Path Alias Support**: Integrates with tsc-alias for path mapping
- **Process Management**: Properly handles child process cleanup on exit
