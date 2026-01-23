## Introduction

A tiny utility that **deeply normalizes** JavaScript values by:

- ✅ Recursively sorting **object keys**
- ✅ Recursively sorting **arrays** using **SuperJSON** for deterministic comparison
- ✅ Preserving non-plain objects (`Date`, `Map`, `Set`, `BigInt`, class instances, etc.)
- ⚡ Perfect for generating cache keys, hashing structured data, or stabilizing query arguments

The goal:
**Identical structures always produce identical normalized output — even when key order or array order differs.**

---

## Installation

```bash
npm install @bigbang-sdk/deep-sort
# or
yarn add @bigbang-sdk/deep-sort
# or
bun add @bigbang-sdk/deep-sort
```

---

## API

### `deepSort(value: unknown): unknown`

Returns a **fully normalized, deeply sorted copy** of any JSON-compatible data structure.

Behavior:

- **Object keys** are sorted at every level
- **Arrays** are deeply normalized, then **sorted** using SuperJSON’s structural encoding
- Non-plain objects (Dates, Maps, Sets, etc.) are **preserved**, and naturally handled by SuperJSON

```ts
import { deepSort } from "@bigbang-sdk/deep-sort";

deepSort([3, 1, 2]);
// → [1, 2, 3]

deepSort([{ b: 2, a: 1 }, { a: 3 }]);
// → [ { a: 1, b: 2 }, { a: 3 } ]

deepSort([
  { id: 2, tags: ["b", "a"] },
  { id: 1, tags: ["c", "a"] },
]);
// → normalized deeply, sorted deterministically
```

---

## Caveats

- Sorting arrays by SuperJSON string is deterministic but may be expensive for very large/nested data.
- Circular references are **not supported** (SuperJSON cannot serialize them).
- This is intended for **cache key normalization**, **equality pre-normalization**, and **stable hashing** — not for mutating live data structuresssss.
