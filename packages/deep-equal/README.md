## Introduction

A tiny utility for **deep structural equality** that is:

- ✅ Aware of rich JavaScript types via **[SuperJSON](https://github.com/blitz-js/superjson)**
- ✅ Uses **[fast-deep-equal](https://github.com/epoberezkin/fast-deep-equal)** under the hood
- ✅ Treats **arrays as equal even when items are in a different order**
- ✅ Stable & deterministic (objects and arrays are normalized before comparison)

---

## Installation

```bash
npm install @bigbang-sdk/local-db
# or
yarn add @bigbang-sdk/local-db
# or
bun add @bigbang-sdk/local-db
```

---

## Why?

Plain deep equality libraries usually assume:

- Arrays must be in the **same order**
- Only handle plain JSON-ish structures well

This helper does two important things:

1. Runs values through **SuperJSON** so things like `Date`, `BigInt`, `Map`, `Set`, etc. end up in a consistent, JSON-safe shape.
2. **Recursively normalizes** that shape:
   - Arrays are **sorted** by their JSON representation → order no longer matters.
   - Object keys are **sorted** so key order never affects equality.

Then it compares the normalized values with `fast-deep-equal`.

---

## API

### `isDeepEqual(a: unknown, b: unknown): boolean`

Deep equality check with:

- SuperJSON-aware serialization
- Order-insensitive arrays
- Stable object key ordering

```ts
import { isDeepEqual } from "@bigbang-sdk/local-db";

isDeepEqual([1, 2, 3], [3, 2, 1]); // true

isDeepEqual([{ x: 1, y: 2 }, { a: 5 }], [{ a: 5 }, { y: 2, x: 1 }]); // true

isDeepEqual(new Date("2020-01-01"), new Date("2020-01-01")); // true

isDeepEqual(new Set([3, 2, 1]), new Set([1, 2, 3])); // true (via SuperJSON serialization)
```
