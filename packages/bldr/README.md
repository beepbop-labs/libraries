# @bb-labs/builder

A TypeScript build tool with watch mode and automatic dist synchronization.

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

- `--watch`, `-w`: Watch mode
- `--project`, `-p <path>`: Custom tsconfig.json path
