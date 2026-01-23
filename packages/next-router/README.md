## Introduction

Type-safe route and search params for Next.js App Router with Zod validation.

- 🔒 **Type-safe** — Full TypeScript inference from your Zod schemas
- ✅ **Validated** — Params are validated at runtime with Zod
- 🎯 **Flexible** — Use promises or pre-awaited values, your choice
- 🪝 **Hooks included** — First-class support for client components
- 📦 **Zero dependencies** — Only requires Zod
- 🛡️ **Error handling** — Built-in error handling with customizable callbacks

## Installation

```bash
npm install @bb-labs/next-router
# or
yarn add @bb-labs/next-router
# or
bun add @bb-labs/next-router
```

## Server Components

### `zPage`

A unified function for creating page components with type-safe params. Use the `resolve` parameter to control how params are handled.

#### Resolved Params (Default)

When `resolve: true` (or omitted), params are **pre-awaited** with built-in Suspense.

```tsx
import { zPage } from "@bb-labs/next-router";
import { z } from "zod";

export default zPage({
  params: {
    searchParams: {
      email: z.string().email(),
    },
  },
  handler: ({ searchParams }) => {
    // Already awaited — use directly
    return <div>Email: {searchParams.email}</div>;
  },
});
```

**Options for resolved mode:**

- `onError?: (error: z.ZodError) => void` — Custom error handler (defaults to redirecting to "/404")
- `loadingHandler?: React.ReactNode` — Custom Suspense fallback (defaults to `null`)

#### Promise Params

When `resolve: false`, params are passed as **promises** — you control when to await.

```tsx
import { zPage } from "@bb-labs/next-router";
import { resolveZPageParams } from "@bb-labs/next-router/common";
import { z } from "zod";

export default zPage({
  params: {
    routeParams: { id: z.string() },
    searchParams: { page: z.coerce.number().optional() },
  },
  resolve: false,
  handler: async (paramsPromise) => {
    const { routeParams, searchParams } = await resolveZPageParams(paramsPromise);
    return (
      <div>
        Product {routeParams.id}, Page {searchParams.page}
      </div>
    );
  },
});
```

**Note:** `onError` and `loadingHandler` are not available when `resolve: false`.

### `resolveZPageParams`

Helper function to await and validate params from promise-based handlers. Optionally accepts an `onError` callback.

```tsx
import { zPage } from "@bb-labs/next-router";
import { resolveZPageParams } from "@bb-labs/next-router/common";
import { redirect } from "next/navigation";
import { z } from "zod";

export default zPage({
  params: {
    searchParams: {
      email: z.string().email(),
    },
  },
  resolve: false,
  handler: async (paramsPromise) => {
    const { searchParams } = await resolveZPageParams(paramsPromise, {
      onError: (error) => {
        console.error("Validation failed:", error);
        redirect("/custom-error");
      },
    });
    return <div>{searchParams.email}</div>;
  },
});
```

### Flexible Params Configuration

You can provide both, only `routeParams`, or only `searchParams` — but never neither:

```tsx
// ✅ Both
{ params: { routeParams: {...}, searchParams: {...} } }

// ✅ Only routeParams
{ params: { routeParams: {...} } }

// ✅ Only searchParams
{ params: { searchParams: {...} } }

// ❌ Neither — TypeScript error
{ params: {} }
```

---

## Client Components

### `useRouteParams` / `useSearchParams`

Hooks for accessing validated params in client components with `onSuccess` and `onError` callbacks.

```tsx
"use client";

import { useSearchParams } from "@bb-labs/next-router/client";
import { z } from "zod";

const searchParamsSchema = {
  email: z.string().email(),
};

export function MyComponent() {
  const { data, error } = useSearchParams(searchParamsSchema, {
    onSuccess: (data) => {
      console.log("Valid params:", data.email);
    },
    onError: (error) => {
      console.error("Validation failed:", error);
      // Custom error handling (defaults to redirecting to "/404")
    },
  });

  if (error) return <div>Error: {error}</div>;

  return <div>Email: {data.email}</div>;
}
```

### Hook API

```tsx
const { data, error } = useRouteParams(schema, options?);
const { data, error } = useSearchParams(schema, options?);
```

**Options:**

- `onSuccess?: (data: T) => void` — Called when params are successfully validated
- `onError?: (error: z.ZodError) => void` — Called when validation fails (defaults to redirecting to "/404")

**Returns:**

- `data` — The validated params, or `null` if validation failed
- `error` — The error message string, or `null` if validation succeeded

---

## Schema Types

**Important:** URL params are always strings. Use Zod's coercion methods for non-string types:

```tsx
// ✅ Correct — use coercion for non-string types
{
  id: z.string(),              // strings work directly
  page: z.coerce.number(),     // coerce string → number
  active: z.coerce.boolean(),  // coerce string → boolean
  count: z.coerce.number().optional(),  // optional coerced number
  tags: z.array(z.string()),   // array of strings (for ?tags=a&tags=b)
}

// ❌ Wrong — will fail because raw input is always a string
{
  page: z.number(),    // Error: expected number, received string
  active: z.boolean(), // Error: expected boolean, received string
}
```

You can also use transforms for custom parsing:

```tsx
{
  date: z.string().transform((s) => new Date(s)),
  ids: z.string().transform((s) => s.split(",")),
}
```

### JSON-Encoded Objects

For complex objects, encode them as JSON in the URL (URL-escaped). Use `.transform()` with `JSON.parse()` and `.pipe()` to validate:

```tsx
// URL: ?filter={"category":"books","price":{"min":10,"max":50},"inStock":true}
// (URL-encoded: ?filter=%7B%22category%22%3A%22books%22...%7D)

{
  filter: z
    .string()
    .transform((s) => JSON.parse(s))
    .pipe(
      z.object({
        category: z.string(),
        price: z.object({ min: z.number(), max: z.number() }),
        tags: z.array(z.string()).optional(),
        inStock: z.boolean(),
      })
    ),
}
```

**How it works:**

1. The raw URL param is a JSON string: `'{"category":"books",...}'`
2. `.transform((s) => JSON.parse(s))` parses it into a JS object
3. `.pipe(z.object({...}))` validates the parsed object's structure

**Example usage:**

```tsx
export default zPage({
  params: {
    searchParams: {
      filter: z
        .string()
        .transform((s) => JSON.parse(s))
        .pipe(
          z.object({
            category: z.string(),
            price: z.object({ min: z.number(), max: z.number() }),
          })
        ),
    },
  },
  handler: ({ searchParams }) => {
    // searchParams.filter is fully typed!
    return (
      <div>
        Category: {searchParams.filter.category}
        Price: ${searchParams.filter.price.min} - ${searchParams.filter.price.max}
      </div>
    );
  },
});
```

**Client-side encoding:**

```tsx
const filter = { category: "books", price: { min: 10, max: 50 } };
const url = `/products?filter=${encodeURIComponent(JSON.stringify(filter))}`;
```

---

## Error Handling

By default, validation errors redirect to "/404":

- **Server components**: `zPage` and `resolveZPageParams` with `resolve: true` redirects on validation failure
- **Client components**: `useRouteParams` and `useSearchParams` redirect on validation failure

You can customize error handling:

- **Server**: Provide an `onError` callback to `zPage` (only available when `resolve: true`)
- **Client**: Provide an `onError` callback to the hooks

---

## Type Utilities

The package exports type utilities from `@bb-labs/next-router/common` to help with type inference in advanced scenarios.

### `InferZPageParams` / `InferZPageParamsPromises`

Infer the resolved param types from a `zPage` configuration. Useful when you need to pass params to child components.

```tsx
import { zPage } from "@bb-labs/next-router";
import type { InferZPageParams, InferZPageParamsPromises } from "@bb-labs/next-router/common";
import { z } from "zod";

const pageParams = {
  routeParams: { id: z.string() },
  searchParams: { page: z.coerce.number() },
};

// Infer the resolved param types
type PageParams = InferZPageParams<typeof pageParams>;
// { routeParams: { id: string }, searchParams: { page: number } }

// For promise-wrapped params (when resolve: false)
type PageParamsPromises = InferZPageParamsPromises<typeof pageParams>;
// { routeParams: Promise<{ id: string }>, searchParams: Promise<{ page: number }> }

// Use in child components
function ProductDetails({ routeParams, searchParams }: PageParams) {
  return (
    <div>
      Product {routeParams.id}, Page {searchParams.page}
    </div>
  );
}

export default zPage({
  params: pageParams,
  handler: (params) => <ProductDetails {...params} />,
});
```

### Flexible Schema Input

Both server and client APIs accept schemas in two formats:

```tsx
// Format 1: z.object() directly
z.object({ id: z.string() });

// Format 2: Plain object shape (automatically wrapped) — recommended
{
  id: z.string();
}
```

Both formats are fully type-safe and produce the same runtime behavior.

## License

MIT
