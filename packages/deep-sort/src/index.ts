import { sort as sortObjectKeys } from "@tamtamchik/json-deep-sort";
import superjson from "superjson";

export const deepSort = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    // Normalize each item deeply
    const normalizedItems = value.map(deepSort);

    // Deterministic array sorting using SuperJSON
    return normalizedItems.sort((a, b) => {
      const sa = superjson.stringify(a);
      const sb = superjson.stringify(b);
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
  }

  if (value !== null && typeof value === "object") {
    // Sort object keys recursively
    return sortObjectKeys(value as any);
  }

  return value; // primitives unchanged
};
