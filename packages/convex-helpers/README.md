## Introduction

A lightweight utility library for [Convex](https://convex.dev) containing helpers.

## Installation

```bash
npm install @bb-labs/convex-helpers
# or
bun add @bb-labs/convex-helpers
# or
yarn add @bb-labs/convex-helpers
```

## Helpers

### `createTable`

A helper function that provides a declarative way to define Convex tables with schemas and indexes in a single, readable configuration object.

```typescript
import { createTable } from "@bb-labs/convex-helpers";
import { v } from "convex/values";

const UserSchema = {
  email: v.string(),
  name: v.string(),
  role: v.string(),
  createdAt: v.number(),
};

const usersTable = createTable({
  schema: UserSchema,
  indexes: [
    { name: "by_email", fields: ["email"] },
    { name: "by_role", fields: ["role", "createdAt"] },
  ],
});
```

## License

MIT
