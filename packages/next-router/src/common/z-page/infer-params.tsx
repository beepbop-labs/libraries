import type { ZodObjectShape, InferZodObjectShapeOutput } from "../../utils/types";

/** Helper to infer a single param type */
type InferParam<T, K extends string> = K extends keyof T ? (T[K] extends ZodObjectShape ? InferZodObjectShapeOutput<T[K]> : never) : never;

/** Inferred params with Promise wrappers (for async page props) */
type InferZPageParamsPromises<T> = (T extends { routeParams: ZodObjectShape } ? { routeParams: Promise<InferParam<T, "routeParams">> } : {}) &
  (T extends { searchParams: ZodObjectShape } ? { searchParams: Promise<InferParam<T, "searchParams">> } : {});

/** Inferred params (unwrapped) */
type InferZPageParams<T> = (T extends { routeParams: ZodObjectShape } ? { routeParams: InferParam<T, "routeParams"> } : {}) &
  (T extends { searchParams: ZodObjectShape } ? { searchParams: InferParam<T, "searchParams"> } : {});

export type { InferZPageParamsPromises, InferZPageParams };
