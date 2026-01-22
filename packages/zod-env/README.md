## Introduction

Type-safe environment variable validation using [Zod](https://zod.dev).

## Installation

```bash
npm install @bb-labs/zod-env
```

## Usage

```typescript
import { zEnv } from "@bb-labs/zod-env";
import { z } from "zod";

const env = zEnv(process.env, {
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]),
  DEBUG: z.string().optional(),
});

// Fully typed!
env.DATABASE_URL; // string
env.PORT; // number
env.NODE_ENV; // "development" | "production" | "test"
env.DEBUG; // string | undefined
```

## Error Handling

If validation fails, `zEnv` throws an error with all validation issues:

```
Error: Environment validation failed:
DATABASE_URL: Invalid url
NODE_ENV: Invalid enum value. Expected 'development' | 'production' | 'test', received 'staging'
```

## License

MIT
