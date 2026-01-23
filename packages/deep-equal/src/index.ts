import deepEqual from "fast-deep-equal";
import SuperJSON from "superjson";
import { deepSort } from "@bb-labs/deep-sort";

/**
 * Normalize structures so deep-equal works:
 * - Encode using SuperJSON (handles Dates, BigInts, Maps/Sets via metadata)
 * - Deep-sort objects and arrays so order does not matter
 */
const normalize = (value: unknown): unknown => {
  // First serialize using SuperJSON for consistency / rich types
  const { json } = SuperJSON.serialize(value);

  // Then deep-sort the JSON-safe structure
  return deepSort(json);
};

export const isDeepEqual = (a: unknown, b: unknown): boolean => {
  return deepEqual(normalize(a), normalize(b));
};
