import { z, type ZodRawShape } from "zod";

/** A z.object(...) schema */
export type ZodObject<T extends ZodRawShape = ZodRawShape> = z.ZodObject<T>;

/** Plain object shape or z.object() - accepts either format */
export type ZodObjectShape = ZodRawShape | ZodObject;

/** Infer output type from either raw shape or ZodObject */
export type InferZodObjectShapeOutput<T extends ZodObjectShape> = T extends ZodObject<infer S> ? z.output<z.ZodObject<S>> : T extends ZodRawShape ? z.output<z.ZodObject<T>> : never;

export type T_DataError<T> = { data: T; error: null } | { data: null; error: string };
